"""Hi-Lo — guess if the next card is higher or lower than the current.

Implemented as a single-step round: client provides the current rank (0..12)
and a guess ("higher" / "lower"). The next card is drawn deterministically
from the provably-fair stream.
"""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "hilo"
RANKS = 13  # 2..A => 0..12


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    current = int(params.get("current", 6))
    guess = str(params.get("guess", "higher")).lower()
    if not (0 <= current < RANKS):
        raise ValueError("current must be 0..12")
    if guess not in {"higher", "lower"}:
        raise ValueError("guess must be 'higher' or 'lower'")

    [n] = take_uint32(server_seed, client_seed, nonce, 1)
    next_card = n % RANKS

    win_chance: float
    if guess == "higher":
        # Strictly higher (ties lose).
        win = next_card > current
        win_chance = (RANKS - 1 - current) / RANKS * 100.0
    else:
        win = next_card < current
        win_chance = current / RANKS * 100.0

    if win_chance <= 0:
        multiplier = 0.0
    else:
        multiplier = round((100.0 - edge) / win_chance, 4) if win else 0.0

    return {
        "current": current,
        "guess": guess,
        "next_card": next_card,
        "win": win,
        "multiplier": multiplier,
    }
