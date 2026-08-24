"""
Authentication for AquaVigil.

Handles GitHub OAuth (the live login path — see AuthModal on the frontend),
plus legacy email/password signup/login (real, tested, but no longer wired
to the frontend UI; kept working in case something still calls it directly),
and JWT token creation/verification shared by both. Uses SQLite (the same
aquavigil.db everything else uses) for the users table.

Login is optional app-wide: guests can use the app fully (samples just have
no owner), but a logged-in user's samples are tied to their account so
/samples/mine can show their history after logging back in.
"""

import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import Header, HTTPException
from passlib.context import CryptContext

# No hardcoded fallback here on purpose — a fixed default secret sitting in a
# public repo lets anyone forge a valid token for any user_id. Set
# AQUAVIGIL_SECRET_KEY in the deploy environment (e.g. Render) for tokens
# that survive a restart; without it, we generate a random one per process
# start, which just means existing sessions get invalidated on restart —
# no worse than what the ephemeral SQLite/in-memory sample store already do.
SECRET_KEY = os.environ.get("AQUAVIGIL_SECRET_KEY") or secrets.token_hex(32)
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = os.path.join(os.path.dirname(__file__), "aquavigil.db")

# --- GitHub OAuth ---
# Register an OAuth App at https://github.com/settings/developers with its
# "Authorization callback URL" set to exactly GITHUB_REDIRECT_URI below
# (defaults match local dev — override all three for a deployed backend).
# No fallback secret is possible here (unlike AQUAVIGIL_SECRET_KEY above) —
# without real values from GitHub, github_login() below refuses to redirect
# rather than sending the user to a broken github.com URL.
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "http://127.0.0.1:8000/auth/github/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def github_oauth_configured() -> bool:
    return bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)


def build_github_authorize_url(state: str) -> str:
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


def exchange_github_code(code: str) -> str:
    """Exchanges a GitHub OAuth `code` for an access token. Raises ValueError
    with GitHub's own error_description on failure (bad/reused code, etc.)."""
    resp = httpx.post(
        GITHUB_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_REDIRECT_URI,
        },
        timeout=10,
    )
    resp.raise_for_status()
    payload = resp.json()
    token = payload.get("access_token")
    if not token:
        raise ValueError(payload.get("error_description") or "GitHub did not return an access token")
    return token


def fetch_github_profile(access_token: str) -> dict:
    """Returns {github_id, username, avatar_url, email}. email may be None —
    GitHub lets users hide it even from apps with the user:email scope."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    user_resp = httpx.get(GITHUB_USER_URL, headers=headers, timeout=10)
    user_resp.raise_for_status()
    profile = user_resp.json()

    email = profile.get("email")
    if not email:
        emails_resp = httpx.get(GITHUB_EMAILS_URL, headers=headers, timeout=10)
        if emails_resp.status_code == 200:
            emails = emails_resp.json()
            primary = next((e["email"] for e in emails if e.get("primary")), None)
            email = primary or (emails[0]["email"] if emails else None)

    return {
        "github_id": profile["id"],
        "username": profile.get("login"),
        "avatar_url": profile.get("avatar_url"),
        "email": email,
    }


def find_or_create_github_user(profile: dict) -> dict:
    """Looks up a user by github_id, creating one on first login. Returns
    {id, email, username, avatar_url}."""
    conn = get_db()
    row = conn.execute("SELECT id, email FROM users WHERE github_id = ?", (profile["github_id"],)).fetchone()

    if row is None:
        cursor = conn.execute(
            "INSERT INTO users (email, github_id, github_username, avatar_url) VALUES (?, ?, ?, ?)",
            (profile["email"], profile["github_id"], profile["username"], profile["avatar_url"]),
        )
        conn.commit()
        user_id, email = cursor.lastrowid, profile["email"]
    else:
        # Refresh username/avatar each login in case they changed on GitHub;
        # keep the existing email on file if this login didn't expose one.
        user_id = row["id"]
        email = profile["email"] or row["email"]
        conn.execute(
            "UPDATE users SET github_username = ?, avatar_url = ?, email = ? WHERE id = ?",
            (profile["username"], profile["avatar_url"], email, user_id),
        )
        conn.commit()

    conn.close()
    return {"id": user_id, "email": email, "username": profile["username"], "avatar_url": profile["avatar_url"]}


def get_user_by_id(user_id: int) -> dict | None:
    """Full current profile for /auth/me — the JWT payload itself only
    carries user_id/email, not username/avatar, so this is the one place
    that reflects live GitHub profile data (refreshed each login above)."""
    conn = get_db()
    row = conn.execute(
        "SELECT id, email, github_username, avatar_url FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"], "username": row["github_username"], "avatar_url": row["avatar_url"]}


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