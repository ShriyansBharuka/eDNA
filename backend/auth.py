"""
Authentication for AquaVigil.

Handles signup, login, password hashing, and JWT token creation/verification.
Uses SQLite (the same aquavigil.db everything else uses) for the users table.

Login is optional app-wide: guests can use the app fully (samples just have
no owner), but a logged-in user's samples are tied to their account so
/samples/mine can show their history after logging back in.
"""

import os
import sqlite3
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException
from passlib.context import CryptContext

SECRET_KEY = os.environ.get("AQUAVIGIL_SECRET_KEY", "aquavigil-dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = os.path.join(os.path.dirname(__file__), "aquavigil.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Returns the payload dict if valid, or None if expired/invalid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def create_user(email: str, password: str) -> dict:
    """
    Creates a new user. Raises ValueError if the email is already taken.
    Returns {"id": int, "email": str} on success.
    """
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing is not None:
        conn.close()
        raise ValueError("An account with this email already exists")

    password_hash = hash_password(password)
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, password_hash),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return {"id": user_id, "email": email}


def authenticate_user(email: str, password: str) -> dict | None:
    """
    Checks email + password against the database.
    Returns {"id": int, "email": str} if valid, None otherwise.
    """
    conn = get_db()
    row = conn.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if row is None:
        return None
    if not verify_password(password, row["password_hash"]):
        return None

    return {"id": row["id"], "email": row["email"]}


def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Use with Depends() on routes that REQUIRE login (e.g. /samples/mine).
    Raises 401 if missing, malformed, or expired/invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"user_id": payload["user_id"], "email": payload["email"]}


def get_optional_user(authorization: str = Header(None)) -> dict | None:
    """
    Use with Depends() on routes that work for BOTH guests and logged-in
    users (e.g. /samples/upload). Returns the user dict if a valid token is
    present, or None if there's no token / it's invalid — never raises,
    so guests can still use these routes freely.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if payload is None:
        return None

    return {"user_id": payload["user_id"], "email": payload["email"]}