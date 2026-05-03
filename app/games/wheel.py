"""Wheel of Fortune — spin a wheel of N segments. Each segment has a fixed
multiplier. The base table is chosen so the average payout is below 1; the
configured house edge is then applied on top.
"""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "wheel"

# 20-segment table: most segments small, occasional jackpot.
TABLE = [1.5, 1.2, 0.0, 1.5, 0.0, 2.0, 0.0, 1.5, 0.0, 3.0,
         0.0, 1.5, 0.0, 2.0, 0.0, 1.5, 0.0, 5.0, 0.0, 10.0]


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    [n] = take_uint32(server_seed, client_seed, nonce, 1)
    idx = n % len(TABLE)
    base = TABLE[idx]
    edge_factor = 1.0 - edge / 100.0
    multiplier = round(base * edge_factor, 4)
    return {
        "segments": TABLE,
        "segment": idx,
        "win": multiplier > 0,
        "multiplier": multiplier,
    }
