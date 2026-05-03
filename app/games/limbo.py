"""Limbo — pick a target multiplier; you win if random crash >= target."""

from __future__ import annotations

import math
from typing import Any

from ..rng import take_uint32

GAME = "limbo"
MAX_MULT = 1_000_000.0


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    target = float(params.get("target", 2.0))
    if target < 1.01:
        raise ValueError("target must be >= 1.01")
    if target > MAX_MULT:
        raise ValueError(f"target too high (max {MAX_MULT})")

    # Use 52-bit float-ish from two uint32s (like Stake's limbo) for granularity.
    nums = take_uint32(server_seed, client_seed, nonce, 2)
    h = (nums[0] * (2**32) + nums[1]) % (2**52)

    edge_mult = 1.0 - edge / 100.0
    if h == 0:
        crash = MAX_MULT
    else:
        # raw = e/(e-h), then apply edge.
        e = 2**52
        raw = e / (e - h)
        crash = raw * edge_mult
        crash = max(1.0, math.floor(crash * 100) / 100)
        crash = min(crash, MAX_MULT)

    win = crash >= target
    multiplier = target if win else 0.0
    return {
        "target": target,
        "crash": crash,
        "win": win,
        "multiplier": multiplier,
    }
