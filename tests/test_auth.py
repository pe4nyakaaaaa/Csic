"""Telegram initData verification tests."""

from __future__ import annotations

import hashlib
import hmac
import os
from urllib.parse import urlencode

import pytest

# Use a fixed bot token for all tests in this module.
os.environ.setdefault("BOT_TOKEN", "TEST:token-abcdef")

from app.auth import InvalidInitData, verify_init_data  # noqa: E402
from app.config import settings  # noqa: E402


def _make_init_data(user: dict, auth_date: int) -> str:
    import json

    parts = {
        "auth_date": str(auth_date),
        "query_id": "abc",
        "user": json.dumps(user),
    }
    data_check_string = "\n".join(
        f"{k}={parts[k]}" for k in sorted(parts.keys())
    )
    secret_key = hmac.new(
        b"WebAppData", settings.bot_token.encode(), hashlib.sha256
    ).digest()
    h = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    parts["hash"] = h
    return urlencode(parts)


def test_verify_ok() -> None:
    import time

    user = {"id": 12345, "first_name": "Alice", "username": "alice"}
    init_data = _make_init_data(user, int(time.time()))
    parsed = verify_init_data(init_data)
    assert parsed["user"]["id"] == 12345


def test_verify_bad_hash() -> None:
    import time

    user = {"id": 12345, "first_name": "Alice"}
    init_data = _make_init_data(user, int(time.time()))
    init_data = init_data.replace("hash=", "hash=" + "0" * 64 + "&old=")
    with pytest.raises(InvalidInitData):
        verify_init_data(init_data.replace("old=", ""))


def test_verify_too_old() -> None:
    user = {"id": 12345, "first_name": "Alice"}
    init_data = _make_init_data(user, 1)  # epoch 1
    with pytest.raises(InvalidInitData):
        verify_init_data(init_data, max_age_seconds=10)
