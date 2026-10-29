import os
import time
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

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

_model_dir_env = os.getenv("MODEL_DIR", "models")
MODEL_DIR = Path(_model_dir_env)
if not MODEL_DIR.is_absolute():
    MODEL_DIR = (PROJECT_ROOT / MODEL_DIR).resolve()

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


@app.get("/api/v1/auth/me")
def get_current_user(user_id: Optional[int] = Query(None), authorization: Optional[str] = Header(None)):
    from app.db import db_connection
    from sqlalchemy import text as sqla_text
    uid = user_id
    if uid is None and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            from jose import jwt
            from app.security import JWT_SECRET, JWT_ALGORITHM
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            uid = int(payload.get("sub"))
        except Exception:
            pass
    if uid is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    with db_connection() as conn:
        row = conn.execute(sqla_text("SELECT user_id, name, email FROM users WHERE user_id=:uid"), {"uid": uid}).mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": int(row["user_id"]), "name": row["name"], "email": row["email"]}


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "model_ready": service.ready}


# ── FLOW A: Search (pure title match, no recommendation logic) ────────────────

@app.get("/api/v1/movies/search")
def search_movies(q: str = Query(min_length=1), limit: int = Query(20, ge=1, le=100)):
    """Search for movies by title. Returns matching movie entities only."""
    return {"results": service.search(q, limit)}


@app.get("/api/v1/movies/trending")
def trending_movies(n: int = Query(20, ge=1, le=100)):
    """Return trending/popular movies from the popularity index."""
    movies = service.trending(n)
    return {"results": movies}


@app.get("/api/v1/movies/browse")
def browse_movies(
    genre: Optional[str] = Query(None),
    limit: int = Query(32, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Browse movies, optionally filtered by genre."""
    movies = service.browse(genre=genre, limit=limit, offset=offset)
    return {"results": movies, "total": len(movies)}


@app.get("/api/v1/movies/by-genre")
def movies_by_genre(genre: str = Query(...), n: int = Query(20, ge=1, le=50)):
    """Return top movies for a specific genre (for genre rails like Netflix)."""
    movies = service.movies_by_genre(genre, n)
    return {"genre": genre, "results": movies}


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
    """Personalized neighbor CF + ALS content hybrid from live DB ratings & watchlist."""
    try:
        from app.db import get_user_ratings, get_watchlist, record_recommendations
        db_ratings = get_user_ratings(user_id)
        wl_mids = get_watchlist(user_id)
        if wl_mids:
            rated_mids = {r["movie_id"] for r in (db_ratings or [])}
            extra = [{"movie_id": mid, "rating": 4.5, "timestamp": 0} for mid in wl_mids if mid not in rated_mids]
            db_ratings = (db_ratings or []) + extra

        if db_ratings:
            recs = service.recommend_neighbor_cf(user_id, db_ratings, n)
        else:
            recs = service.recommend(user_id, n)
        try:
            record_recommendations(user_id, recs, algorithm="neighbor_cf")
        except Exception:
            pass
        return {"user_id": user_id, "recommendations": recs}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/api/v1/recommendations/refresh")
def refresh_recommendations(user_id: int = Query(...), n: int = Query(20, ge=1, le=50)):
    """Quick refresh after watchlist/rating update using live neighbor CF."""
    try:
        from app.db import get_user_ratings, get_watchlist
        db_ratings = get_user_ratings(user_id)
        wl_mids = get_watchlist(user_id)
        if wl_mids:
            rated_mids = {r["movie_id"] for r in (db_ratings or [])}
            extra = [{"movie_id": mid, "rating": 4.5, "timestamp": 0} for mid in wl_mids if mid not in rated_mids]
            db_ratings = (db_ratings or []) + extra

        recs = service.recommend_neighbor_cf(user_id, db_ratings, n)
        return {"user_id": user_id, "recommendations": recs, "refreshed": True}
    except Exception as exc:
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


@app.get("/api/v1/ratings")
def get_user_ratings_endpoint(user_id: int = Query(...)):
    """Return all movies rated by user with their given star rating."""
    from app.db import get_user_ratings
    db_ratings = get_user_ratings(user_id)
    results = []
    for r in db_ratings:
        m = service.movie(r["movie_id"])
        if m:
            item = dict(m)
            item["user_rating"] = r["rating"]
            item["rated_at"] = r["timestamp"]
            results.append(item)
    return {"user_id": user_id, "results": results, "total": len(results)}


@app.delete("/api/v1/ratings/{movie_id}")
def delete_user_rating(movie_id: int, user_id: int = Query(...)):
    """Delete a user's rating for a movie."""
    from app.db import delete_rating
    removed = delete_rating(user_id, movie_id)
    return {"status": "removed" if removed else "not_found", "movie_id": movie_id}


@app.get("/api/v1/user/profile")
def get_user_profile(user_id: int = Query(...)):
    """Return aggregated profile stats based on the user's ratings."""
    from app.db import get_user_ratings
    db_ratings = get_user_ratings(user_id)
    rated_movies = []
    genre_counts = {}
    total_score = 0.0

    for r in db_ratings:
        m = service.movie(r["movie_id"])
        if m:
            item = dict(m)
            item["user_rating"] = r["rating"]
            item["rated_at"] = r["timestamp"]
            rated_movies.append(item)
            total_score += float(r["rating"])
            for g in str(m.get("genres", "")).split("|"):
                g = g.strip()
                if g and g != "(no genres listed)":
                    genre_counts[g] = genre_counts.get(g, 0) + 1

    top_genres = sorted(genre_counts.keys(), key=lambda g: genre_counts[g], reverse=True)[:5]
    avg_rating = round(total_score / len(db_ratings), 1) if db_ratings else 0.0

    return {
        "user_id": user_id,
        "rating_count": len(db_ratings),
        "avg_rating": avg_rating,
        "favorite_genres": top_genres,
        "rated_movies": rated_movies,
    }


@app.post("/api/v1/interactions")
def create_interaction(payload: InteractionCreate):
    record_interaction(payload.user_id, payload.movie_id, payload.interaction_type, int(time.time()))
    return {"status": "recorded", "type": payload.interaction_type}


@app.post("/api/v1/watchlist")
def create_watchlist(payload: WatchlistCreate):
    add_to_watchlist(payload.user_id, payload.movie_id)
    return {"status": "added", "movie_id": payload.movie_id}


@app.delete("/api/v1/watchlist/{movie_id}")
def delete_watchlist(movie_id: int, user_id: int = Query(...)):
    from app.db import remove_from_watchlist
    removed = remove_from_watchlist(user_id, movie_id)
    return {"status": "removed" if removed else "not_found", "movie_id": movie_id}


@app.get("/api/v1/watchlist")
def get_watchlist(user_id: int = Query(1)):
    from app.db import get_watchlist as _get_watchlist
    movie_ids = _get_watchlist(user_id)
    movies = []
    for mid in movie_ids:
        m = service.movie(mid)
        if m:
            movies.append(m)
    return {"results": movies}


# ── Frontend SPA ──────────────────────────────────────────────────────────────

FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
