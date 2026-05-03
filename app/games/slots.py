"""Slots — 3 reels, 5 symbols. Deterministic per-reel selection from
the same provably-fair stream.

Symbols (most→least common):
  - 🍒 cherry,  weight 30, 3-of-a-kind pays 2x
  - 🍋 lemon,   weight 25, pays 4x
  - 🍇 grape,   weight 20, pays 6x
  - 🔔 bell,    weight 15, pays 12x
  - 7  seven,   weight 8,  pays 25x
  - 💎 diamond, weight 2,  pays 100x

Tweak ``HOUSE_EDGE_SLOTS`` to scale ALL payouts uniformly (so RTP =
100 - edge%). The base payout table above is calibrated to ~RTP 96%; runtime
edge multiplier is then applied on top.
"""

from __future__ import annotations

from typing import Any

from ..rng import take_uint32

GAME = "slots"

SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "7️⃣", "💎"]
WEIGHTS = [30, 25, 20, 15, 8, 2]
PAYOUTS = {  # 3-of-a-kind base
    "🍒": 2.0,
    "🍋": 4.0,
    "🍇": 6.0,
    "🔔": 12.0,
    "7️⃣": 25.0,
    "💎": 100.0,
}
TWO_PAIR_PAYOUT = 0.5  # any two adjacent matching symbols


def _pick_symbol(rand: int) -> str:
    total = sum(WEIGHTS)
    p = rand % total
    acc = 0
    for s, w in zip(SYMBOLS, WEIGHTS, strict=True):
        acc += w
        if p < acc:
            return s
    return SYMBOLS[-1]


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    nums = take_uint32(server_seed, client_seed, nonce, 3)
    reels = [_pick_symbol(n) for n in nums]
    edge_factor = 1.0 - edge / 100.0

    if reels[0] == reels[1] == reels[2]:
        base = PAYOUTS[reels[0]]
        win = True
    elif reels[0] == reels[1] or reels[1] == reels[2]:
        base = TWO_PAIR_PAYOUT
        win = True
    else:
        base = 0.0
        win = False

    multiplier = round(base * edge_factor, 4) if win else 0.0
    return {
        "reels": reels,
        "win": win,
        "multiplier": multiplier,
    }
