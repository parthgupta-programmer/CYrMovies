"""
CYrMovie Model Training Script
Trains ALS Collaborative Filtering model, builds popularity table,
evaluates precision/recall/NDCG, and saves all artifacts for FastAPI.
"""
import json
import time
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import numpy as np
import pandas as pd
import scipy.sparse as sp
from implicit.als import AlternatingLeastSquares
import joblib

from src.recommendation.collaborative_filtering import (
    build_mappings,
    add_internal_ids,
    build_positive_matrix,
    save_artifacts,
)
from src.evaluation.metrics import evaluate_model
from src.preprocessing.split import chronological_split, filter_sparse

def main():
    start_time = time.time()
    data_dir = Path("data/ml-32m")
    model_dir = Path("models")
    output_dir = Path("outputs")
    model_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Step 1: Loading movie catalog...")
    movies = pd.read_parquet(model_dir / "movies.parquet")
    print(f"Catalog contains {len(movies)} movies.")

    print("Step 2: Loading ratings sample...")
    # Load 1.5M ratings for fast, high-quality ALS factorization
    ratings = pd.read_csv(
        data_dir / "ratings.csv",
        nrows=1_500_000,
        dtype={"userId": "int32", "movieId": "int32", "rating": "float32", "timestamp": "int64"}
    )
    print(f"Loaded {len(ratings):,} ratings across {ratings['userId'].nunique():,} users and {ratings['movieId'].nunique():,} movies.")

    print("Step 3: Building Popularity Index...")
    pop = (
        ratings.groupby("movieId")
        .agg(rating_count=("rating", "size"), avg_rating=("rating", "mean"))
        .reset_index()
    )
    pop = pop[pop["rating_count"] >= 15].copy()
    pop["popularity_score"] = pop["avg_rating"] * np.log1p(pop["rating_count"])
    popularity = pop.sort_values("popularity_score", ascending=False).merge(movies, on="movieId", how="left")
    popularity_cols = [c for c in ["movieId", "title", "genres", "imdbId", "tmdbId", "poster", "avg_rating", "rating_count", "popularity_score"] if c in popularity.columns]
    popularity = popularity[popularity_cols]
    popularity.to_parquet(model_dir / "popularity.parquet", index=False)
    print(f"Popularity index saved with {len(popularity)} trending movies.")

    print("Step 4: Splitting train/validation/test chronologically...")
    train, val, test = chronological_split(ratings, min_user_interactions=5)
    train, val, test = filter_sparse(train, val, test, min_user_train=5, min_item_train=5)
    print(f"Train: {len(train):,}, Val: {len(val):,}, Test: {len(test):,}")

    print("Step 5: Mapping IDs and building sparse positive matrix...")
    mappings, unique_users, unique_movies = build_mappings(train)
    train = add_internal_ids(train, mappings)
    val = add_internal_ids(val, mappings)
    test = add_internal_ids(test, mappings)

    user_items = build_positive_matrix(
        train,
        len(unique_users),
        len(unique_movies),
        threshold=3.5,
    )

    print("Step 6: Training Alternating Least Squares (ALS) Collaborative Filtering model...")
    model = AlternatingLeastSquares(
        factors=64,
        regularization=0.08,
        iterations=15,
        random_state=42,
    )
    model.fit(user_items, show_progress=True)

    print("Step 7: Evaluating model metrics (Precision, Recall, Hit Rate, NDCG)...")
    metrics = evaluate_model(
        model=model,
        user_items=user_items,
        test_df=test,
        user_to_idx=mappings.user_to_idx,
        k=10,
        max_users=5000,
    )
    print("Evaluation Results:", json.dumps(metrics, indent=2))

    print("Step 8: Saving artifacts...")
    save_artifacts(model, user_items, mappings, movies, model_dir)

    # Save metrics
    pd.DataFrame([metrics]).to_csv(output_dir / "als_metrics.csv", index=False)
    training_summary = {
        "movies_total": len(movies),
        "ratings_sample": len(ratings),
        "train_rows": len(train),
        "users": len(unique_users),
        "items_in_training": len(unique_movies),
        "elapsed_seconds": round(time.time() - start_time, 2),
        "metrics": metrics,
    }
    with open(output_dir / "training_summary.json", "w", encoding="utf-8") as f:
        json.dump(training_summary, f, indent=2)

    print(f"Model training and artifact generation completed in {time.time() - start_time:.1f}s!")

if __name__ == "__main__":
    main()
