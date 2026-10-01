from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize


def build_movie_text(movies: pd.DataFrame) -> pd.Series:
    genres = movies["genres"].fillna("").str.replace("|", " ", regex=False)
    return movies["title"].fillna("") + " " + genres


def fit_tfidf(movies: pd.DataFrame, max_features: int = 50_000):
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=max_features,
        min_df=2,
        ngram_range=(1, 2),
    )
    matrix = vectorizer.fit_transform(build_movie_text(movies))
    return vectorizer, matrix


def build_user_content_profile(
    user_history: pd.DataFrame,
    movie_id_to_idx: dict[int, int],
    movie_tfidf: sp.csr_matrix,
    min_rating: float = 4.0,
):
    history = user_history[user_history["rating"] >= min_rating]
    if history.empty:
        return None

    indices = [movie_id_to_idx[int(x)] for x in history["movieId"] if int(x) in movie_id_to_idx]
    if not indices:
        return None

    weights = history[history["movieId"].isin([int(x) for x in history["movieId"]])]["rating"].to_numpy(dtype=np.float32)
    weights = weights[: len(indices)]
    profile = movie_tfidf[indices].multiply(weights[:, None]).sum(axis=0)
    return normalize(sp.csr_matrix(profile), norm="l2")


def hybrid_scores(
    cf_scores: np.ndarray,
    candidate_indices: np.ndarray,
    user_profile,
    movie_tfidf: sp.csr_matrix,
    cf_weight: float = 0.85,
    content_weight: float = 0.15,
) -> np.ndarray:
    def minmax(v):
        v = np.asarray(v, dtype=np.float32)
        if len(v) == 0:
            return v
        lo, hi = float(v.min()), float(v.max())
        if hi - lo < 1e-8:
            return np.ones_like(v)
        return (v - lo) / (hi - lo)

    if user_profile is None:
        content = np.zeros(len(candidate_indices), dtype=np.float32)
    else:
        content = cosine_similarity(movie_tfidf[candidate_indices], user_profile).ravel().astype(np.float32)

    return cf_weight * minmax(cf_scores) + content_weight * minmax(content)


def save_tfidf(vectorizer, matrix: sp.csr_matrix, output_dir: str | Path):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, output_dir / "tfidf.joblib", compress=3)
    sp.save_npz(output_dir / "training_tfidf.npz", matrix)
