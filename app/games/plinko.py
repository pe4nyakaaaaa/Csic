"""Plinko — drop a ball through ``rows`` rows of pegs; each peg deflects
left or right. Final bin (0..rows) determines the multiplier.

The distribution of bins follows a binomial(n, 0.5) — bin k has probability
C(n,k)/2^n. We construct the multiplier table so that:

    sum_k P(k) * mult_k * (1 - edge%) ≈ 1.

Three risk profiles supported (low / medium / high) — same method as Stake.
"""

from __future__ import annotations

import math
from typing import Any

from ..rng import floats_iter

GAME = "plinko"

ROW_OPTIONS = (8, 10, 12, 14, 16)

# Hand-tuned base multipliers (without house edge). Symmetric around the
# center; edges = highest payout, center = below 1x. Values inspired by
# common Plinko tables; finalized RTP is then scaled by edge.
_BASE_TABLES: dict[tuple[str, int], list[float]] = {
    ("low", 8): [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    ("medium", 8): [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    ("high", 8): [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    ("low", 10): [8.9, 3, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
    ("medium", 10): [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    ("high", 10): [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    ("low", 12): [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    ("medium", 12): [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    ("high", 12): [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    ("low", 14): [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    ("medium", 14): [58, 15, 7, 4, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4, 7, 15, 58],
    ("high", 14): [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    ("low", 16): [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    ("medium", 16): [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
    ("high", 16): [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
}


def _table(risk: str, rows: int) -> list[float]:
    risk = risk.lower()
    if (risk, rows) not in _BASE_TABLES:
        raise ValueError(f"no plinko table for risk={risk}, rows={rows}")
    return _BASE_TABLES[(risk, rows)]


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    rows = int(params.get("rows", 12))
    if rows not in ROW_OPTIONS:
        raise ValueError(f"rows must be one of {ROW_OPTIONS}")
    risk = str(params.get("risk", "medium")).lower()
    if risk not in {"low", "medium", "high"}:
        raise ValueError("risk must be low/medium/high")

    floats = floats_iter(server_seed, client_seed, nonce)
    path = []  # 0 = left, 1 = right
    bin_index = 0
    for _ in range(rows):
        bit = 1 if next(floats) < 0.5 else 0
        path.append(bit)
        bin_index += bit

    table = _table(risk, rows)
    base_mult = table[bin_index]
    edge_factor = 1.0 - edge / 100.0
    multiplier = round(base_mult * edge_factor, 4)
    win = multiplier >= 1.0
    return {
        "rows": rows,
        "risk": risk,
        "path": path,
        "bin": bin_index,
        "table": table,
        "multiplier": multiplier,
        "win": win,
    }


def expected_rtp(risk: str, rows: int, edge: float) -> float:
    """Compute expected RTP for the given table — for self-tests."""
    table = _table(risk, rows)
    edge_factor = 1.0 - edge / 100.0
    total = 0.0
    for k in range(rows + 1):
        p = math.comb(rows, k) / (2**rows)
        total += p * table[k] * edge_factor
    return total
