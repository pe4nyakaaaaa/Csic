"""Single-player Crash — same math as Limbo but with a "play out" semantics:
client picks autoCashout multiplier; the round either crashes below it or
reaches it. (For multiplayer real-time crash, see ``app/services/crash_room.py``
hook below — not implemented as multiplayer requires WebSockets.)
"""

from __future__ import annotations

from typing import Any

from . import limbo

GAME = "crash"


def play(
    *, params: dict[str, Any], server_seed: str, client_seed: str, nonce: int, edge: float
) -> dict[str, Any]:
    auto = float(params.get("auto_cashout", 2.0))
    res = limbo.play(
        params={"target": auto},
        server_seed=server_seed,
        client_seed=client_seed,
        nonce=nonce,
        edge=edge,
    )
    return {
        "auto_cashout": auto,
        "crash": res["crash"],
        "win": res["win"],
        "multiplier": res["multiplier"],
    }
