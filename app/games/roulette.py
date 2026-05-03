"""European roulette (single zero, 37 pockets).

Bet types supported:
  - straight (single number 0..36)
  - red / black
  - even / odd
  - low (1-18) / high (19-36)
  - dozen1 (1-12) / dozen2 (13-24) / dozen3 (25-36)
  - column1 / column2 / column3

The mathematical house edge of European roulette is 1/37 ≈ 2.7%, baked in
via the single zero. We DO NOT scale payouts by RTP — we use the standard
casino payouts (35:1 straight, 1:1 even-money, 2:1 dozen/column) so users
can verify against any reference.
"""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "roulette"
RED = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}


def _payout_multiplier(bet_type: str, value: int | None, pocket: int) -> float:
    if bet_type == "straight":
        return 36.0 if pocket == value else 0.0
    if pocket == 0:
        return 0.0
    if bet_type == "red":
        return 2.0 if pocket in RED else 0.0
    if bet_type == "black":
        return 2.0 if pocket not in RED else 0.0
    if bet_type == "even":
        return 2.0 if pocket % 2 == 0 else 0.0
    if bet_type == "odd":
        return 2.0 if pocket % 2 == 1 else 0.0
    if bet_type == "low":
        return 2.0 if 1 <= pocket <= 18 else 0.0
    if bet_type == "high":
        return 2.0 if 19 <= pocket <= 36 else 0.0
    if bet_type == "dozen1":
        return 3.0 if 1 <= pocket <= 12 else 0.0
    if bet_type == "dozen2":
        return 3.0 if 13 <= pocket <= 24 else 0.0
    if bet_type == "dozen3":
        return 3.0 if 25 <= pocket <= 36 else 0.0
    if bet_type == "column1":
        return 3.0 if pocket % 3 == 1 else 0.0
    if bet_type == "column2":
        return 3.0 if pocket % 3 == 2 else 0.0
    if bet_type == "column3":
        return 3.0 if pocket % 3 == 0 else 0.0
    raise ValueError(f"unknown bet_type {bet_type}")


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    bet_type = str(params.get("bet_type", "red")).lower()
    value = params.get("value")
    if bet_type == "straight":
        v = int(value) if value is not None else 0
        if not (0 <= v <= 36):
            raise ValueError("straight value must be in 0..36")
        value = v
    else:
        value = None

    [n] = take_uint32(server_seed, client_seed, nonce, 1)
    pocket = n % 37
    color = "green" if pocket == 0 else ("red" if pocket in RED else "black")
    mult = _payout_multiplier(bet_type, value, pocket)
    win = mult > 0.0
    return {
        "bet_type": bet_type,
        "value": value,
        "pocket": pocket,
        "color": color,
        "win": win,
        "multiplier": round(mult, 4),
    }
