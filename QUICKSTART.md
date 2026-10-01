# Quickstart

## 1. Put MovieLens data in place

```text
data/ml-32m/
├── movies.csv
├── ratings.csv
├── links.csv
└── tags.csv
```

## 2. Install Python dependencies

```bash
python -m pip install -r requirements.txt
```

## 3. Train the ML model

```bash
python train.py
```

## 4. Start FastAPI

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs`.

## 5. Start the React UI

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## 6. Docker option

```bash
docker compose up --build
```

This starts PostgreSQL, FastAPI, and the React frontend.

> The API requires trained artifacts in `models/` for personalized recommendations. Train first unless you intentionally want the API to start in an unready state.
