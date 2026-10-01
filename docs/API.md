# API Reference

Base URL: `http://localhost:8000`

## Health

`GET /health`

## Search

`GET /api/v1/movies/search?q=inception&limit=20`

## Movie details

`GET /api/v1/movies/{movie_id}`

## Similar movies

`GET /api/v1/movies/{movie_id}/similar?n=10`

## Recommendations

`GET /api/v1/recommendations/{user_id}?n=10`

## Register

`POST /api/v1/auth/register`

```json
{"name":"Demo User","email":"demo@example.com","password":"change-me-now"}
```

## Login

`POST /api/v1/auth/login`

```json
{"email":"demo@example.com","password":"change-me-now"}
```

## Record rating

`POST /api/v1/ratings`

```json
{"user_id":1,"movie_id":296,"rating":5.0}
```

## Record interaction

`POST /api/v1/interactions`

```json
{"user_id":1,"movie_id":296,"interaction_type":"like"}
```

## Add to watchlist

`POST /api/v1/watchlist`

```json
{"user_id":1,"movie_id":296}
```
