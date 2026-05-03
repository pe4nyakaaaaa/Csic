"""Telegram WebApp initData verification + JWT session."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import parse_qsl

import jwt
from fastapi import Header, HTTPException, status

from .config import settings


class InvalidInitData(Exception):
    pass


def verify_init_data(init_data: str, max_age_seconds: int = 24 * 3600) -> dict[str, Any]:
    """Verify Telegram WebApp ``initData`` and return parsed user dict.

    Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data or not settings.bot_token:
        raise InvalidInitData("missing init_data or bot token")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise InvalidInitData("hash not present")

    data_check_string = "\n".join(f"{k}={parsed[k]}" for k in sorted(parsed.keys()))
    secret_key = hmac.new(
        b"WebAppData", settings.bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    expected = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise InvalidInitData("hash mismatch")

    auth_date = int(parsed.get("auth_date", "0") or 0)
    if auth_date and time.time() - auth_date > max_age_seconds:
        raise InvalidInitData("init data is too old")

    user_raw = parsed.get("user")
    if not user_raw:
        raise InvalidInitData("user is missing")

    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise InvalidInitData("user is not valid json") from exc

    return {
        "user": user,
        "auth_date": auth_date,
        "start_param": parsed.get("start_param"),
        "query_id": parsed.get("query_id"),
    }


def issue_jwt(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "iat": int(time.time()),
        "exp": int(time.time()) + settings.jwt_ttl_seconds,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_jwt(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        ) from exc
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    return int(sub)


async def auth_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token"
        )
    token = authorization.split(None, 1)[1].strip()
    return decode_jwt(token)
