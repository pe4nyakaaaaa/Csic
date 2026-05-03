"""Casino game logic.

Every game module exposes:
  - ``GAME`` (str): canonical game key (used in URL paths and DB).
  - ``play(user, params, server_seed, client_seed, nonce, edge) -> dict``:
        deterministically computes the outcome of a single round.

All outcomes are deterministic functions of the (server_seed, client_seed,
nonce) triple. Any RTP/house-edge knob is built into the multiplier formula,
NOT into a user-specific outcome bias.
"""
from . import coinflip, crash, dice, hilo, limbo, mines, plinko, roulette, slots, wheel

GAMES = {
    coinflip.GAME: coinflip,
    crash.GAME: crash,
    dice.GAME: dice,
    hilo.GAME: hilo,
    limbo.GAME: limbo,
    mines.GAME: mines,
    plinko.GAME: plinko,
    roulette.GAME: roulette,
    slots.GAME: slots,
    wheel.GAME: wheel,
}

__all__ = ["GAMES"]
