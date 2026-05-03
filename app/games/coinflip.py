"""Coinflip — heads or tails. 50/50 with house edge in payout."""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "coinflip"
SIDES = ("heads", "tails")


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    side = str(params.get("side", "heads")).lower()
    if side not in SIDES:
        raise ValueError("side must be 'heads' or 'tails'")

    [n] = take_uint32(server_seed, client_seed, nonce, 1)
    outcome = SIDES[n % 2]
    win = outcome == side
    multiplier = 2.0 * (1.0 - edge / 100.0) if win else 0.0
    multiplier = round(multiplier, 4)
    return {
        "side": side,
        "outcome": outcome,
        "win": win,
        "multiplier": multiplier,
    }
