import os
from contextlib import contextmanager
from pathlib import Path
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Locate project root directory (parent of 'app')
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load environment variables from .env in project root
load_dotenv(PROJECT_ROOT / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/local.db",
)

# If using a relative SQLite path, resolve it relative to PROJECT_ROOT so it works
# from any working directory (e.g. running from app/, frontend/, or tests)
if DATABASE_URL.startswith("sqlite"):
    prefix = "sqlite:///"
    raw_path = DATABASE_URL[len(prefix):]
    if raw_path and not raw_path.startswith(":memory:"):
        clean_path = raw_path[2:] if raw_path.startswith("./") else raw_path
        p = Path(clean_path)
        if not p.is_absolute():
            p = (PROJECT_ROOT / p).resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        DATABASE_URL = f"sqlite:///{p.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


@contextmanager
def db_connection():
    with engine.begin() as conn:
        yield conn


def init_db() -> None:
    """Initialize database tables matching PRD and Architecture diagrams."""
    is_sqlite = DATABASE_URL.startswith("sqlite")
    auto_inc = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"

    with db_connection() as conn:
        # Users Table
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS users (
                    user_id {auto_inc},
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        )

        # Movies Table
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS movies (
                    movie_id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    release_year INTEGER,
                    duration INTEGER,
                    language TEXT,
                    poster_url TEXT,
                    description TEXT
                );
            """)
        )

        # Genres Table
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS genres (
                    genre_id {auto_inc},
                    genre_name TEXT UNIQUE NOT NULL
                );
            """)
        )

        # Movie-Genres Table
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS movie_genres (
                    movie_id INTEGER NOT NULL,
                    genre_id INTEGER NOT NULL,
                    PRIMARY KEY (movie_id, genre_id)
                );
            """)
        )

        # Ratings Table
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS ratings (
                    rating_id {auto_inc},
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    rating REAL NOT NULL,
                    timestamp INTEGER NOT NULL,
                    UNIQUE (user_id, movie_id)
                );
            """)
        )

        # Watchlist Table
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS watchlist (
                    watchlist_id {auto_inc},
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, movie_id)
                );
            """)
        )

        # Movie Interactions Table
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS movie_interactions (
                    interaction_id {auto_inc},
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    interaction_type TEXT NOT NULL,
                    timestamp INTEGER NOT NULL
                );
            """)
        )

        # Recommendations Table (Diagram 2 & 4)
        conn.execute(
            text(f"""
                CREATE TABLE IF NOT EXISTS recommendations (
                    recommendation_id {auto_inc},
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    score REAL NOT NULL,
                    algorithm TEXT NOT NULL,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        )

        # Indexes for fast lookup
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ratings_movie ON ratings(movie_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_interactions_user ON movie_interactions(user_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);"))


def seed_movies_from_parquet(limit: int = 5000) -> int:
    """Populate movies, genres, and movie_genres tables from models/movies.parquet if empty."""
    parquet_path = PROJECT_ROOT / "models" / "movies.parquet"
    if not parquet_path.exists():
        return 0

    with db_connection() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM movies")).scalar()
        if count and count >= limit:
            return count

    try:
        import pandas as pd
        df = pd.read_parquet(parquet_path)
        sample = df.head(limit)
        movie_rows = []
        all_genres = set()
        movie_genre_pairs = []

        for _, r in sample.iterrows():
            mid = int(r["movieId"])
            movie_rows.append({
                "movie_id": mid,
                "title": str(r.get("title", ""))[:255],
                
                "poster_url": str(r.get("poster", "")) if pd.notna(r.get("poster")) else None,
                "description": str(r.get("overview", "")) if pd.notna(r.get("overview")) else None,
            })
            g_str = r.get("genres", "")
            if pd.notna(g_str):
                for g in str(g_str).split("|"):
                    g_clean = g.strip()
                    if g_clean and g_clean != "(no genres listed)":
                        all_genres.add(g_clean)
                        movie_genre_pairs.append((mid, g_clean))

        with db_connection() as conn:
            # 1. Insert movies
            conn.execute(
                text("""
                    INSERT INTO movies (movie_id, title, poster_url, description)
                    VALUES (:movie_id, :title, :poster_url, :description)
                    ON CONFLICT (movie_id) DO NOTHING
                """),
                movie_rows,
            )

            # 2. Insert genres
            for g in sorted(all_genres):
                conn.execute(
                    text("""
                        INSERT INTO genres (genre_name)
                        VALUES (:genre_name)
                        ON CONFLICT (genre_name) DO NOTHING
                    """),
                    {"genre_name": g},
                )

            genre_id_map = {
                name: gid
                for gid, name in conn.execute(text("SELECT genre_id, genre_name FROM genres")).fetchall()
            }

            # 3. Insert movie_genres
            mg_rows = [
                {"movie_id": mid, "genre_id": genre_id_map[g_name]}
                for mid, g_name in movie_genre_pairs
                if g_name in genre_id_map
            ]
            if mg_rows:
                conn.execute(
                    text("""
                        INSERT INTO movie_genres (movie_id, genre_id)
                        VALUES (:movie_id, :genre_id)
                        ON CONFLICT (movie_id, genre_id) DO NOTHING
                    """),
                    mg_rows,
                )
        return len(movie_rows)
    except Exception as exc:
        print(f"Notice: Movie catalog seeding skipped ({exc})")
        return 0


def seed_synthetic_users(n_users: int = 50) -> int:
    """Seed synthetic user accounts and their ratings for collaborative filtering neighbor matching."""
    import random, time as _time
    with db_connection() as conn:
        existing = conn.execute(text("SELECT COUNT(*) FROM users WHERE email LIKE 'synthetic_%@cyrmovie.internal'")).scalar()
        if existing and existing >= n_users:
            return existing

    # Get available movie IDs from the movies table
    with db_connection() as conn:
        rows = conn.execute(text("SELECT movie_id FROM movies LIMIT 5000")).fetchall()
    if not rows:
        return 0
    movie_ids = [r[0] for r in rows]

    # Genre buckets for personality-based rating profiles
    GENRE_PROFILES = [
        {"name": "Action Fan",        "genres": ["Action", "Thriller", "Crime"],       "bias": 4.2},
        {"name": "Sci-Fi Lover",      "genres": ["Sci-Fi", "Animation", "Fantasy"],     "bias": 4.0},
        {"name": "Drama Enthusiast",  "genres": ["Drama", "Romance", "Musical"],        "bias": 3.8},
        {"name": "Comedy Buff",       "genres": ["Comedy", "Animation", "Children"],    "bias": 4.1},
        {"name": "Horror Addict",     "genres": ["Horror", "Thriller", "Mystery"],      "bias": 3.9},
        {"name": "Arthouse Critic",   "genres": ["Documentary", "Drama", "War"],        "bias": 3.5},
        {"name": "Blockbuster Fan",   "genres": ["Action", "Sci-Fi", "Adventure"],      "bias": 4.3},
        {"name": "Family Viewer",     "genres": ["Children", "Animation", "Comedy"],    "bias": 4.0},
        {"name": "Crime Noir Fan",    "genres": ["Crime", "Thriller", "Mystery"],       "bias": 4.1},
        {"name": "Mixed Watcher",     "genres": [],                                     "bias": 3.7},
    ]

    # Get genre -> movie_id mapping from DB
    with db_connection() as conn:
        genre_movie_rows = conn.execute(text("""
            SELECT g.genre_name, mg.movie_id
            FROM movie_genres mg
            JOIN genres g ON g.genre_id = mg.genre_id
        """)).fetchall()
    genre_to_movies: dict = {}
    for gname, mid in genre_movie_rows:
        genre_to_movies.setdefault(gname, []).append(mid)

    random.seed(42)
    users_created = 0
    is_sqlite = DATABASE_URL.startswith("sqlite")
    with db_connection() as conn:
        for i in range(n_users):
            profile = GENRE_PROFILES[i % len(GENRE_PROFILES)]
            email = f"synthetic_{i:03d}@cyrmovie.internal"
            name = f"{profile['name']} #{i+1}"
            # Check if already exists
            exists = conn.execute(text("SELECT user_id FROM users WHERE email=:e"), {"e": email}).scalar()
            if exists:
                uid = exists
            else:
                if is_sqlite:
                    conn.execute(text("INSERT INTO users (name, email, password_hash) VALUES (:n, :e, 'SYNTHETIC_NO_LOGIN')"), {"n": name, "e": email})
                    uid = conn.execute(text("SELECT user_id FROM users WHERE email=:e"), {"e": email}).scalar()
                else:
                    uid = conn.execute(text("INSERT INTO users (name, email, password_hash) VALUES (:n, :e, 'SYNTHETIC_NO_LOGIN') RETURNING user_id"), {"n": name, "e": email}).scalar()
                users_created += 1

            # Count existing ratings for this user
            existing_ratings = conn.execute(text("SELECT COUNT(*) FROM ratings WHERE user_id=:uid"), {"uid": uid}).scalar()
            if existing_ratings and existing_ratings >= 30:
                continue

            # Build a candidate pool weighted by genre preferences
            preferred_movies = []
            for genre in profile["genres"]:
                preferred_movies.extend(genre_to_movies.get(genre, []))
            preferred_movies = list(set(preferred_movies))

            # Sample 20-40 movies
            n_ratings = random.randint(20, 40)
            if preferred_movies and len(preferred_movies) >= 10:
                n_pref = min(int(n_ratings * 0.7), len(preferred_movies))
                n_rand = n_ratings - n_pref
                chosen = random.sample(preferred_movies, n_pref)
                remaining_pool = [m for m in movie_ids if m not in chosen]
                if remaining_pool:
                    chosen += random.sample(remaining_pool, min(n_rand, len(remaining_pool)))
            else:
                chosen = random.sample(movie_ids, min(n_ratings, len(movie_ids)))

            # Generate ratings with personality bias + noise
            base_ts = int(_time.time()) - random.randint(86400, 86400 * 365)
            rating_rows = []
            for mid in chosen:
                rating = min(5.0, max(0.5, round(random.gauss(profile["bias"], 0.8) * 2) / 2))
                ts = base_ts + random.randint(0, 86400 * 30)
                rating_rows.append({"user_id": uid, "movie_id": mid, "rating": rating, "timestamp": ts})

            if rating_rows:
                conn.execute(text("""
                    INSERT INTO ratings (user_id, movie_id, rating, timestamp)
                    VALUES (:user_id, :movie_id, :rating, :timestamp)
                    ON CONFLICT (user_id, movie_id) DO NOTHING
                """), rating_rows)

    return users_created


try:
    init_db()
    seed_movies_from_parquet()
    seed_synthetic_users(50)
except Exception as exc:
    print(f"Database initialization notice: {exc}")


def record_rating(user_id: int, movie_id: int, rating: float, timestamp: int) -> None:
    with db_connection() as conn:
        conn.execute(
            text("""
                INSERT INTO ratings (user_id, movie_id, rating, timestamp)
                VALUES (:user_id, :movie_id, :rating, :timestamp)
                ON CONFLICT (user_id, movie_id)
                DO UPDATE SET rating = EXCLUDED.rating,
                              timestamp = EXCLUDED.timestamp
            """),
            {
                "user_id": user_id,
                "movie_id": movie_id,
                "rating": rating,
                "timestamp": timestamp,
            },
        )


def get_user_ratings(user_id: int) -> List[Dict[str, Any]]:
    """Retrieve all ratings submitted by a user, newest first."""
    with db_connection() as conn:
        rows = conn.execute(
            text("""
                SELECT movie_id, rating, timestamp
                FROM ratings
                WHERE user_id = :uid
                ORDER BY timestamp DESC
            """),
            {"uid": user_id},
        ).fetchall()
    return [{"movie_id": int(r[0]), "rating": float(r[1]), "timestamp": int(r[2])} for r in rows]


def get_user_rating_for_movie(user_id: int, movie_id: int) -> Optional[float]:
    """Retrieve the user's specific rating for a single movie if rated."""
    with db_connection() as conn:
        row = conn.execute(
            text("SELECT rating FROM ratings WHERE user_id = :uid AND movie_id = :mid"),
            {"uid": user_id, "mid": movie_id},
        ).fetchone()
    return float(row[0]) if row else None


def delete_rating(user_id: int, movie_id: int) -> bool:
    """Delete a user's rating for a movie."""
    with db_connection() as conn:
        result = conn.execute(
            text("DELETE FROM ratings WHERE user_id = :uid AND movie_id = :mid"),
            {"uid": user_id, "mid": movie_id},
        )
    return result.rowcount > 0


def record_interaction(user_id: int, movie_id: int, interaction_type: str, timestamp: int) -> None:
    with db_connection() as conn:
        conn.execute(
            text("""
                INSERT INTO movie_interactions
                (user_id, movie_id, interaction_type, timestamp)
                VALUES (:user_id, :movie_id, :interaction_type, :timestamp)
            """),
            {
                "user_id": user_id,
                "movie_id": movie_id,
                "interaction_type": interaction_type,
                "timestamp": timestamp,
            },
        )


def add_to_watchlist(user_id: int, movie_id: int) -> None:
    with db_connection() as conn:
        conn.execute(
            text("""
                INSERT INTO watchlist (user_id, movie_id)
                VALUES (:user_id, :movie_id)
                ON CONFLICT (user_id, movie_id) DO NOTHING
            """),
            {"user_id": user_id, "movie_id": movie_id},
        )


def remove_from_watchlist(user_id: int, movie_id: int) -> bool:
    with db_connection() as conn:
        result = conn.execute(
            text("DELETE FROM watchlist WHERE user_id = :uid AND movie_id = :mid"),
            {"uid": user_id, "mid": movie_id},
        )
    return result.rowcount > 0


def get_watchlist(user_id: int) -> list:
    with db_connection() as conn:
        rows = conn.execute(
            text("SELECT movie_id FROM watchlist WHERE user_id=:uid ORDER BY added_at DESC"),
            {"uid": user_id},
        ).fetchall()
    return [row[0] for row in rows]


def record_recommendations(user_id: int, recs: List[Dict[str, Any]], algorithm: str = "hybrid") -> None:
    """Store generated recommendations in database for tracking and analytics (Diagram 2 & 4)."""
    if not recs or not user_id:
        return
    with db_connection() as conn:
        for r in recs[:20]:
            mid = r.get("movieId")
            if mid is not None:
                score = float(r.get("score", 0.0))
                alg = str(r.get("recommendation_type", algorithm))
                conn.execute(
                    text("""
                        INSERT INTO recommendations (user_id, movie_id, score, algorithm)
                        VALUES (:user_id, :movie_id, :score, :algorithm)
                    """),
                    {
                        "user_id": user_id,
                        "movie_id": mid,
                        "score": score,
                        "algorithm": alg,
                    },
                )


if __name__ == "__main__":
    print("=" * 60)
    print("CYrMovie Database Diagnostic & Verification")
    print("=" * 60)
    print(f"Database URL : {DATABASE_URL}")
    print("\nEnsuring tables & schema...")
    init_db()
    seed_movies_from_parquet()
    print("\nTable Status:")
    with db_connection() as conn:
        for tbl in ["users", "movies", "genres", "movie_genres", "ratings", "watchlist", "movie_interactions", "recommendations"]:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
                print(f"  [OK] {tbl:<20} : {cnt:>6} records")
            except Exception as e:
                print(f"  [X]  {tbl:<20} : Error ({e})")
    print("\nDatabase is connected, schema is verified, and tables are ready!")

