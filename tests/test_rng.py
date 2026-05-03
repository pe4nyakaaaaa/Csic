"""Provably-fair RNG tests."""

from __future__ import annotations

from app.rng import (
    floats_iter,
    hash_seed,
    hmac_bytes,
    shuffle_indices,
    take_floats,
    take_uint32,
)


def test_hash_seed_is_hex_64() -> None:
    h = hash_seed("a" * 64)
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_floats_in_range_and_deterministic() -> None:
    a = take_floats("server-seed", "client-seed", 1, 100)
    b = take_floats("server-seed", "client-seed", 1, 100)
    assert a == b
    for x in a:
        assert 0.0 <= x < 1.0


def test_different_nonces_give_different_streams() -> None:
    a = take_floats("ss", "cs", 1, 32)
    b = take_floats("ss", "cs", 2, 32)
    assert a != b


def test_uint32_cardinality() -> None:
    nums = take_uint32("ss", "cs", 1, 1024)
    # Distinctness ratio should be very high for a 32-bit space.
    assert len(set(nums)) > 1000


def test_floats_iter_unbounded() -> None:
    it = floats_iter("ss", "cs", 1)
    sample = [next(it) for _ in range(2048)]
    assert all(0 <= x < 1 for x in sample)


def test_shuffle_is_permutation() -> None:
    perm = shuffle_indices("ss", "cs", 1, 25)
    assert sorted(perm) == list(range(25))


def test_hmac_bytes_length() -> None:
    b = hmac_bytes("ss", "cs", 1, 0)
    assert len(b) == 64
