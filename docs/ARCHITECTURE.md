# System Architecture

```text
React Frontend
      |
      | REST/JSON
      v
FastAPI Application
      |
      +---- Movie/Search Service --------> Movie metadata artifacts / DB
      |
      +---- Recommendation Service -------> ALS + TF-IDF artifacts
      |
      +---- Feedback Service -------------> PostgreSQL
      |
      +---- Auth Service -----------------> PostgreSQL + JWT
      |
      v
PostgreSQL

Offline path:
MovieLens CSVs -> validation -> chronological split -> sparse matrix -> ALS -> evaluation -> saved artifacts
                                 |
                                 +-> TF-IDF metadata model
```

## Design principles

1. Offline training is isolated from online serving.
2. Sparse matrices are used instead of dense user×movie tables.
3. The serving layer loads model artifacts at startup.
4. PostgreSQL stores application interactions, ratings, watchlists, and recommendation records.
5. The frontend is replaceable; the recommendation API is the product boundary.
