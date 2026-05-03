"""Provably-fair RNG primitives.

Outcomes are derived deterministically from
``HMAC-SHA512(server_seed, f"{client_seed}:{nonce}:{cursor}")``. After the
server reveals ``server_seed`` users (or any third party) can verify any past
bet by recomputing the same HMAC.

This is the same scheme used by Stake/BCgame/Roobet etc. — outcomes depend
ONLY on (server_seed, client_seed, nonce). They do NOT depend on the user's
balance, account age, lucky/unlucky flag, or any other server-side
manipulation. The casino's edge comes from the math of each game (RTP), not
from rigging.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from collections.abc import Iterator


def random_seed(length_bytes: int = 32) -> str:
    return secrets.token_hex(length_bytes)


def hash_seed(seed: str) -> str:
    return hashlib.sha256(seed.encode("ascii")).hexdigest()


def hmac_bytes(server_seed: str, client_seed: str, nonce: int, cursor: int = 0) -> bytes:
    """Generate the deterministic HMAC bytes for one rolling cursor.

    Multiple chunks of 64 bytes can be obtained by incrementing ``cursor``.
    """
    msg = f"{client_seed}:{nonce}:{cursor}".encode("ascii")
    return hmac.new(server_seed.encode("ascii"), msg, hashlib.sha512).digest()


def floats_iter(server_seed: str, client_seed: str, nonce: int) -> Iterator[float]:
    """Infinite iterator of provably-fair floats in [0, 1)."""
    cursor = 0
    while True:
        b = hmac_bytes(server_seed, client_seed, nonce, cursor)
        # Each 4-byte chunk -> one float. SHA-512 gives 64 bytes -> 16 floats per chunk.
        for i in range(0, len(b), 4):
            chunk = b[i : i + 4]
            if len(chunk) < 4:
                break
            n = int.from_bytes(chunk, "big")
            yield n / 0x1_0000_0000  # 2**32
        cursor += 1


def take_floats(server_seed: str, client_seed: str, nonce: int, count: int) -> list[float]:
    it = floats_iter(server_seed, client_seed, nonce)
    return [next(it) for _ in range(count)]


def take_uint32(
    server_seed: str, client_seed: str, nonce: int, count: int
) -> list[int]:
    out: list[int] = []
    cursor = 0
    while len(out) < count:
        b = hmac_bytes(server_seed, client_seed, nonce, cursor)
        for i in range(0, len(b), 4):
            chunk = b[i : i + 4]
            if len(chunk) < 4:
                break
            out.append(int.from_bytes(chunk, "big"))
            if len(out) >= count:
                break
        cursor += 1
    return out


def shuffle_indices(
    server_seed: str, client_seed: str, nonce: int, n: int
) -> list[int]:
    """Provably-fair Fisher-Yates shuffle of ``[0, n)`` indices.

    Used for Mines (which 25 cells are mines), Plinko paths, etc.
    """
    arr = list(range(n))
    floats = floats_iter(server_seed, client_seed, nonce)
    for i in range(n - 1, 0, -1):
        j = int(next(floats) * (i + 1))
        if j > i:
            j = i
        arr[i], arr[j] = arr[j], arr[i]
    return arr
