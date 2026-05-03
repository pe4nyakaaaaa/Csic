"""Game logic tests — sanity, determinism, approximate RTP."""

from __future__ import annotations

import math

import pytest

from app.games import (
    coinflip,
    crash,
    dice,
    hilo,
    limbo,
    mines,
    plinko,
    roulette,
    slots,
    wheel,
)

SS = "deadbeef" * 8
CS = "client-seed-fixture"
EDGE_PCT = 1.0


def test_dice_deterministic() -> None:
    a = dice.play(
        params={"target": 50, "direction": "under"},
        server_seed=SS, client_seed=CS, nonce=1, edge=1.0,
    )
    b = dice.play(
        params={"target": 50, "direction": "under"},
        server_seed=SS, client_seed=CS, nonce=1, edge=1.0,
    )
    assert a == b


def test_dice_rtp_approx() -> None:
    """Average payout / bet over many rolls should ≈ (1 - edge%)."""
    n = 5000
    target, edge = 50.0, 1.0
    won = 0.0
    for nonce in range(1, n + 1):
        r = dice.play(
            params={"target": target, "direction": "under"},
            server_seed=SS, client_seed=CS, nonce=nonce, edge=edge,
        )
        if r["win"]:
            won += r["multiplier"]
    rtp = won / n
    assert 0.95 < rtp < 1.03  # 99% expected, allow noise


def test_dice_under_over_symmetry() -> None:
    r1 = dice.play(
        params={"target": 60, "direction": "under"},
        server_seed=SS, client_seed=CS, nonce=10, edge=2.0,
    )
    r2 = dice.play(
        params={"target": 60, "direction": "over"},
        server_seed=SS, client_seed=CS, nonce=10, edge=2.0,
    )
    # With identical seed/nonce, roll value is the same; only win-state may differ.
    assert r1["roll"] == r2["roll"]


def test_coinflip_deterministic() -> None:
    a = coinflip.play(
        params={"side": "heads"}, server_seed=SS, client_seed=CS, nonce=1, edge=2.0
    )
    b = coinflip.play(
        params={"side": "heads"}, server_seed=SS, client_seed=CS, nonce=1, edge=2.0
    )
    assert a == b


def test_coinflip_rtp_approx() -> None:
    n = 2000
    won = 0.0
    for nonce in range(1, n + 1):
        r = coinflip.play(
            params={"side": "heads"}, server_seed=SS, client_seed=CS, nonce=nonce, edge=2.0
        )
        if r["win"]:
            won += r["multiplier"]
    rtp = won / n
    assert 0.93 < rtp < 1.03


def test_mines_safe_multiplier_grows() -> None:
    # 3 mines, more picks => higher multiplier.
    m1 = mines.safe_multiplier(1, 3, 1.0)
    m2 = mines.safe_multiplier(5, 3, 1.0)
    assert m1 < m2


def test_mines_pick_is_deterministic() -> None:
    a = mines.play(
        params={"mines": 3, "picks": [0, 1, 2, 3]},
        server_seed=SS, client_seed=CS, nonce=42, edge=1.0,
    )
    b = mines.play(
        params={"mines": 3, "picks": [0, 1, 2, 3]},
        server_seed=SS, client_seed=CS, nonce=42, edge=1.0,
    )
    assert a == b


def test_mines_rejects_bad_input() -> None:
    with pytest.raises(ValueError):
        mines.play(
            params={"mines": 0, "picks": [0]},
            server_seed=SS, client_seed=CS, nonce=1, edge=1.0,
        )
    with pytest.raises(ValueError):
        mines.play(
            params={"mines": 3, "picks": [0, 0]},
            server_seed=SS, client_seed=CS, nonce=1, edge=1.0,
        )


def test_roulette_pocket_in_range() -> None:
    for n in range(1, 200):
        r = roulette.play(
            params={"bet_type": "red"},
            server_seed=SS, client_seed=CS, nonce=n, edge=2.7,
        )
        assert 0 <= r["pocket"] <= 36


def test_roulette_red_bet_zero_loses() -> None:
    n = 0
    losses_on_zero = 0
    total_zero = 0
    for nonce in range(1, 5000):
        r = roulette.play(
            params={"bet_type": "red"},
            server_seed=SS, client_seed=CS, nonce=nonce, edge=2.7,
        )
        if r["pocket"] == 0:
            total_zero += 1
            if not r["win"]:
                losses_on_zero += 1
    assert total_zero > 0
    assert losses_on_zero == total_zero


def test_slots_reels_consistent() -> None:
    a = slots.play(params={}, server_seed=SS, client_seed=CS, nonce=7, edge=4.0)
    b = slots.play(params={}, server_seed=SS, client_seed=CS, nonce=7, edge=4.0)
    assert a["reels"] == b["reels"]


def test_plinko_rtp_close_to_target() -> None:
    for risk in ("low", "medium", "high"):
        for rows in plinko.ROW_OPTIONS:
            rtp = plinko.expected_rtp(risk, rows, 1.0)
            assert 0.90 < rtp < 1.05, f"{risk}/{rows}: {rtp}"


def test_limbo_target_must_be_reached_by_crash() -> None:
    r = limbo.play(
        params={"target": 1.5}, server_seed=SS, client_seed=CS, nonce=3, edge=1.0
    )
    if r["win"]:
        assert r["crash"] >= r["target"]
    else:
        assert r["crash"] < r["target"]


def test_crash_uses_limbo_target() -> None:
    r = crash.play(
        params={"auto_cashout": 2.0},
        server_seed=SS, client_seed=CS, nonce=3, edge=1.0,
    )
    assert r["auto_cashout"] == 2.0
    assert isinstance(r["crash"], float)


def test_hilo_higher_chance() -> None:
    r = hilo.play(
        params={"current": 0, "guess": "higher"},
        server_seed=SS, client_seed=CS, nonce=1, edge=2.0,
    )
    if r["win"]:
        assert r["next_card"] > 0


def test_wheel_distribution_makes_sense() -> None:
    counts = [0] * len(wheel.TABLE)
    for nonce in range(1, 4000):
        r = wheel.play(params={}, server_seed=SS, client_seed=CS, nonce=nonce, edge=4.0)
        counts[r["segment"]] += 1
    # No segment should dominate (>20% with uniform 5%).
    s = sum(counts)
    assert max(counts) / s < 0.2


def test_max_target_dice() -> None:
    with pytest.raises(ValueError):
        dice.play(
            params={"target": 100, "direction": "under"},
            server_seed=SS, client_seed=CS, nonce=1, edge=1.0,
        )


def test_provably_fair_self_check() -> None:
    """A user can independently verify any past bet by reproducing the HMAC."""
    from app.rng import take_uint32

    [n1] = take_uint32(SS, CS, 99, 1)
    r = dice.play(
        params={"target": 50, "direction": "under"},
        server_seed=SS, client_seed=CS, nonce=99, edge=1.0,
    )
    expected_roll = round((n1 / 0x1_0000_0000) * 100.0, 2)
    assert math.isclose(r["roll"], expected_roll, abs_tol=1e-9)
