"""Welcome / daily / cashback bonus logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import BonusClaim, BonusType, Transaction, TxnType, User
from .balance import credit


async def grant_welcome_bonus(
    session: AsyncSession, user: User, deposit_amount: float
) -> float:
    """Apply welcome-bonus to the user's first deposit. Returns granted amount."""
    if user.welcome_bonus_claimed or settings.welcome_bonus_pct <= 0:
        return 0.0
    bonus = deposit_amount * settings.welcome_bonus_pct / 100.0
    if settings.welcome_bonus_max > 0:
        bonus = min(bonus, settings.welcome_bonus_max)
    if bonus <= 0:
        return 0.0
    await credit(
        session,
        user,
        bonus,
        TxnType.BONUS,
        note="welcome bonus",
        to_bonus=True,
    )
    user.welcome_bonus_claimed = True
    user.wager_required += bonus * settings.bonus_wager_x
    session.add(BonusClaim(user_id=user.id, type=BonusType.WELCOME, amount=bonus))
    return bonus


async def claim_daily_bonus(session: AsyncSession, user: User) -> float:
    now = datetime.now(UTC)
    if user.last_daily_bonus_at:
        last = user.last_daily_bonus_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=UTC)
        if now - last < timedelta(hours=24):
            raise ValueError("daily bonus already claimed; come back later")
    amount = settings.daily_bonus_amount
    if amount <= 0:
        raise ValueError("daily bonus is disabled")
    await credit(
        session, user, amount, TxnType.BONUS, note="daily bonus", to_bonus=True
    )
    user.last_daily_bonus_at = now
    user.wager_required += amount * settings.bonus_wager_x
    session.add(BonusClaim(user_id=user.id, type=BonusType.DAILY, amount=amount))
    return amount


async def claim_weekly_cashback(session: AsyncSession, user: User) -> float:
    now = datetime.now(UTC)
    if user.last_cashback_at:
        last = user.last_cashback_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=UTC)
        if now - last < timedelta(days=7):
            raise ValueError("cashback can be claimed once per 7 days")
    week_ago = now - timedelta(days=7)
    # Compute net loss in last 7 days from transactions.
    res = await session.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .where(Transaction.created_at >= week_ago)
        .where(Transaction.type.in_([TxnType.BET, TxnType.WIN]))
    )
    txns = list(res.scalars())
    bet_total = -sum(t.amount for t in txns if t.type == TxnType.BET)
    win_total = sum(t.amount for t in txns if t.type == TxnType.WIN)
    net_loss = bet_total - win_total
    if net_loss <= 0:
        raise ValueError("no eligible losses in the last 7 days")
    amount = round(net_loss * settings.cashback_pct / 100.0, 2)
    if amount <= 0:
        raise ValueError("cashback amount too small")
    await credit(
        session, user, amount, TxnType.CASHBACK, note="weekly cashback", to_bonus=False
    )
    user.last_cashback_at = now
    session.add(BonusClaim(user_id=user.id, type=BonusType.CASHBACK, amount=amount))
    return amount
