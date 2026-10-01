# ML Pipeline

1. Load `movies.csv` and memory-efficient `ratings.csv`.
2. Validate schema, nulls, duplicates, rating range.
3. Sort ratings chronologically per user.
4. Hold out the last two interactions per eligible user for validation and test.
5. Filter users/items with insufficient training history.
6. Map raw IDs to contiguous integer indices.
7. Build sparse User×Movie matrices.
8. Create positive interactions for ratings >= threshold.
9. Train ALS matrix factorization.
10. Generate Top-N recommendations while filtering seen items.
11. Evaluate with Precision@K, Recall@K, HitRate@K, NDCG@K and Coverage@K.
12. Fit a TF-IDF movie-content model for hybrid/cold-start use cases.
13. Save model and mapping artifacts.
14. Serve recommendations through FastAPI.
