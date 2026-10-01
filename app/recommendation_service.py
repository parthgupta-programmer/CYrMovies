"""
CYrMovie Recommendation Service
================================
Hybrid engine: content TF-IDF + ALS collaborative filtering.
FLOW A - search(): pure title match, no recommendation logic
FLOW B - similar_movies(): content-based (TF-IDF genres/overview/tags), franchise filtered, diversified
FLOW C - recommend(): personalized CF + content hybrid for logged-in users
FLOW D - cold_start(): content profile from onboarding genres/movies
"""
from pathlib import Path
from typing import Any
import json
import os
import logging
import re
import urllib.request
import urllib.error
import urllib.parse

import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.preprocessing import normalize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.recommendation.collaborative_filtering import Mappings

logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
TMDB_API_BASE = "https://api.themoviedb.org/3"

DEFAULT_CONFIG = {
    "hybrid_cf_weight": 0.70,
    "hybrid_content_weight": 0.30,
    "franchise_exclude": True,
    "franchise_penalty": 0.0,
    "diversity_lambda": 0.15,
    "default_n": 32,
}


def _fetch_tmdb_poster(tmdb_id, title=""):
    if not TMDB_API_KEY:
        return None
    try:
        if tmdb_id and str(tmdb_id).strip() not in ("", "nan", "None"):
            url = f"{TMDB_API_BASE}/movie/{int(float(tmdb_id))}?api_key={TMDB_API_KEY}"
            with urllib.request.urlopen(url, timeout=4) as resp:
                data = json.loads(resp.read())
            poster_path = data.get("poster_path")
            if poster_path:
                return f"{TMDB_IMAGE_BASE}{poster_path}"
        clean_title = re.sub(r"\s*\(\d{4}\)$", "", str(title).strip()).strip()
        if clean_title:
            encoded = urllib.parse.quote(clean_title)
            url = f"{TMDB_API_BASE}/search/movie?api_key={TMDB_API_KEY}&query={encoded}&page=1"
            with urllib.request.urlopen(url, timeout=4) as resp:
                data = json.loads(resp.read())
            results = data.get("results", [])
            if results and results[0].get("poster_path"):
                return f"{TMDB_IMAGE_BASE}{results[0]['poster_path']}"
    except Exception as exc:
        logger.debug("TMDB poster fetch failed: %s", exc)
    return None


def _normalize_franchise_key(title):
    t = re.sub(r"\s*\(\d{4}\)$", "", str(title)).strip()
    t = re.sub(r"^(the|a|an)\s+", "", t, flags=re.IGNORECASE).strip()
    t = re.split(r"\s*[:\-\u2013\u2014]\s*", t)[0].strip()
    t = re.sub(r"\s*(part|chapter|vol|volume|episode|ep)\.?\s*\d+$", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+(II|III|IV|VI|VII|VIII|IX|XI|XII)$", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s+\d+$", "", t).strip()
    return t.lower()


def _same_franchise(seed_title, candidate_title):
    sk = _normalize_franchise_key(seed_title)
    ck = _normalize_franchise_key(candidate_title)
    if sk == ck:
        return True
    if len(sk) >= 5 and (sk in ck or ck in sk):
        return True
    return False


def _build_content_text(row):
    parts = []
    genres = str(row.get("genres", "") or "").replace("|", " ")
    if genres.strip():
        parts.extend([genres] * 4)
    overview = str(row.get("overview", "") or "")
    if overview.strip():
        parts.extend([overview] * 3)
    tags = str(row.get("tags", "") or "")
    if tags.strip():
        parts.extend([tags] * 2)
    for field in ("cast", "director", "keywords"):
        val = str(row.get(field, "") or "")
        if val.strip():
            parts.append(val)
    clean_title = re.sub(r"\s*\(\d{4}\)$", "", str(row.get("title", "") or "")).strip()
    if clean_title:
        parts.append(clean_title)
    return " ".join(parts)


def _mmr_diversify(candidates, tfidf_matrix, movie_to_idx, n, lambda_=0.15):
    if tfidf_matrix is None or movie_to_idx is None or lambda_ <= 0.0 or len(candidates) == 0:
        return candidates.head(n)
    cands = candidates.reset_index(drop=True)
    scores = cands["score"].to_numpy(dtype=np.float64)
    selected_indices = []
    selected_vecs = []
    remaining = list(range(len(cands)))
    for _ in range(min(n, len(cands))):
        if not remaining:
            break
        best_idx = None
        best_score = -np.inf
        for r in remaining:
            rel = scores[r]
            if not selected_vecs:
                mmr = rel
            else:
                mid = int(cands.loc[r, "movieId"])
                tidx = movie_to_idx.get(mid)
                if tidx is None:
                    mmr = rel
                else:
                    vec = tfidf_matrix[tidx]
                    sel_mat = sp.vstack(selected_vecs)
                    max_sim = float(cosine_similarity(vec, sel_mat).max())
                    mmr = (1 - lambda_) * rel - lambda_ * max_sim
            if mmr > best_score:
                best_score = mmr
                best_idx = r
        if best_idx is None:
            break
        selected_indices.append(best_idx)
        mid = int(cands.loc[best_idx, "movieId"])
        if mid in movie_to_idx:
            selected_vecs.append(tfidf_matrix[movie_to_idx[mid]])
        remaining.remove(best_idx)
    return cands.loc[selected_indices].reset_index(drop=True)


class RecommendationService:
    def __init__(self, model_dir):
        model_dir = Path(model_dir)
        self.model_dir = model_dir
        self.ready = False
        self.has_collaborative_model = False
        self.error = None
        self.movies = pd.DataFrame(columns=["movieId", "title", "genres"])
        self.mappings = None
        self._poster_cache = {}
        self._tfidf_vectorizer = None
        self._tfidf_matrix = None
        self._content_movie_to_idx = {}
        self._content_movie_ids = []

        self.cfg = dict(DEFAULT_CONFIG)
        cfg_path = model_dir / "recommendation_config.json"
        if cfg_path.exists():
            try:
                with open(cfg_path, encoding="utf-8-sig") as f:
                    self.cfg.update(json.load(f))
            except Exception as exc:
                logger.warning("Could not load recommendation_config.json: %s", exc)

        # Load movie catalog
        try:
            parquet_path = model_dir / "movies.parquet"
            if parquet_path.exists():
                self.movies = pd.read_parquet(parquet_path)
                if "tmdbId" not in self.movies.columns:
                    self._merge_tmdb_links()
                    self._save_movies_parquet(parquet_path)
            else:
                csv_path = Path("data/ml-32m/movies.csv")
                if csv_path.exists():
                    self.movies = pd.read_csv(
                        csv_path,
                        dtype={"movieId": "int32", "title": "string", "genres": "string"},
                    )
                    self._merge_tmdb_links()
                    try:
                        model_dir.mkdir(parents=True, exist_ok=True)
                        self._save_movies_parquet(parquet_path)
                    except Exception:
                        pass
        except Exception as exc:
            self.error = f"Error loading movie catalog: {exc}"

        # Load ALS collaborative filtering model
        try:
            self.model = joblib.load(model_dir / "als_model.joblib")
            self.user_items = sp.load_npz(model_dir / "user_items.npz")
            with open(model_dir / "user_to_idx.json", encoding="utf-8") as f:
                user_to_idx = {int(k): int(v) for k, v in json.load(f).items()}
            with open(model_dir / "movie_to_idx.json", encoding="utf-8") as f:
                movie_to_idx = {int(k): int(v) for k, v in json.load(f).items()}
            self.mappings = Mappings(
                user_to_idx=user_to_idx,
                movie_to_idx=movie_to_idx,
                idx_to_user={v: k for k, v in user_to_idx.items()},
                idx_to_movie={v: k for k, v in movie_to_idx.items()},
            )
            self.item_factors_normalized = normalize(
                self.model.item_factors.astype(np.float32), norm="l2", axis=1
            )
            self.has_collaborative_model = True
        except Exception as exc:
            if not self.error:
                self.error = f"Collaborative model not loaded: {exc}"

        # Build content TF-IDF index
        self._build_content_index()

        if not self.movies.empty:
            self.ready = True

    def _merge_tmdb_links(self):
        links_path = Path("data/ml-32m/links.csv")
        if links_path.exists():
            try:
                links = pd.read_csv(links_path, dtype={"movieId": "int32"}, usecols=["movieId", "tmdbId"])
                self.movies = self.movies.merge(links, on="movieId", how="left")
            except Exception as exc:
                logger.warning("Could not merge links.csv: %s", exc)

    def _save_movies_parquet(self, path):
        self.movies.to_parquet(path, index=False)

    def _get_poster(self, movie_id, tmdb_id, title):
        movie_id = int(movie_id)
        if movie_id in self._poster_cache:
            return self._poster_cache[movie_id]
        poster = _fetch_tmdb_poster(tmdb_id, title)
        self._poster_cache[movie_id] = poster
        return poster

    def _attach_posters(self, records):
        for r in records:
            mid = r.get("movieId")
            if mid is None:
                r["poster"] = None
                continue
            r["poster"] = self._get_poster(mid, r.get("tmdbId"), r.get("title", ""))
        return records

    def _build_content_index(self):
        if self.movies.empty:
            return
        tfidf_path = self.model_dir / "movie_tfidf.npz"
        vec_path = self.model_dir / "tfidf_vectorizer.joblib"
        idx_path = self.model_dir / "content_movie_ids.json"
        if tfidf_path.exists() and vec_path.exists() and idx_path.exists():
            try:
                self._tfidf_vectorizer = joblib.load(vec_path)
                self._tfidf_matrix = sp.load_npz(tfidf_path)
                with open(idx_path, encoding="utf-8") as f:
                    self._content_movie_ids = [int(x) for x in json.load(f)]
                self._content_movie_to_idx = {mid: i for i, mid in enumerate(self._content_movie_ids)}
                logger.info("Content TF-IDF index loaded (%d movies).", len(self._content_movie_ids))
                return
            except Exception as exc:
                logger.warning("Could not load cached TF-IDF index: %s. Rebuilding.", exc)
        try:
            logger.info("Building content TF-IDF index for %d movies...", len(self.movies))
            content_texts = self.movies.apply(_build_content_text, axis=1)
            vectorizer = TfidfVectorizer(
                stop_words="english", max_features=80_000,
                min_df=1, ngram_range=(1, 2), sublinear_tf=True,
            )
            matrix = vectorizer.fit_transform(content_texts)
            movie_ids = self.movies["movieId"].tolist()
            try:
                self.model_dir.mkdir(parents=True, exist_ok=True)
                joblib.dump(vectorizer, vec_path, compress=3)
                sp.save_npz(str(tfidf_path), matrix)
                with open(idx_path, "w", encoding="utf-8") as f:
                    json.dump([int(x) for x in movie_ids], f)
                logger.info("Content TF-IDF index saved.")
            except Exception as exc:
                logger.warning("Could not save TF-IDF index: %s", exc)
            self._tfidf_vectorizer = vectorizer
            self._tfidf_matrix = matrix
            self._content_movie_ids = [int(x) for x in movie_ids]
            self._content_movie_to_idx = {mid: i for i, mid in enumerate(self._content_movie_ids)}
        except Exception as exc:
            logger.error("Failed to build content TF-IDF index: %s", exc)

    @staticmethod
    def _minmax(values):
        values = np.asarray(values, dtype=np.float32)
        if len(values) == 0:
            return values
        lo, hi = float(values.min()), float(values.max())
        if hi - lo < 1e-8:
            return np.ones_like(values)
        return (values - lo) / (hi - lo)

    def _popular(self, n):
        popularity_path = self.model_dir / "popularity.parquet"
        if popularity_path.exists():
            popular = pd.read_parquet(popularity_path).head(n).copy()
            popular["score"] = popular.get("popularity_score", 0.0)
            cols = [c for c in ["movieId", "title", "genres", "tmdbId", "score"] if c in popular.columns]
            return popular[cols]
        cols = [c for c in ["movieId", "title", "genres", "tmdbId"] if c in self.movies.columns]
        return self.movies.head(n)[cols].copy().assign(score=0.0)

    # FLOW A: pure title search
    def search(self, q, limit=20):
        q = q.strip()
        if not q:
            return []
        mask = self.movies["title"].str.contains(q, case=False, na=False, regex=False)
        cols = [c for c in ["movieId", "title", "genres", "tmdbId"] if c in self.movies.columns]
        records = self.movies.loc[mask, cols].head(limit).to_dict(orient="records")
        return self._attach_posters(records)

    def movie(self, movie_id):
        result = self.movies[self.movies["movieId"] == movie_id]
        if result.empty:
            return None
        cols = [c for c in ["movieId", "title", "genres", "tmdbId"] if c in self.movies.columns]
        record = result.iloc[0][cols].to_dict()
        self._attach_posters([record])
        return record

    # FLOW B: movie-to-movie content-based recommendation
    def similar_movies(self, movie_id, n=32):
        if not self.ready:
            raise RuntimeError(self.error or "Service not ready")
        seed_row = self.movies[self.movies["movieId"] == movie_id]
        if seed_row.empty:
            raise KeyError(movie_id)
        seed = seed_row.iloc[0]
        seed_title = str(seed.get("title", ""))
        seed_genres = set(str(seed.get("genres", "")).split("|"))

        if self._tfidf_matrix is not None and movie_id in self._content_movie_to_idx:
            seed_idx = self._content_movie_to_idx[movie_id]
            seed_vec = self._tfidf_matrix[seed_idx]
            sims = cosine_similarity(seed_vec, self._tfidf_matrix).ravel()
            sims[seed_idx] = -np.inf
            fetch_n = min(n * 6, len(sims) - 1)
            top_indices = np.argpartition(-sims, fetch_n)[:fetch_n]
            top_indices = top_indices[np.argsort(-sims[top_indices])]
            cand_ids = [self._content_movie_ids[i] for i in top_indices]
            cand_scores = sims[top_indices]
            cand_df = pd.DataFrame({"movieId": cand_ids, "content_score": cand_scores.astype(float)})
            cand_df = cand_df.merge(self.movies, on="movieId", how="left")
        elif self.has_collaborative_model and self.mappings and movie_id in self.mappings.movie_to_idx:
            idx = self.mappings.movie_to_idx[movie_id]
            sims = self.item_factors_normalized @ self.item_factors_normalized[idx]
            sims[idx] = -np.inf
            fetch_n = min(n * 6, len(sims) - 1)
            top = np.argpartition(-sims, fetch_n)[:fetch_n]
            top = top[np.argsort(-sims[top])]
            cand_df = pd.DataFrame({
                "movieId": [self.mappings.idx_to_movie[int(i)] for i in top],
                "content_score": sims[top].astype(float),
            })
            cand_df = cand_df.merge(self.movies, on="movieId", how="left")
        else:
            candidates = self.movies[self.movies["movieId"] != movie_id].copy()
            candidates["content_score"] = candidates["genres"].apply(
                lambda g: len(set(str(g).split("|")) & seed_genres)
            ).astype(float)
            cand_df = candidates.sort_values("content_score", ascending=False)

        # Franchise filter
        if self.cfg.get("franchise_exclude", True):
            mask_fran = cand_df["title"].apply(lambda t: _same_franchise(seed_title, str(t)))
            cand_df = cand_df[~mask_fran].copy()
        else:
            penalty = float(self.cfg.get("franchise_penalty", 0.0))
            cand_df.loc[
                cand_df["title"].apply(lambda t: _same_franchise(seed_title, str(t))),
                "content_score"
            ] *= penalty

        cand_df = cand_df.reset_index(drop=True)
        if len(cand_df) == 0:
            return []

        cand_df["score"] = self._minmax(cand_df["content_score"].to_numpy())

        def _explain(row):
            cand_genres = set(str(row.get("genres", "")).split("|"))
            shared = seed_genres & cand_genres
            if shared:
                return f"Similar to {seed_title} — shared {', '.join(sorted(shared))} themes."
            return f"Thematically related to {seed_title}."

        cand_df["explanation"] = cand_df.apply(_explain, axis=1)
        cand_df["recommendation_type"] = "content_based"

        lambda_ = float(self.cfg.get("diversity_lambda", 0.15))
        cand_df = _mmr_diversify(cand_df, self._tfidf_matrix, self._content_movie_to_idx, n * 2, lambda_)

        result = cand_df.head(n).copy()
        keep = [c for c in ["movieId", "title", "genres", "tmdbId", "score", "explanation", "recommendation_type"] if c in result.columns]
        records = result[keep].to_dict(orient="records")
        return self._attach_posters(records)

    # FLOW C: personalized CF + content hybrid
    def recommend(self, user_id, n=32):
        if not self.ready:
            raise RuntimeError(self.error or "Model not ready")
        if not self.has_collaborative_model or self.mappings is None or user_id not in self.mappings.user_to_idx:
            popular = self._popular(n)
            popular["explanation"] = "Catalog highlight — build your profile for personalized picks."
            popular["recommendation_type"] = "cold_start"
            records = popular.to_dict(orient="records")
            return self._attach_posters(records)

        user_idx = self.mappings.user_to_idx[user_id]
        cf_weight = float(self.cfg.get("hybrid_cf_weight", 0.70))
        content_weight = float(self.cfg.get("hybrid_content_weight", 0.30))
        fetch_n = min(n * 4, self.item_factors_normalized.shape[0])

        item_idx, cf_scores = self.model.recommend(
            user_idx, self.user_items[user_idx], N=fetch_n, filter_already_liked_items=True,
        )
        result = pd.DataFrame({"movie_idx": item_idx, "cf_score": cf_scores})
        result["movieId"] = result["movie_idx"].map(self.mappings.idx_to_movie)
        result = result.merge(self.movies, on="movieId", how="left")

        user_content_profile = None
        liked_movie_ids = []
        if self._tfidf_matrix is not None:
            try:
                user_vec = self.user_items[user_idx]
                liked_indices = user_vec.indices.tolist()
                liked_movie_ids = [self.mappings.idx_to_movie[i] for i in liked_indices if i in self.mappings.idx_to_movie]
                content_idxs = [self._content_movie_to_idx[mid] for mid in liked_movie_ids if mid in self._content_movie_to_idx]
                if content_idxs:
                    rating_vals = user_vec.data if len(user_vec.data) == len(liked_indices) else np.ones(len(content_idxs))
                    used_ratings = rating_vals[:len(content_idxs)]
                    profile_mat = self._tfidf_matrix[content_idxs].multiply(used_ratings[:, None]).sum(axis=0)
                    user_content_profile = normalize(sp.csr_matrix(profile_mat), norm="l2")
            except Exception as exc:
                logger.debug("User content profile error: %s", exc)

        if user_content_profile is not None:
            cand_content_idxs = [self._content_movie_to_idx.get(int(mid) if pd.notna(mid) else -1, -1) for mid in result["movieId"]]
            content_scores = np.zeros(len(result), dtype=np.float32)
            valid_mask = np.array(cand_content_idxs) >= 0
            if valid_mask.any():
                valid_tfidf = self._tfidf_matrix[[i for i in cand_content_idxs if i >= 0]]
                cs = cosine_similarity(valid_tfidf, user_content_profile).ravel()
                content_scores[valid_mask] = cs
        else:
            content_scores = np.zeros(len(result), dtype=np.float32)

        cf_norm = self._minmax(result["cf_score"].to_numpy())
        cont_norm = self._minmax(content_scores)
        result["score"] = cf_weight * cf_norm + content_weight * cont_norm

        liked_cf_idxs = [self.mappings.movie_to_idx[mid] for mid in liked_movie_ids if mid in self.mappings.movie_to_idx] if liked_movie_ids else []
        explanations = []
        for _, row in result.iterrows():
            mid = int(row["movieId"]) if pd.notna(row.get("movieId")) else -1
            reason = "Personalized recommendation based on your rating history."
            if liked_cf_idxs and mid in self.mappings.movie_to_idx:
                target_cf_idx = self.mappings.movie_to_idx[mid]
                sims = self.item_factors_normalized[liked_cf_idxs] @ self.item_factors_normalized[target_cf_idx]
                best_src = liked_cf_idxs[int(np.argmax(sims))]
                src_mid = self.mappings.idx_to_movie.get(best_src)
                if src_mid:
                    src_row = self.movies[self.movies["movieId"] == src_mid]
                    if not src_row.empty:
                        reason = f"Users who enjoyed {src_row.iloc[0]['title']} also love this."
            explanations.append(reason)

        result["explanation"] = explanations
        result["recommendation_type"] = "personalized"
        result = result.sort_values("score", ascending=False).reset_index(drop=True)

        lambda_ = float(self.cfg.get("diversity_lambda", 0.15))
        result = _mmr_diversify(result, self._tfidf_matrix, self._content_movie_to_idx, n * 2, lambda_)
        result = result.head(n)

        keep = [c for c in ["movieId", "title", "genres", "tmdbId", "score", "explanation", "recommendation_type"] if c in result.columns]
        records = result[keep].to_dict(orient="records")
        return self._attach_posters(records)

    # FLOW D: cold start from onboarding genres + movies
    def cold_start(self, genres, seed_movie_ids, n=32):
        if not self.ready:
            raise RuntimeError(self.error or "Service not ready")
        if self._tfidf_matrix is None:
            candidates = self.movies[~self.movies["movieId"].isin(seed_movie_ids)].copy()
            if genres:
                genre_set = set(genres)
                candidates["score"] = candidates["genres"].apply(
                    lambda g: len(set(str(g).split("|")) & genre_set)
                ).astype(float)
            else:
                candidates["score"] = 0.0
            candidates = candidates.sort_values("score", ascending=False).head(n)
            genre_str = ", ".join(genres[:3]) if genres else "your preferences"
            candidates["explanation"] = f"Matches your {genre_str} preferences."
            candidates["recommendation_type"] = "cold_start"
            cols = [c for c in ["movieId", "title", "genres", "tmdbId", "score", "explanation", "recommendation_type"] if c in candidates.columns]
            return self._attach_posters(candidates[cols].to_dict(orient="records"))

        seed_vecs = []
        for mid in seed_movie_ids:
            if mid in self._content_movie_to_idx:
                seed_vecs.append(self._tfidf_matrix[self._content_movie_to_idx[mid]])
        if genres and self._tfidf_vectorizer is not None:
            try:
                genre_vec = self._tfidf_vectorizer.transform([" ".join(genres * 4)])
                seed_vecs.append(genre_vec)
            except Exception:
                pass

        if not seed_vecs:
            popular = self._popular(n)
            popular["explanation"] = "Trending now — pick some favorites for personal recs."
            popular["recommendation_type"] = "cold_start"
            return self._attach_posters(popular.to_dict(orient="records"))

        profile = normalize(sp.csr_matrix(sp.vstack(seed_vecs).mean(axis=0)), norm="l2")
        sims = cosine_similarity(profile, self._tfidf_matrix).ravel()
        for mid in seed_movie_ids:
            if mid in self._content_movie_to_idx:
                sims[self._content_movie_to_idx[mid]] = -np.inf

        fetch_n = min(n * 5, len(sims))
        top_indices = np.argpartition(-sims, fetch_n)[:fetch_n]
        top_indices = top_indices[np.argsort(-sims[top_indices])]

        cand_df = pd.DataFrame({
            "movieId": [self._content_movie_ids[i] for i in top_indices],
            "score": sims[top_indices].astype(float),
        })
        cand_df = cand_df.merge(self.movies, on="movieId", how="left")
        cand_df["score"] = self._minmax(cand_df["score"].to_numpy())
        genre_str = ", ".join(genres[:3]) if genres else "your selected movies"
        cand_df["explanation"] = f"Matches your {genre_str} preferences."
        cand_df["recommendation_type"] = "cold_start"

        lambda_ = float(self.cfg.get("diversity_lambda", 0.15))
        cand_df = _mmr_diversify(cand_df, self._tfidf_matrix, self._content_movie_to_idx, n * 2, lambda_)
        result = cand_df.head(n)
        keep = [c for c in ["movieId", "title", "genres", "tmdbId", "score", "explanation", "recommendation_type"] if c in result.columns]
        return self._attach_posters(result[keep].to_dict(orient="records"))
