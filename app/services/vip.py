"""VIP / level progression."""

from __future__ import annotations

LEVELS = [
    (0, "Bronze", 0),
    (1, "Silver", 5_000),
    (2, "Gold", 25_000),
    (3, "Platinum", 100_000),
    (4, "Diamond", 500_000),
    (5, "Aurora", 2_500_000),
]


def level_for_xp(xp: float) -> tuple[int, str, float, float | None]:
    """Return (level, name, threshold, next_threshold)."""
    current = LEVELS[0]
    next_t: float | None = None
    for lvl in LEVELS:
        if xp >= lvl[2]:
            current = lvl
        else:
            next_t = lvl[2]
            break
    return current[0], current[1], float(current[2]), next_t
