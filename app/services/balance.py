"""Atomic balance/transaction helpers.

These helpers mutate ``User.balance`` / ``User.bonus_balance`` and create a
matching ``Transaction`` record in the same DB session. Caller is
responsible for committing.

Bonus money policy:
  - Bets debit ``bonus_balance`` first, then ``balance``.
  - Wins credit ``balance`` (real money) so users can withdraw winnings
    after wagering — exactly like top casinos.
  - Wager progress is incremented by the full bet amount (real + bonus)
    and once ``wager_progress >= wager_required`` the remaining bonus is
    converted to real balance.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Transaction, TxnStatus, TxnType, User


async def credit(
    session: AsyncSession,
    user: User,
    amount: float,
    txn_type: TxnType,
    *,
    note: str | None = None,
    meta: dict[str, Any] | None = None,
    to_bonus: bool = False,
) -> Transaction:
    if amount <= 0:
        raise ValueError("amount must be positive")
    if to_bonus:
        user.bonus_balance += amount
    else:
        user.balance += amount
    txn = Transaction(
        user_id=user.id,
        type=txn_type,
        status=TxnStatus.DONE,
        amount=amount,
        balance_after=user.balance,
        bonus_after=user.bonus_balance,
        note=note,
        meta=meta,
    )
    session.add(txn)
    return txn


async def debit(
    session: AsyncSession,
    user: User,
    amount: float,
    txn_type: TxnType,
    *,
    note: str | None = None,
    meta: dict[str, Any] | None = None,
    allow_bonus_first: bool = True,
) -> Transaction:
    if amount <= 0:
        raise ValueError("amount must be positive")
    available = user.balance + (user.bonus_balance if allow_bonus_first else 0.0)
    if amount > available + 1e-9:
        raise ValueError("insufficient funds")

    if allow_bonus_first and user.bonus_balance > 0:
        from_bonus = min(user.bonus_balance, amount)
        user.bonus_balance -= from_bonus
        remaining = amount - from_bonus
    else:
        remaining = amount
    if remaining > 0:
        user.balance -= remaining

    txn = Transaction(
        user_id=user.id,
        type=txn_type,
        status=TxnStatus.DONE,
        amount=-amount,
        balance_after=user.balance,
        bonus_after=user.bonus_balance,
        note=note,
        meta=meta,
    )
    session.add(txn)
    return txn


def update_wagering(user: User, bet_amount: float) -> None:
    """Apply wager progress; convert bonus → real when requirement is met."""
    if user.wager_required <= 0:
        return
    user.wager_progress += bet_amount
    if user.wager_progress >= user.wager_required:
        # Convert remaining bonus_balance to real balance.
        if user.bonus_balance > 0:
            user.balance += user.bonus_balance
            user.bonus_balance = 0.0
        user.wager_progress = 0.0
        user.wager_required = 0.0
