"""Dice — pick over/under target. Roll is uniform in [0, 100)."""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "dice"
MIN_TARGET = 0.01
MAX_TARGET = 99.99


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    target = float(params.get("target", 50))
    direction = str(params.get("direction", "under")).lower()
    if direction not in {"under", "over"}:
        raise ValueError("direction must be 'under' or 'over'")
    if not (MIN_TARGET <= target <= MAX_TARGET):
        raise ValueError(f"target must be in [{MIN_TARGET}, {MAX_TARGET}]")

    [n] = take_uint32(server_seed, client_seed, nonce, 1)
    roll = (n / 0x1_0000_0000) * 100.0  # [0, 100)
    roll = round(roll, 2)

    if direction == "under":
        win = roll < target
        win_chance = target
    else:  # over
        win = roll > target
        win_chance = 100.0 - target

    if win_chance <= 0:
        multiplier = 0.0
    else:
        multiplier = (100.0 - edge) / win_chance
        multiplier = max(0.0, round(multiplier, 4))

    return {
        "roll": roll,
        "target": target,
        "direction": direction,
        "win": win,
        "multiplier": multiplier if win else 0.0,
    }
