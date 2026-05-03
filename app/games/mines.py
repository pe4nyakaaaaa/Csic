"""Mines — 5x5 grid. The player must reveal cells one at a time without
hitting any of N mines.

This implementation runs in **resolved-bet mode**: the user submits their
chosen ``picks`` as a list of cell indices (0..24), and we compute the
outcome in one shot. (A stateful flow with per-pick reveal would require an
intermediate "round" record; this single-shot mode gives identical math and
provability.)
"""

from __future__ import annotations

from math import comb
from typing import Any

from ..rng import shuffle_indices

GAME = "mines"
GRID = 25
MIN_MINES = 1
MAX_MINES = 24


def safe_multiplier(picks: int, mines: int, edge: float) -> float:
    if picks <= 0:
        return 1.0
    safe = GRID - mines
    if picks > safe:
        return 0.0
    # Probability that all picks are safe = C(safe, picks) / C(GRID, picks).
    p = comb(safe, picks) / comb(GRID, picks)
    fair = 1.0 / p
    return round(fair * (1.0 - edge / 100.0), 4)


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    mines = int(params.get("mines", 3))
    picks_raw = params.get("picks", [])
    if not isinstance(picks_raw, list):
        raise ValueError("picks must be a list of cell indices")
    picks: list[int] = []
    seen: set[int] = set()
    for x in picks_raw:
        v = int(x)
        if v < 0 or v >= GRID:
            raise ValueError(f"pick {v} out of range")
        if v in seen:
            raise ValueError("duplicate pick")
        seen.add(v)
        picks.append(v)
    if not (MIN_MINES <= mines <= MAX_MINES):
        raise ValueError(f"mines must be in [{MIN_MINES}, {MAX_MINES}]")
    if len(picks) == 0:
        raise ValueError("must pick at least one cell")
    if len(picks) > GRID - mines:
        raise ValueError("too many picks for given number of mines")

    # Generate mine locations: shuffle 0..24 and take first `mines` as mine cells.
    perm = shuffle_indices(server_seed, client_seed, nonce, GRID)
    mine_cells = set(perm[:mines])

    revealed = []
    hit = False
    for cell in picks:
        is_mine = cell in mine_cells
        revealed.append({"cell": cell, "mine": is_mine})
        if is_mine:
            hit = True
            break

    if hit:
        multiplier = 0.0
        win = False
    else:
        multiplier = safe_multiplier(len(picks), mines, edge)
        win = multiplier > 0.0

    return {
        "mines": mines,
        "picks": picks,
        "revealed": revealed,
        "mine_cells": sorted(mine_cells),
        "win": win,
        "multiplier": multiplier,
    }
