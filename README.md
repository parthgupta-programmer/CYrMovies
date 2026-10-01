# 🎬 CYrMovie — Personalized Cinema Intelligence

CYrMovie is a full-stack, production-ready movie recommendation platform built with **FastAPI**, **React (Vite)**, **PostgreSQL / SQLite**, and a **hybrid Machine Learning pipeline** trained on the **MovieLens 32M** dataset.

It features a high-tech cyberpunk HUD interface, 4 distinct recommendation and discovery flows, franchise-aware filtering, and seamless deployment support on **Render**.

---

## 🌟 Key Highlights & Features

- **Decoupled Search vs. Recommendation Architecture**:
  - **Flow A (Search)**: Fast, strict title-matching across 87,585+ movies in the catalog.
  - **Flow B (Similar Movies)**: Thematic and genre-based content similarity (TF-IDF + Cosine distance) with **Franchise Filtering** (e.g., searching *The Maze Runner* recommends similar dystopian sci-fi thrillers like *Predestination* and *Cloverfield*, instead of just listing its own sequels).
  - **Flow C (For You)**: Collaborative Filtering & interaction-driven recommendations for registered users.
  - **Flow D (Cold Start)**: Onboarding questionnaire selecting favorite genres and seed movies to instantly generate tailored recommendations.
- **87,585 Movies Catalog**: Pre-indexed columnar storage (`models/movies.parquet`) for sub-millisecond retrieval.
- **Cyberpunk HUD UI**: Designed with glassmorphism, Framer Motion transitions, reactive match percentage badges, dynamic genre-colored fallback posters, and responsive 4-column grids.
- **Dual Database Support**: Out-of-the-box zero-setup **SQLite** for local development, with seamless automatic table initialization for **PostgreSQL** in production.
- **Single-Service SPA Serving**: FastAPI is configured to serve the built React frontend (`frontend/dist`) as a Single Page Application, enabling all-in-one deployment on Render with zero CORS issues.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                   CYrMovie Architecture                     │
└─────────────────────────────────────────────────────────────┘

       [ Browser / Client ] ── (React 19 + Vite + Framer Motion)
                │
                ▼
       [ FastAPI Serving Layer ] (app/main.py)
        ├── /api/v1/movies/search         ──> Title lookup (movies.parquet)
        ├── /api/v1/recommendations/similar──> TF-IDF Content Engine + Franchise Filter
        ├── /api/v1/recommendations/for-you──> Hybrid Recommender (CF + Content)
        ├── /api/v1/recommendations/cold-start> Multi-seed genre profile builder
        ├── /api/v1/auth & /watchlist     ──> User management & watchlists
        └── /{full_path}                  ──> Serves compiled React SPA
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
[ ML Artifacts (models/) ]    [ Database (PostgreSQL / SQLite) ]
 ├── movies.parquet (87.5k)    ├── users
 ├── movie_tfidf.npz (5.3MB)   ├── ratings
 ├── tfidf_vectorizer.joblib   ├── movie_interactions
 └── content_movie_ids.json    └── watchlist
```

---

## 📁 Repository Structure

```text
movie-recommender/
├── app/                                 # FastAPI Backend Service
│   ├── main.py                          # App entrypoint, CORS, routing, and SPA static mount
│   ├── recommendation_service.py       # Recommendation engine & franchise filtering logic
│   ├── db.py                            # Database connection & auto-table migration (SQLite & Postgres)
│   ├── auth.py                          # JWT authentication & password hashing
│   ├── schemas.py                       # Pydantic request/response models
│   └── security.py                      # Password hashing utilities
│
├── frontend/                            # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── movies/                  # MovieCard, MovieModal, MovieSearch
│   │   │   ├── recommendations/         # RecommendationGrid (4-column responsive grid)
│   │   │   ├── onboarding/              # GenreSelector, MovieSelector (Cold-start)
│   │   │   ├── navigation/              # Navbar, links
│   │   │   ├── hud/                     # HUDFrame, Sci-Fi styling elements
│   │   │   └── common/                  # Button, Loader, CustomCursor
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # Hero showcase & featured recommendations
│   │   │   ├── Discover.jsx             # Search catalog & filter by genre
│   │   │   ├── SimilarMovies.jsx        # Dedicated "Movies Like This" page (/similar/:id)
│   │   │   ├── ForYou.jsx               # Personalized & cold-start recommendation page
│   │   │   └── Watchlist.jsx            # User watchlist page
│   │   ├── services/api.js              # Centralized API service client
│   │   ├── utils/poster.js              # TMDB poster resolution & SVG HUD fallback generator
│   │   └── data/mockData.js             # Initial state & genres definition
│   ├── package.json
│   └── vite.config.js
│
├── models/                              # Pre-computed Production Artifacts (~10MB)
│   ├── movies.parquet                   # 87,585 catalog movies with TMDB mapping
│   ├── movie_tfidf.npz                  # TF-IDF sparse matrix for cosine similarity
│   ├── tfidf_vectorizer.joblib          # Scikit-learn TF-IDF vectorizer
│   ├── content_movie_ids.json           # Array mapping matrix rows to MovieLens IDs
│   └── recommendation_config.json       # Weights, diversity, and franchise settings
│
├── data/
│   ├── ml-32m/                          # Raw MovieLens dataset files (git-ignored)
│   │   ├── movies.csv
│   │   ├── ratings.csv
│   │   ├── links.csv
│   │   └── tags.csv
│   └── local.db                         # Local SQLite development database
│
├── notebooks/
│   └── MovieLens_Recommendation_System_Full_ML_Notebook.ipynb
│
├── src/                                 # Training Pipeline Source Code
│   ├── data/load_data.py
│   ├── preprocessing/split.py
│   ├── recommendation/collaborative_filtering.py
│   ├── recommendation/hybrid.py
│   └── evaluation/metrics.py
│
├── train.py                             # Pipeline runner for training models from raw data
├── render.yaml                          # Render Blueprint specification for 1-click deployment
├── Dockerfile                           # Container definition for API
├── docker-compose.yml                   # Multi-container orchestration (FastAPI + Postgres + React)
├── requirements.txt                     # Python production dependencies
└── README.md
```

---

## 📊 Dataset Information

This project is trained and evaluated on the **MovieLens 32M** dataset released by [GroupLens Research](https://grouplens.org/datasets/movielens/32m/):

| Dataset File | Records / Size | Purpose |
| :--- | :--- | :--- |
| `movies.csv` | **87,585 movies** | Movie title, genres, and identifiers. |
| `ratings.csv` | **~32,000,000 ratings** (~877MB) | Historical user feedback used for CF models. |
| `links.csv` | **87,585 records** | Mappings from MovieLens ID to TMDB and IMDb IDs. |
| `tags.csv` | **User tags** (~72MB) | Keyword tag signals for enrichment. |

> **Note**: Raw CSV files in `data/ml-32m/` are excluded from Git due to file size. The required compiled artifacts in `models/` (~10MB) are tracked in the repository so the web application runs immediately without retraining.

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`

### 2. Backend Setup
```bash
# 1. Create and activate a virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

---

## 🌐 Production Deployment (Render)

The application is configured to deploy effortlessly on [Render](https://render.com) using an **All-in-One Web Service** (FastAPI serves both the API and compiled React SPA):

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Deploy CYrMovie to Render"
git push origin main
```

### Step 2: Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Environment**: `Python 3`
   - **Build Command**:
     ```bash
     npm --prefix frontend install && npm --prefix frontend run build && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: `Free`
4. Add Environment Variables:
   - `PYTHON_VERSION`: `3.11.9`
   - `MODEL_DIR`: `models`
   - `CORS_ORIGINS`: `*`
   - *(Optional)* `DATABASE_URL`: Add your Render PostgreSQL Internal Connection String.

Render will build both the frontend and backend, serving the full application under a single live HTTPS URL.

---

## 🛠️ Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check and model loading status |
| `GET` | `/api/v1/movies/search?q={query}&limit=20` | Strict title search across catalog |
| `GET` | `/api/v1/movies/{movie_id}` | Retrieve movie details by ID |
| `GET` | `/api/v1/recommendations/similar/{movie_id}?n=32` | Thematic content recommendations (Flow B) |
| `GET` | `/api/v1/recommendations/for-you?user_id={id}&n=32`| Collaborative + content hybrid for user (Flow C) |
| `POST`| `/api/v1/recommendations/cold-start` | Multi-genre & seed cold-start recommendations (Flow D) |
| `POST`| `/api/v1/ratings` | Record user star rating |
| `POST`| `/api/v1/watchlist` | Add a movie to user watchlist |
| `POST`| `/api/v1/auth/register` | Register new user account |
| `POST`| `/api/v1/auth/login` | Authenticate user & issue JWT token |

---

## 🧪 Model Retraining (Optional)

To retrain the recommendation matrices from raw MovieLens data:

1. Download the MovieLens 32M archive and place `movies.csv`, `ratings.csv`, `links.csv`, and `tags.csv` inside `data/ml-32m/`.
2. Run the training script:
   ```bash
   python train.py --data-dir data/ml-32m --model-dir models --factors 64 --iterations 20
   ```
3. Or step through the notebook:
   ```bash
   jupyter notebook notebooks/MovieLens_Recommendation_System_Full_ML_Notebook.ipynb
   ```

---

## 📄 License
MIT License. Built for personalized cinema intelligence.
