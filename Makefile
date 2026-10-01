.PHONY: install train api test lint docker-up docker-down

install:
	python -m pip install -r requirements.txt

train:
	python train.py

api:
	uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

test:
	pytest -q

lint:
	ruff check .

docker-up:
	docker compose up --build

docker-down:
	docker compose down
