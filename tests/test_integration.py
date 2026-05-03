"""Integration tests using FastAPI's TestClient + an isolated DB."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlencode

import pytest

# Configure env BEFORE importing the app.
os.environ.setdefault("BOT_TOKEN", "TEST:token-abcdef")
os.environ["JWT_SECRET"] = "test-secret-jwt-key-long-enough-for-warnings"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./data/test_integration.db"

# Force-fresh DB
import pathlib

db_path = pathlib.Path("./data/test_integration.db")
db_path.parent.mkdir(parents=True, exist_ok=True)
if db_path.exists():
    db_path.unlink()


def _bot_token() -> str:
    """Return the bot token actually used by the running app instance."""
    from app.config import settings
    return settings.bot_token or os.environ["BOT_TOKEN"]


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def _make_init_data(tg_id: int, username: str = "alice") -> str:
    user = {
        "id": tg_id,
        "first_name": "Alice",
        "last_name": "X",
        "username": username,
        "language_code": "ru",
    }
    parts = {
        "auth_date": str(int(time.time())),
        "query_id": "abc",
        "user": json.dumps(user),
    }
    data_check_string = "\n".join(
        f"{k}={parts[k]}" for k in sorted(parts.keys())
    )
    secret_key = hmac.new(
        b"WebAppData", _bot_token().encode(), hashlib.sha256
    ).digest()
    h = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    parts["hash"] = h
    return urlencode(parts)


def _login(client, tg_id: int, ref: str | None = None) -> tuple[str, dict]:
    init_data = _make_init_data(tg_id)
    body = {"init_data": init_data}
    if ref:
        body["ref"] = ref
    resp = client.post("/api/auth/telegram", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["token"], data["user"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_login_creates_user(client):
    token, user = _login(client, 1001)
    assert user["tg_id"] == 1001
    assert user["balance"] == 0
    me = client.get("/api/user/me", headers=auth_headers(token))
    assert me.status_code == 200
    assert me.json()["tg_id"] == 1001


def test_invalid_init_data_rejected(client):
    r = client.post("/api/auth/telegram", json={"init_data": "user=foo&hash=bad"})
    assert r.status_code == 401


def test_play_requires_funds(client):
    token, _ = _login(client, 1002)
    r = client.post(
        "/api/games/dice/play",
        headers=auth_headers(token),
        json={"bet": 10, "params": {"target": 50, "direction": "under"}},
    )
    assert r.status_code == 400
    assert "insufficient" in r.json()["detail"].lower()


def test_daily_bonus_then_play(client):
    token, _ = _login(client, 1003)
    # Claim daily bonus to get coins.
    r = client.post("/api/bonuses/daily", headers=auth_headers(token))
    assert r.status_code == 200, r.text
    me = client.get("/api/user/me", headers=auth_headers(token)).json()
    assert me["bonus_balance"] > 0

    # Place a small bet using bonus money.
    r = client.post(
        "/api/games/dice/play",
        headers=auth_headers(token),
        json={"bet": 10, "params": {"target": 50, "direction": "under"}},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["game"] == "dice"
    assert "result" in data
    assert "server_seed_hash" in data
    assert data["nonce"] == 1


def test_referral_credits(client):
    # User A registers; user B uses A's ref.
    token_a, user_a = _login(client, 2001)
    me_a = client.get("/api/user/me", headers=auth_headers(token_a)).json()
    ref_code = me_a["ref_code"]

    token_b, user_b = _login(client, 2002, ref=ref_code)
    # B claims daily bonus then bets (referral commission goes to A).
    client.post("/api/bonuses/daily", headers=auth_headers(token_b))
    r = client.post(
        "/api/games/dice/play",
        headers=auth_headers(token_b),
        json={"bet": 50, "params": {"target": 50, "direction": "under"}},
    )
    assert r.status_code == 200, r.text

    info = client.get("/api/referrals/info", headers=auth_headers(token_a)).json()
    assert info["referees_count"] == 1
    # 1% of 50 = 0.5
    assert info["referral_balance"] >= 0.4


def test_seed_rotation_reveals(client):
    token, _ = _login(client, 3001)
    me = client.get("/api/user/me", headers=auth_headers(token)).json()
    h_before = me["server_seed_hash"]

    r = client.post(
        "/api/user/seeds/rotate", headers=auth_headers(token), json={"client_seed": "myCS"}
    )
    assert r.status_code == 200
    data = r.json()
    # The revealed seed must hash to the previously-shown hash.
    revealed = data["revealed_server_seed"]
    assert hashlib.sha256(revealed.encode()).hexdigest() == h_before
    me = client.get("/api/user/me", headers=auth_headers(token)).json()
    assert me["client_seed"] == "myCS"
    assert me["nonce"] == 0


def test_static_files_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Aurora" in r.text


def test_content_endpoints(client):
    for path in ["privacy", "terms", "responsible", "faq", "support"]:
        r = client.get(f"/api/content/{path}")
        assert r.status_code == 200, path
        data = r.json()
        # Either has title or is non-empty
        assert isinstance(data, dict)
