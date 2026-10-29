import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["model_ready"] is True

def test_trending_movies():
    res = client.get("/api/v1/movies/trending?n=5")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "movieId" in first
    assert "title" in first
    assert "poster" in first
    assert first["poster"] is not None
    assert str(first["poster"]).startswith("http")

def test_movies_by_genre():
    res = client.get("/api/v1/movies/by-genre?genre=Action&n=5")
    assert res.status_code == 200
    data = res.json()
    assert data["genre"] == "Action"
    assert len(data["results"]) > 0
    assert "Action" in data["results"][0]["genres"]

def test_search_movies():
    res = client.get("/api/v1/movies/search?q=Toy Story&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert any("Toy Story" in m["title"] for m in data["results"])

def test_similar_movies():
    res = client.get("/api/v1/recommendations/similar/1?n=5")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "movieId" in first
    assert "poster" in first
    assert str(first["poster"]).startswith("http")

def test_for_you_recommendations():
    res = client.get("/api/v1/recommendations/for-you?user_id=1&n=5")
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    first = data["recommendations"][0]
    assert "movieId" in first
    assert "poster" in first
    assert str(first["poster"]).startswith("http")

def test_cold_start_recommendations():
    payload = {
        "genres": ["Action", "Sci-Fi"],
        "seed_movie_ids": [1, 2],
        "n": 5
    }
    res = client.post("/api/v1/recommendations/cold-start", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

def test_watchlist_lifecycle():
    user_id = 9999
    movie_id = 1
    # Add to watchlist
    res = client.post("/api/v1/watchlist", json={"user_id": user_id, "movie_id": movie_id})
    assert res.status_code == 200

    # Get watchlist
    res = client.get(f"/api/v1/watchlist?user_id={user_id}")
    assert res.status_code == 200
    movies = res.json()["results"]
    assert any(m["movieId"] == movie_id for m in movies)

    # Delete from watchlist
    res = client.delete(f"/api/v1/watchlist/{movie_id}?user_id={user_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "removed"

    # Verify deleted
    res = client.get(f"/api/v1/watchlist?user_id={user_id}")
    assert res.status_code == 200
    movies = res.json()["results"]
    assert not any(m["movieId"] == movie_id for m in movies)

def test_user_ratings_and_interactions():
    res = client.post("/api/v1/ratings", json={"user_id": 9999, "movie_id": 1, "rating": 4.5})
    assert res.status_code == 200
    assert res.json()["status"] == "recorded"

    res = client.post("/api/v1/interactions", json={"user_id": 9999, "movie_id": 1, "interaction_type": "like"})
    assert res.status_code == 200
    assert res.json()["status"] == "recorded"
