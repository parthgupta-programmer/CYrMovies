import os
from contextlib import contextmanager

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/local.db",
)

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
    """Initialize database tables for local usage if using SQLite."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    with db_connection() as conn:
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS ratings (
                    rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    rating REAL NOT NULL,
                    timestamp INTEGER NOT NULL,
                    UNIQUE (user_id, movie_id)
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS movie_interactions (
                    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    interaction_type TEXT NOT NULL,
                    timestamp INTEGER NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS watchlist (
                    watchlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    movie_id INTEGER NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, movie_id)
                );
            """)
        )


# Automatically initialize tables if SQLite is used
try:
    init_db()
except Exception:
    pass


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
