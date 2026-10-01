from dataclasses import dataclass
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp
from implicit.als import AlternatingLeastSquares


@dataclass
class Mappings:
    user_to_idx: dict[int, int]
    movie_to_idx: dict[int, int]
    idx_to_user: dict[int, int]
    idx_to_movie: dict[int, int]


def build_mappings(train: pd.DataFrame) -> tuple[Mappings, pd.Index, pd.Index]:
    users = pd.Index(train["userId"].unique(), name="userId")
    movies = pd.Index(train["movieId"].unique(), name="movieId")
    user_to_idx = {int(v): int(i) for i, v in enumerate(users)}
    movie_to_idx = {int(v): int(i) for i, v in enumerate(movies)}
    idx_to_user = {int(i): int(v) for i, v in enumerate(users)}
    idx_to_movie = {int(i): int(v) for i, v in enumerate(movies)}
    return Mappings(user_to_idx, movie_to_idx, idx_to_user, idx_to_movie), users, movies


def add_internal_ids(df: pd.DataFrame, mappings: Mappings) -> pd.DataFrame:
    df = df.copy()
    df["user_idx"] = df["userId"].map(mappings.user_to_idx)
    df["movie_idx"] = df["movieId"].map(mappings.movie_to_idx)
    df = df.dropna(subset=["user_idx", "movie_idx"])
    df["user_idx"] = df["user_idx"].astype("int32")
    df["movie_idx"] = df["movie_idx"].astype("int32")
    return df


def build_rating_matrix(train: pd.DataFrame, n_users: int, n_movies: int) -> sp.csr_matrix:
    return sp.csr_matrix(
        (
            train["rating"].to_numpy(dtype=np.float32),
            (
                train["user_idx"].to_numpy(dtype=np.int32),
                train["movie_idx"].to_numpy(dtype=np.int32),
            ),
        ),
        shape=(n_users, n_movies),
        dtype=np.float32,
    )


def build_positive_matrix(
    train: pd.DataFrame,
    n_users: int,
    n_movies: int,
    threshold: float = 4.0,
) -> sp.csr_matrix:
    positive = train[train["rating"] >= threshold].copy()
    confidence = (
        1.0 + positive["rating"].to_numpy(dtype=np.float32) - threshold
    ).astype(np.float32)
    return sp.csr_matrix(
        (
            confidence,
            (
                positive["user_idx"].to_numpy(dtype=np.int32),
                positive["movie_idx"].to_numpy(dtype=np.int32),
            ),
        ),
        shape=(n_users, n_movies),
        dtype=np.float32,
    )


def train_als(
    user_items: sp.csr_matrix,
    factors: int = 64,
    regularization: float = 0.08,
    iterations: int = 20,
    random_state: int = 42,
) -> AlternatingLeastSquares:
    model = AlternatingLeastSquares(
        factors=factors,
        regularization=regularization,
        iterations=iterations,
        random_state=random_state,
    )
    model.fit(user_items.T.tocsr(), show_progress=True)
    return model


def recommend(
    model: AlternatingLeastSquares,
    user_items: sp.csr_matrix,
    mappings: Mappings,
    movies: pd.DataFrame,
    raw_user_id: int,
    n: int = 10,
) -> pd.DataFrame:
    if raw_user_id not in mappings.user_to_idx:
        raise ValueError(f"Unknown user_id: {raw_user_id}")
    user_idx = mappings.user_to_idx[raw_user_id]
    item_idx, scores = model.recommend(
        user_idx,
        user_items[user_idx],
        N=n,
        filter_already_liked_items=True,
    )
    result = pd.DataFrame({"movie_idx": item_idx, "score": scores})
    result["movieId"] = result["movie_idx"].map(mappings.idx_to_movie)
    return result.merge(movies, on="movieId", how="left")[["movieId", "title", "genres", "score"]]


def save_artifacts(
    model: AlternatingLeastSquares,
    user_items: sp.csr_matrix,
    mappings: Mappings,
    movies: pd.DataFrame,
    model_dir: str | Path,
) -> None:
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_dir / "als_model.joblib", compress=3)
    sp.save_npz(model_dir / "user_items.npz", user_items)
    np.save(model_dir / "unique_users.npy", np.array(list(mappings.user_to_idx.keys()), dtype=np.int32))
    np.save(model_dir / "unique_movies.npy", np.array(list(mappings.movie_to_idx.keys()), dtype=np.int32))
    with open(model_dir / "user_to_idx.json", "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in mappings.user_to_idx.items()}, f)
    with open(model_dir / "movie_to_idx.json", "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in mappings.movie_to_idx.items()}, f)
    movies.to_parquet(model_dir / "movies.parquet", index=False)


def load_artifacts(model_dir: str | Path):
    model_dir = Path(model_dir)
    model = joblib.load(model_dir / "als_model.joblib")
    user_items = sp.load_npz(model_dir / "user_items.npz")
    with open(model_dir / "user_to_idx.json", encoding="utf-8") as f:
        user_to_idx = {int(k): int(v) for k, v in json.load(f).items()}
    with open(model_dir / "movie_to_idx.json", encoding="utf-8") as f:
        movie_to_idx = {int(k): int(v) for k, v in json.load(f).items()}
    mappings = Mappings(
        user_to_idx=user_to_idx,
        movie_to_idx=movie_to_idx,
        idx_to_user={v: k for k, v in user_to_idx.items()},
        idx_to_movie={v: k for k, v in movie_to_idx.items()},
    )
    movies = pd.read_parquet(model_dir / "movies.parquet")
    return model, user_items, mappings, movies
