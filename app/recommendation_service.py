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

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

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
    if len(candidates) > max(n * 3, 100):
        candidates = candidates.head(max(n * 3, 100))
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
                csv_path = PROJECT_ROOT / "data" / "ml-32m" / "movies.csv"
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
            if "popularity_score" not in self.movies.columns:
                pop_path = model_dir / "popularity.parquet"
                if pop_path.exists():
                    try:
                        pop = pd.read_parquet(pop_path)[["movieId", "popularity_score"]]
                        self.movies = self.movies.merge(pop, on="movieId", how="left")
                        self.movies["popularity_score"] = self.movies["popularity_score"].fillna(0.0)
                    except Exception:
                        self.movies["popularity_score"] = 0.0
                else:
                    self.movies["popularity_score"] = 0.0
            self.ready = True

    def _merge_tmdb_links(self):
        links_path = PROJECT_ROOT / "data" / "ml-32m" / "links.csv"
        if links_path.exists():
            try:
                links = pd.read_csv(links_path, dtype={"movieId": "int32"}, usecols=["movieId", "tmdbId", "imdbId"])
                self.movies = self.movies.merge(links, on="movieId", how="left")
                if "imdbId" in self.movies.columns:
                    self.movies["imdbId"] = self.movies["imdbId"].fillna(0).astype("int64")
                    self.movies["poster"] = "https://images.metahub.space/poster/medium/tt" + self.movies["imdbId"].astype(str).str.zfill(7) + "/img"
            except Exception as exc:
                logger.warning("Could not merge links.csv: %s", exc)

    def _save_movies_parquet(self, path):
        self.movies.to_parquet(path, index=False)

    def _get_poster(self, movie_id, tmdb_id=None, title="", existing_poster=None, imdb_id=None):
        if existing_poster and str(existing_poster).startswith("http"):
            return str(existing_poster)
        movie_id = int(movie_id)
        if movie_id in self._poster_cache:
            return self._poster_cache[movie_id]

        # Use imdb_id from parameters if available
        if imdb_id and str(imdb_id).strip() not in ("", "nan", "None", "0"):
            try:
                clean_imdb = str(int(float(imdb_id))).zfill(7)
                poster = f"https://images.metahub.space/poster/medium/tt{clean_imdb}/img"
                self._poster_cache[movie_id] = poster
                return poster
            except Exception:
                pass

        # Try to look up in catalog if available
        if hasattr(self, "movies") and not self.movies.empty:
            match = self.movies[self.movies["movieId"] == movie_id]
            if not match.empty:
                m_row = match.iloc[0]
                if pd.notna(m_row.get("poster")) and str(m_row.get("poster")).startswith("http"):
                    poster = str(m_row.get("poster"))
                    self._poster_cache[movie_id] = poster
                    return poster
                if pd.notna(m_row.get("imdbId")) and m_row.get("imdbId") > 0:
                    clean_imdb = str(int(m_row["imdbId"])).zfill(7)
                    poster = f"https://images.metahub.space/poster/medium/tt{clean_imdb}/img"
                    self._poster_cache[movie_id] = poster
                    return poster

        # Fallback to TMDB if API key exists and tmdb_id provided (cached)
        poster = _fetch_tmdb_poster(tmdb_id, title)
        self._poster_cache[movie_id] = poster
        return poster

    def _attach_posters(self, records):
        for r in records:
            mid = r.get("movieId")
            if mid is None:
                r["poster"] = None
                continue
            r["poster"] = self._get_poster(
                mid,
                r.get("tmdbId"),
                r.get("title", ""),
                r.get("poster"),
                r.get("imdbId"),
            )
            if "imdbId" not in r and hasattr(self, "movies") and not self.movies.empty:
                match = self.movies[self.movies["movieId"] == mid]
                if not match.empty and pd.notna(match.iloc[0].get("imdbId")):
                    r["imdbId"] = int(match.iloc[0]["imdbId"])
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

    MOVIE_FIELDS = [
        "movieId", "title", "genres", "tmdbId", "imdbId",
        "poster", "score", "explanation", "recommendation_type"
    ]

    def _popular(self, n):
        popularity_path = self.model_dir / "popularity.parquet"
        if popularity_path.exists():
            popular = pd.read_parquet(popularity_path).head(n).copy()
            popular["score"] = popular.get("popularity_score", 0.0)
            cols = [c for c in self.MOVIE_FIELDS if c in popular.columns]
            return popular[cols]
        cols = [c for c in self.MOVIE_FIELDS if c in self.movies.columns]
        return self.movies.head(n)[cols].copy().assign(score=0.0)

    def trending(self, n=20):
        """Return trending/popular movies — from popularity index or top-rated in catalog."""
        popular = self._popular(n)
        cols = [c for c in self.MOVIE_FIELDS if c in popular.columns]
        records = popular[cols].to_dict(orient="records")
        return self._attach_posters(records)

    def browse(self, genre=None, limit=32, offset=0):
        """Browse movies with optional genre filter. Returns paginated results with posters."""
        if self.movies.empty:
            return []
        df = self.movies.copy()
        if genre and genre.lower() not in ("all", ""):
            mask = df["genres"].str.contains(genre, case=False, na=False, regex=False)
            df = df[mask]
        pop_path = self.model_dir / "popularity.parquet"
        if pop_path.exists():
            try:
                pop = pd.read_parquet(pop_path)[["movieId", "popularity_score"]]
                df = df.merge(pop, on="movieId", how="left")
                df["popularity_score"] = df["popularity_score"].fillna(0)
                df = df.sort_values("popularity_score", ascending=False)
            except Exception:
                pass
        df = df.iloc[offset:offset + limit]
        cols = [c for c in self.MOVIE_FIELDS if c in df.columns]
        records = df[cols].to_dict(orient="records")
        return self._attach_posters(records)

    def movies_by_genre(self, genre, n=20):
        """Return top-N movies for a genre sorted by popularity (for genre rails)."""
        if self.movies.empty:
            return []
        mask = self.movies["genres"].str.contains(genre, case=False, na=False, regex=False)
        df = self.movies[mask].copy()
        pop_path = self.model_dir / "popularity.parquet"
        if pop_path.exists():
            try:
                pop = pd.read_parquet(pop_path)[["movieId", "popularity_score"]]
                df = df.merge(pop, on="movieId", how="left")
                df["popularity_score"] = df["popularity_score"].fillna(0)
                df = df.sort_values("popularity_score", ascending=False)
            except Exception:
                pass
        df = df.head(n)
        cols = [c for c in self.MOVIE_FIELDS if c in df.columns]
        records = df[cols].to_dict(orient="records")
        return self._attach_posters(records)

    # FLOW A: pure title search
    def search(self, q, limit=20):
        q = q.strip()
        if not q:
            return []
        mask = self.movies["title"].str.contains(q, case=False, na=False, regex=False)
        cols = [c for c in self.MOVIE_FIELDS if c in self.movies.columns]
        records = self.movies.loc[mask, cols].head(limit).to_dict(orient="records")
        return self._attach_posters(records)

    def movie(self, movie_id):
        result = self.movies[self.movies["movieId"] == movie_id]
        if result.empty:
            return None
        cols = [c for c in self.MOVIE_FIELDS if c in self.movies.columns]
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
        keep = [c for c in self.MOVIE_FIELDS if c in result.columns]
        records = result[keep].to_dict(orient="records")
        return self._attach_posters(records)

    def recommend_from_ratings(self, db_ratings, n=32):
        """
        Dynamic online recommendation computed from live user ratings.
        Combines:
          1. Collaborative Filtering (ALS item factors projection)
          2. Content-Based TF-IDF profile vector (genres + tags)
          3. Exclusion of movies the user has already rated
          4. Personalized explanation generation linked to specific rated movies
          5. MMR diversity re-ranking
        """
        if not self.ready:
            raise RuntimeError(self.error or "Model not ready")
        if not db_ratings:
            popular = self._popular(n)
            popular["explanation"] = "Catalog highlight — rate movies to unlock personalized picks."
            popular["recommendation_type"] = "cold_start"
            records = popular.to_dict(orient="records")
            return self._attach_posters(records)

        rated_mids = set(int(r["movie_id"]) for r in db_ratings)
        positive_ratings = [r for r in db_ratings if float(r.get("rating", 0)) >= 3.0]
        used_ratings = positive_ratings if positive_ratings else db_ratings

        cf_weight = float(self.cfg.get("hybrid_cf_weight", 0.70))
        content_weight = float(self.cfg.get("hybrid_content_weight", 0.30))

        # 1. Content profile vector
        user_content_profile = None
        if self._tfidf_matrix is not None:
            c_indices = []
            c_weights = []
            for r in used_ratings:
                mid = int(r["movie_id"])
                if mid in self._content_movie_to_idx:
                    c_indices.append(self._content_movie_to_idx[mid])
                    c_weights.append(max(0.2, float(r.get("rating", 3.0)) / 5.0))
            if c_indices:
                w_arr = np.array(c_weights, dtype=np.float32)
                p_mat = self._tfidf_matrix[c_indices].multiply(w_arr[:, None]).sum(axis=0)
                user_content_profile = normalize(sp.csr_matrix(p_mat), norm="l2")

        # 2. Collaborative filtering pseudo-user vector (from ALS item factors)
        user_cf_vec = None
        if self.has_collaborative_model and self.item_factors_normalized is not None:
            cf_indices = []
            cf_weights = []
            for r in used_ratings:
                mid = int(r["movie_id"])
                if mid in self.mappings.movie_to_idx:
                    cf_indices.append(self.mappings.movie_to_idx[mid])
                    cf_weights.append(max(0.2, float(r.get("rating", 3.0)) / 5.0))
            if cf_indices:
                cf_w_arr = np.array(cf_weights, dtype=np.float32)
                user_cf_vec = (self.item_factors_normalized[cf_indices] * cf_w_arr[:, None]).sum(axis=0)
                norm = np.linalg.norm(user_cf_vec)
                if norm > 1e-9:
                    user_cf_vec = user_cf_vec / norm

        # Candidate movies: filter out already rated
        cand_df = self.movies[~self.movies["movieId"].isin(rated_mids)].copy()
        if cand_df.empty:
            return []

        # CF score:
        if user_cf_vec is not None:
            cand_cf_indices = [self.mappings.movie_to_idx.get(mid, -1) for mid in cand_df["movieId"]]
            cf_scores = np.zeros(len(cand_df), dtype=np.float32)
            valid_cf = np.array(cand_cf_indices) >= 0
            if valid_cf.any():
                valid_idxs = [i for i in cand_cf_indices if i >= 0]
                cf_scores[valid_cf] = self.item_factors_normalized[valid_idxs] @ user_cf_vec
            cand_df["cf_score"] = cf_scores
        else:
            cand_df["cf_score"] = 0.0

        # Content score:
        if user_content_profile is not None:
            cand_content_indices = [self._content_movie_to_idx.get(mid, -1) for mid in cand_df["movieId"]]
            c_scores = np.zeros(len(cand_df), dtype=np.float32)
            valid_c = np.array(cand_content_indices) >= 0
            if valid_c.any():
                valid_idxs = [i for i in cand_content_indices if i >= 0]
                c_scores[valid_c] = cosine_similarity(self._tfidf_matrix[valid_idxs], user_content_profile).ravel()
            cand_df["content_score"] = c_scores
        else:
            cand_df["content_score"] = 0.0

        # Popularity score for tie-breaking
        pop_col = cand_df["popularity_score"].to_numpy() if "popularity_score" in cand_df.columns else np.zeros(len(cand_df), dtype=np.float32)

        # Normalize and combine
        cf_norm = self._minmax(cand_df["cf_score"].to_numpy())
        cont_norm = self._minmax(cand_df["content_score"].to_numpy())
        pop_norm = self._minmax(pop_col)

        if user_cf_vec is not None and user_content_profile is not None:
            cand_df["score"] = cf_weight * cf_norm + content_weight * cont_norm + 0.05 * pop_norm
        elif user_content_profile is not None:
            cand_df["score"] = 0.80 * cont_norm + 0.20 * pop_norm
        elif user_cf_vec is not None:
            cand_df["score"] = 0.80 * cf_norm + 0.20 * pop_norm
        else:
            cand_df["score"] = pop_norm

        # Filter down to top candidates BEFORE doing explanation text & MMR
        cand_df = cand_df.sort_values("score", ascending=False).head(max(n * 2, 64)).reset_index(drop=True)

        # Explanations based on rated movies
        rated_lookup = {}
        for r in used_ratings:
            mid = int(r["movie_id"])
            m_row = self.movies[self.movies["movieId"] == mid]
            if not m_row.empty:
                rated_lookup[mid] = {
                    "title": m_row.iloc[0]["title"],
                    "rating": float(r.get("rating", 5.0)),
                    "genres": set(str(m_row.iloc[0].get("genres", "")).split("|"))
                }

        explanations = []
        for _, row in cand_df.iterrows():
            cand_genres = set(str(row.get("genres", "")).split("|"))
            best_match_title = None
            best_match_rating = 5.0
            best_shared_count = -1
            for r_mid, r_info in rated_lookup.items():
                shared = len(cand_genres & r_info["genres"])
                if shared > best_shared_count:
                    best_shared_count = shared
                    best_match_title = r_info["title"]
                    best_match_rating = r_info["rating"]

            if best_match_title and best_shared_count > 0:
                clean_title = re.sub(r"\s*\(\d{4}\)$", "", str(best_match_title)).strip()
                explanations.append(f"Because you rated {clean_title} ({best_match_rating:.1f} stars)")
            elif best_match_title:
                clean_title = re.sub(r"\s*\(\d{4}\)$", "", str(best_match_title)).strip()
                explanations.append(f"Recommended based on your rating of {clean_title}.")
            else:
                explanations.append("Personalized cinema pick based on your profile.")

        cand_df["explanation"] = explanations
        cand_df["recommendation_type"] = "personalized_profile"

        lambda_ = float(self.cfg.get("diversity_lambda", 0.15))
        cand_df = _mmr_diversify(cand_df, self._tfidf_matrix, self._content_movie_to_idx, n, lambda_)
        result = cand_df.head(n).copy()

        keep = [c for c in self.MOVIE_FIELDS if c in result.columns]
        records = result[keep].to_dict(orient="records")
        return self._attach_posters(records)

    def recommend_neighbor_cf(self, user_id: int, user_ratings: list, n: int = 32) -> list:
        """
        Neighbor-based Collaborative Filtering from live DB ratings.
        Finds K nearest neighbors by cosine similarity on shared movie ratings,
        scores candidates by weighted avg neighbor ratings, blends with content.
        Falls back to recommend_from_ratings if no neighbors found.
        """
        from app.db import db_connection
        from sqlalchemy import text as sqla_text

        # If user_ratings is empty, try loading watchlist as implicit preferences
        if not user_ratings:
            try:
                from app.db import get_watchlist
                wl_mids = get_watchlist(user_id)
                if wl_mids:
                    user_ratings = [{"movie_id": mid, "rating": 4.5, "timestamp": 0} for mid in wl_mids]
            except Exception:
                pass

        if not user_ratings:
            return self.recommend_from_ratings([], n)

        # Also blend in watchlist items if not already present
        try:
            from app.db import get_watchlist
            wl_mids = get_watchlist(user_id)
            if wl_mids:
                rated_mids = {r["movie_id"] for r in user_ratings}
                for mid in wl_mids:
                    if mid not in rated_mids:
                        user_ratings = list(user_ratings) + [{"movie_id": mid, "rating": 4.5, "timestamp": 0}]
        except Exception:
            pass

        with db_connection() as conn:
            all_ratings = conn.execute(sqla_text("""
                SELECT user_id, movie_id, rating FROM ratings
                WHERE user_id != :uid
                ORDER BY user_id
            """), {"uid": user_id}).fetchall()

        if not all_ratings or not user_ratings:
            return self.recommend_from_ratings(user_ratings, n)

        rated_by_me = {int(r["movie_id"]): float(r["rating"]) for r in user_ratings}
        my_movies = sorted(rated_by_me.keys())

        neighbor_ratings: dict = {}
        for row in all_ratings:
            nuid, mid, rtg = int(row[0]), int(row[1]), float(row[2])
            neighbor_ratings.setdefault(nuid, {})[mid] = rtg

        min_shared = 1 if len(my_movies) <= 2 else 2
        similarities = {}
        for nuid, nratings in neighbor_ratings.items():
            shared = [m for m in my_movies if m in nratings]
            if len(shared) < min_shared:
                continue
            my_sub = np.array([rated_by_me[m] for m in shared], dtype=np.float32)
            nb_sub = np.array([nratings[m] for m in shared], dtype=np.float32)
            denom = np.linalg.norm(my_sub) * np.linalg.norm(nb_sub)
            if denom < 1e-9:
                continue
            sim = float(np.dot(my_sub, nb_sub) / denom)
            if sim > 0.05:
                similarities[nuid] = (sim, nratings)

        if not similarities:
            return self.recommend_from_ratings(user_ratings, n)

        top_neighbors = sorted(similarities.items(), key=lambda x: x[1][0], reverse=True)[:50]

        already_rated = set(rated_by_me.keys())
        candidate_scores: dict = {}
        candidate_weights: dict = {}
        for nuid, (sim, nratings) in top_neighbors:
            for mid, rtg in nratings.items():
                if mid in already_rated:
                    continue
                candidate_scores[mid] = candidate_scores.get(mid, 0.0) + sim * rtg
                candidate_weights[mid] = candidate_weights.get(mid, 0.0) + sim

        if not candidate_scores:
            return self.recommend_from_ratings(user_ratings, n)

        cf_neighbor_scores = {
            mid: candidate_scores[mid] / candidate_weights[mid]
            for mid in candidate_scores
            if candidate_weights[mid] > 1e-9
        }

        top_candidates = sorted(cf_neighbor_scores.items(), key=lambda x: x[1], reverse=True)[:min(n * 3, 200)]

        if not self.movies.empty and top_candidates:
            top_mids = [mid for mid, _ in top_candidates]
            cand_df = self.movies[self.movies["movieId"].isin(top_mids)].copy()
            score_map = dict(top_candidates)
            max_s = max(score_map.values()) if score_map else 1.0
            min_s = min(score_map.values()) if score_map else 0.0
            rng = max(max_s - min_s, 1e-9)
            cand_df["score"] = cand_df["movieId"].map(lambda m: (score_map.get(m, 0) - min_s) / rng)

            if self._tfidf_matrix is not None and user_ratings:
                c_indices = []
                c_weights_list = []
                for r in user_ratings:
                    mid = int(r["movie_id"])
                    if mid in self._content_movie_to_idx:
                        c_indices.append(self._content_movie_to_idx[mid])
                        c_weights_list.append(max(0.2, float(r.get("rating", 3.0)) / 5.0))
                if c_indices:
                    w_arr = np.array(c_weights_list, dtype=np.float32)
                    p_mat = self._tfidf_matrix[c_indices].multiply(w_arr[:, None]).sum(axis=0)
                    user_content_profile = normalize(sp.csr_matrix(p_mat), norm="l2")
                    cand_content_indices = [self._content_movie_to_idx.get(int(m), -1) for m in cand_df["movieId"]]
                    c_scores = np.zeros(len(cand_df), dtype=np.float32)
                    valid_c = np.array(cand_content_indices) >= 0
                    if valid_c.any():
                        valid_idxs = [i for i in cand_content_indices if i >= 0]
                        c_scores[valid_c] = cosine_similarity(self._tfidf_matrix[valid_idxs], user_content_profile).ravel()
                    cand_df["content_score"] = c_scores
                    cand_df["score"] = 0.65 * cand_df["score"] + 0.35 * cand_df["content_score"]

            cand_df = cand_df.sort_values("score", ascending=False).head(n)
            cand_df["explanation"] = "Recommended by users with similar taste."
            cand_df["recommendation_type"] = "collaborative_filtering"
            keep = [c for c in self.MOVIE_FIELDS if c in cand_df.columns] + ["score", "explanation", "recommendation_type"]
            keep = list(dict.fromkeys(keep))
            records = cand_df[[c for c in keep if c in cand_df.columns]].to_dict(orient="records")
            if len(records) < n:
                fallback_recs = self.recommend_from_ratings(user_ratings, n)
                existing_mids = {r.get("movieId") for r in records}
                for fr in fallback_recs:
                    if fr.get("movieId") not in existing_mids:
                        records.append(fr)
                        existing_mids.add(fr.get("movieId"))
                    if len(records) >= n:
                        break
            return self._attach_posters(records)

        return self.recommend_from_ratings(user_ratings, n)

    # FLOW C: personalized CF + content hybrid
    def recommend(self, user_id, n=32):
        if not self.ready:
            raise RuntimeError(self.error or "Model not ready")

        # 1. First check if user has live ratings or watchlist in database (live feedback loop)
        try:
            from app.db import get_user_ratings, get_watchlist
            db_ratings = get_user_ratings(user_id)
            wl_mids = get_watchlist(user_id)
            if wl_mids:
                rated_mids = {r["movie_id"] for r in (db_ratings or [])}
                extra = [{"movie_id": mid, "rating": 4.5, "timestamp": 0} for mid in wl_mids if mid not in rated_mids]
                db_ratings = (db_ratings or []) + extra

            if db_ratings and len(db_ratings) > 0:
                return self.recommend_neighbor_cf(user_id, db_ratings, n=n)
        except Exception as exc:
            logger.debug("Failed checking live db ratings for user %s: %s", user_id, exc)

        # 2. Fall back to offline ALS model if user in dataset
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

        keep = [c for c in self.MOVIE_FIELDS if c in result.columns]
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
            cols = [c for c in self.MOVIE_FIELDS if c in candidates.columns]
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
        keep = [c for c in self.MOVIE_FIELDS if c in result.columns]
        return self._attach_posters(result[keep].to_dict(orient="records"))

