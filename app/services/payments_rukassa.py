"""Rukassa (rukassa.io / rukassa.is) integration.

Two flows:
  * Deposit: we POST to ``/api/v1/create`` to create an invoice; user is
    redirected to Rukassa to pay. Rukassa later POSTs to our webhook with
    the result.
  * Payout: we POST to ``/payout/create`` with payout token to send money
    to the user's wallet.

Signatures: Rukassa uses MD5 of "shop_id:amount:order_id:token" (deposit) and
similar for payout. We verify webhook signatures the same way. See:
https://lk.rukassa.is/api  (the actual params depend on Rukassa version —
configure ``RUKASSA_TOKEN`` / ``RUKASSA_TOKEN_PAYOUT`` accordingly).

Note: this module talks to the real Rukassa endpoint when configured. If
``RUKASSA_SHOP_ID`` is empty, ``create_invoice`` returns a mock URL so the
backend is usable in dev.
"""

from __future__ import annotations

import hashlib
from typing import Any

import httpx

from ..config import settings

API_BASE = "https://lk.rukassa.is/api/v1"


def _md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def deposit_signature(amount: float, order_id: str) -> str:
    """Rukassa deposit signature: md5(shop_id:amount:token:order_id)."""
    raw = f"{settings.rukassa_shop_id}:{amount:.2f}:{settings.rukassa_token}:{order_id}"
    return _md5(raw)


def webhook_signature(amount: float, order_id: str) -> str:
    """Webhook callback signature uses RUKASSA_WEBHOOK_SECRET."""
    raw = (
        f"{settings.rukassa_shop_id}:{amount:.2f}:"
        f"{settings.rukassa_webhook_secret}:{order_id}"
    )
    return _md5(raw)


def payout_signature(amount: float, wallet: str, method: str) -> str:
    raw = (
        f"{settings.rukassa_shop_id}:{amount:.2f}:"
        f"{settings.rukassa_token_payout}:{wallet}:{method}"
    )
    return _md5(raw)


async def create_invoice(
    *, order_id: str, amount_rub: float, user_id: int, method: str | None = None
) -> dict[str, Any]:
    """Create a deposit invoice in Rukassa. Returns ``{url, raw}``."""
    if not settings.rukassa_shop_id or not settings.rukassa_token:
        # Dev / unit-test mode — return a fake URL so flows can be tested
        # without hitting Rukassa.
        return {
            "url": f"{settings.public_base_url}/dev-pay?order_id={order_id}&amount={amount_rub}",
            "raw": {"mock": True, "order_id": order_id, "amount": amount_rub},
        }

    payload = {
        "shop_id": settings.rukassa_shop_id,
        "token": settings.rukassa_token,
        "order_id": order_id,
        "amount": f"{amount_rub:.2f}",
        "user_code": str(user_id),
        "json": "true",
    }
    if method:
        payload["method"] = method
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{API_BASE}/create", data=payload)
        data = resp.json()
    url = data.get("url") or data.get("link") or data.get("pay_url")
    if not url:
        raise RuntimeError(f"rukassa: failed to create invoice: {data}")
    return {"url": url, "raw": data}


async def create_payout(
    *, amount_rub: float, wallet: str, method: str
) -> dict[str, Any]:
    if not settings.rukassa_shop_id or not settings.rukassa_token_payout:
        return {"id": None, "raw": {"mock": True, "amount": amount_rub}}
    payload = {
        "shop_id": settings.rukassa_shop_id,
        "token": settings.rukassa_token_payout,
        "amount": f"{amount_rub:.2f}",
        "wallet": wallet,
        "method": method,
        "sign": payout_signature(amount_rub, wallet, method),
        "json": "true",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{API_BASE}/payout/create", data=payload)
        data = resp.json()
    return {"id": data.get("id"), "raw": data}


def verify_webhook(payload: dict[str, Any]) -> bool:
    """Return True if the incoming Rukassa webhook payload is authentic."""
    sign = payload.get("sign") or payload.get("signature")
    if not sign:
        return False
    amount = float(payload.get("amount", 0) or 0)
    order_id = str(payload.get("order_id") or payload.get("merchant_order_id") or "")
    if not order_id or amount <= 0:
        return False
    expected = webhook_signature(amount, order_id)
    return expected.lower() == str(sign).lower()
