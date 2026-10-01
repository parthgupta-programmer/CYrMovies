from sqlalchemy import text
from fastapi import HTTPException

from app.db import db_connection
from app.schemas import AuthLogin, AuthRegister
from app.security import create_access_token, hash_password, verify_password


def register(payload: AuthRegister):
    with db_connection() as conn:
        existing = conn.execute(
            text("SELECT user_id FROM users WHERE email=:email"), {"email": payload.email}
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Email already registered")
        user_id = conn.execute(
            text("""
                INSERT INTO users (name, email, password_hash)
                VALUES (:name, :email, :password_hash)
                RETURNING user_id
            """),
            {"name": payload.name, "email": payload.email, "password_hash": hash_password(payload.password)},
        ).scalar_one()
    return {"user_id": int(user_id), "access_token": create_access_token(str(user_id)), "token_type": "bearer"}


def login(payload: AuthLogin):
    with db_connection() as conn:
        row = conn.execute(
            text("SELECT user_id, password_hash FROM users WHERE email=:email"),
            {"email": payload.email},
        ).mappings().one_or_none()
    if not row or not row["password_hash"] or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = int(row["user_id"])
    return {"user_id": user_id, "access_token": create_access_token(str(user_id)), "token_type": "bearer"}
