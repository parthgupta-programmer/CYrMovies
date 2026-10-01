from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import pandas as pd

from src.data.load_data import load_movies, load_ratings
from src.evaluation.metrics import evaluate_model
from src.preprocessing.split import chronological_split, filter_sparse
from src.recommendation.collaborative_filtering import (
    add_internal_ids,
    build_mappings,
    build_positive_matrix,
    save_artifacts,
    train_als,
)
from src.recommendation.hybrid import fit_tfidf, save_tfidf


def parse_args():
    parser = argparse.ArgumentParser(description="Train the movie recommender.")
    parser.add_argument("--data-dir", default="data/ml-32m")
    parser.add_argument("--model-dir", default="models")
    parser.add_argument("--output-dir", default="outputs")
    parser.add_argument("--factors", type=int, default=64)
    parser.add_argument("--regularization", type=float, default=0.08)
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--positive-threshold", type=float, default=4.0)
    parser.add_argument("--min-user-train", type=int, default=5)
    parser.add_argument("--min-item-train", type=int, default=10)
    parser.add_argument("--eval-users", type=int, default=10000)
    return parser.parse_args()


def build_popularity(train: pd.DataFrame, movies: pd.DataFrame) -> pd.DataFrame:
    popularity = (
        train.groupby("movieId")
        .agg(rating_count=("rating", "size"), avg_rating=("rating", "mean"))
        .reset_index()
    )
    popularity = popularity[popularity["rating_count"] >= 50].copy()
    popularity["popularity_score"] = popularity["avg_rating"] * __import__("numpy").log1p(popularity["rating_count"])
    return (
        popularity.sort_values("popularity_score", ascending=False)
        .merge(movies, on="movieId", how="left")
        [["movieId", "title", "genres", "avg_rating", "rating_count", "popularity_score"]]
    )


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)
    output_dir = Path(args.output_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    start = time.time()
    print("Loading movies...")
    movies = load_movies(data_dir / "movies.csv")
    print("Loading ratings...")
    ratings = load_ratings(data_dir / "ratings.csv")
    print(f"movies={movies.shape}, ratings={ratings.shape}")

    train, validation, test = chronological_split(ratings)
    train, validation, test = filter_sparse(
        train, validation, test,
        min_user_train=args.min_user_train,
        min_item_train=args.min_item_train,
    )

    mappings, unique_users, unique_movies = build_mappings(train)
    train = add_internal_ids(train, mappings)
    validation = add_internal_ids(validation, mappings)
    test = add_internal_ids(test, mappings)

    user_items = build_positive_matrix(
        train,
        len(unique_users),
        len(unique_movies),
        threshold=args.positive_threshold,
    )

    print(f"Training ALS: factors={args.factors}, regularization={args.regularization}, iterations={args.iterations}")
    model = train_als(
        user_items,
        factors=args.factors,
        regularization=args.regularization,
        iterations=args.iterations,
    )

    test_truth = test.groupby("user_idx")["movie_idx"].apply(set).to_dict()
    metrics = evaluate_model(
        model, user_items, test_truth, k=10, max_users=args.eval_users
    )

    popularity = build_popularity(train, movies)
    popularity.to_parquet(model_dir / "popularity.parquet", index=False)

    save_artifacts(model, user_items, mappings, movies, model_dir)

    print("Fitting TF-IDF metadata model...")
    vectorizer, tfidf_matrix = fit_tfidf(movies)
    save_tfidf(vectorizer, tfidf_matrix, model_dir)

    config = {
        "factors": args.factors,
        "regularization": args.regularization,
        "iterations": args.iterations,
        "positive_rating_threshold": args.positive_threshold,
        "min_user_train": args.min_user_train,
        "min_item_train": args.min_item_train,
        "evaluation_users": args.eval_users,
    }
    with open(model_dir / "config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    pd.DataFrame([metrics]).to_csv(output_dir / "als_metrics.csv", index=False)
    with open(output_dir / "training_summary.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "movies_shape": list(movies.shape),
                "ratings_shape": list(ratings.shape),
                "train_shape": list(train.shape),
                "validation_shape": list(validation.shape),
                "test_shape": list(test.shape),
                "users": int(len(unique_users)),
                "movies_in_training": int(len(unique_movies)),
                "training_minutes": (time.time() - start) / 60,
                "metrics": metrics,
            },
            f,
            indent=2,
        )

    print(json.dumps(metrics, indent=2))
    print("Training complete. Artifacts:", model_dir.resolve())


if __name__ == "__main__":
    main()
