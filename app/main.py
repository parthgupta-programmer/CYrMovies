import os
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List

from app.schemas import (
    HealthResponse,
    RecommendationResponse,
    RatingCreate,
    InteractionCreate,
    WatchlistCreate,
    AuthRegister,
    AuthLogin,
)
from app.recommendation_service import RecommendationService
from app.db import record_rating, record_interaction, add_to_watchlist
from app.auth import register, login

MODEL_DIR = Path(os.getenv("MODEL_DIR", "models"))
CORS_ORIGINS = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]

app = FastAPI(
    title="CYrMovie Recommendation API",
    version="2.0.0",
    description="Hybrid content-based + collaborative filtering movie recommendation service.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = RecommendationService(MODEL_DIR)


class ColdStartRequest(BaseModel):
    genres: List[str] = []
    seed_movie_ids: List[int] = []
    n: Optional[int] = 32


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/register")
def register_user(payload: AuthRegister):
    return register(payload)


@app.post("/api/v1/auth/login")
def login_user(payload: AuthLogin):
    return login(payload)


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "model_ready": service.ready}


# ── FLOW A: Search (pure title match, no recommendation logic) ────────────────

@app.get("/api/v1/movies/search")
def search_movies(q: str = Query(min_length=1), limit: int = Query(20, ge=1, le=100)):
    """Search for movies by title. Returns matching movie entities only."""
    return {"results": service.search(q, limit)}


@app.get("/api/v1/movies/{movie_id}")
def get_movie(movie_id: int):
    movie = service.movie(movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


# ── FLOW B: Similar Movies (content-based, franchise-filtered) ────────────────

@app.get("/api/v1/recommendations/similar/{movie_id}")
def similar_movies(movie_id: int, n: int = Query(32, ge=1, le=100)):
    """
    Movie-to-movie content-based recommendations.
    Uses TF-IDF on genres, overview, tags — NOT title similarity.
    Excludes franchise sequels/variants.
    """
    try:
        return {"movie_id": movie_id, "results": service.similar_movies(movie_id, n)}
    except KeyError:
        raise HTTPException(status_code=404, detail="Movie not found in catalog")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# Legacy endpoint kept for backward compatibility
@app.get("/api/v1/movies/{movie_id}/similar")
def similar_movies_legacy(movie_id: int, n: int = Query(32, ge=1, le=100)):
    try:
        return {"movie_id": movie_id, "results": service.similar_movies(movie_id, n)}
    except KeyError:
        raise HTTPException(status_code=404, detail="Movie not found in catalog")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# ── FLOW C: Personalized For You ─────────────────────────────────────────────

@app.get("/api/v1/recommendations/for-you")
def for_you(user_id: int = Query(...), n: int = Query(32, ge=1, le=100)):
    """
    Personalized recommendations for a logged-in user.
    Combines CF (ALS) + content similarity to user taste profile + diversity.
    """
    try:
        recs = service.recommend(user_id, n)
        return {"user_id": user_id, "recommendations": recs}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# Legacy endpoint kept for backward compatibility
@app.get("/api/v1/recommendations/{user_id}", response_model=RecommendationResponse)
def recommendations_legacy(user_id: int, n: int = Query(32, ge=1, le=100)):
    try:
        return {"user_id": user_id, "recommendations": service.recommend(user_id, n)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# ── FLOW D: Cold Start ────────────────────────────────────────────────────────

@app.post("/api/v1/recommendations/cold-start")
def cold_start(payload: ColdStartRequest):
    """
    Cold-start recommendations from onboarding genres + seed movies.
    Builds a content profile and returns similar movies.
    """
    try:
        recs = service.cold_start(
            genres=payload.genres,
            seed_movie_ids=payload.seed_movie_ids,
            n=payload.n or 32,
        )
        return {"recommendations": recs, "recommendation_type": "cold_start"}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


# ── User actions ──────────────────────────────────────────────────────────────

@app.post("/api/v1/ratings")
def create_rating(payload: RatingCreate):
    record_rating(payload.user_id, payload.movie_id, payload.rating, int(time.time()))
    return {"status": "recorded", "type": "rating"}


@app.post("/api/v1/interactions")
def create_interaction(payload: InteractionCreate):
    record_interaction(payload.user_id, payload.movie_id, payload.interaction_type, int(time.time()))
    return {"status": "recorded", "type": payload.interaction_type}


@app.post("/api/v1/watchlist")
def create_watchlist(payload: WatchlistCreate):
    add_to_watchlist(payload.user_id, payload.movie_id)
    return {"status": "added", "movie_id": payload.movie_id}


# ── Frontend SPA ──────────────────────────────────────────────────────────────

FRONTEND_DIST = Path("frontend/dist")
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
