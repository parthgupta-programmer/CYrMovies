# Project Status

## Included

- [x] Product Requirements Document
- [x] README and quickstart
- [x] Full Jupyter ML notebook
- [x] Memory-efficient MovieLens ratings loading
- [x] Chronological split
- [x] Sparse matrices
- [x] Popularity baseline
- [x] ALS matrix factorization
- [x] Item-based collaborative filtering
- [x] Ranking metrics
- [x] TF-IDF content model
- [x] Hybrid recommendation logic
- [x] Cold-start fallback
- [x] Recommendation explanations
- [x] Model artifact persistence
- [x] FastAPI service
- [x] PostgreSQL schema + feedback writes
- [x] JWT-ready authentication endpoints
- [x] React starter frontend
- [x] Docker / Compose setup
- [x] Tests for preprocessing

## Before first production deployment

- Replace demo JWT secret.
- Add authentication middleware to protected endpoints.
- Map application users to model users explicitly.
- Add structured logging, monitoring and rate limiting.
- Add integration tests against PostgreSQL.
- Choose and document a retraining schedule.
