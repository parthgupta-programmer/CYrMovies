from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_ready: bool


class Movie(BaseModel):
    movieId: int
    title: str
    genres: Optional[str] = None
    poster_url: Optional[str] = None


class Recommendation(BaseModel):
    movieId: int
    title: str
    genres: Optional[str] = None
    score: float
    explanation: Optional[str] = None
    recommendation_type: str = "personalized"


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: list[Recommendation]


class RatingCreate(BaseModel):
    user_id: int
    movie_id: int
    rating: float = Field(ge=0.5, le=5.0)


class InteractionCreate(BaseModel):
    user_id: int
    movie_id: int
    interaction_type: str = Field(min_length=1, max_length=50)


class WatchlistCreate(BaseModel):
    user_id: int
    movie_id: int


class AuthRegister(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str


class AuthLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
