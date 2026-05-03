"""Referral system: when referee places a bet, credit referrer's referral
balance with REFERRAL_PCT% of the bet amount, capped at REFERRAL_CAP per
referee.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Bet, ReferralEarning, Transaction, TxnType, User


async def credit_referral(
    session: AsyncSession, referee: User, bet: Bet, bet_amount: float
) -> None:
    if not referee.referred_by_id or settings.referral_pct <= 0:
        return
    referrer = await session.get(User, referee.referred_by_id)
    if not referrer or referrer.is_blocked:
        return
    amount = round(bet_amount * settings.referral_pct / 100.0, 4)
    if amount <= 0:
        return
    # Cap lifetime per referee.
    res = await session.execute(
        select(ReferralEarning).where(
            ReferralEarning.referrer_id == referrer.id,
            ReferralEarning.referee_id == referee.id,
        )
    )
    existing = list(res.scalars())
    paid = sum(e.amount for e in existing)
    cap = settings.referral_cap
    if cap > 0 and paid + amount > cap:
        amount = max(0.0, cap - paid)
    if amount <= 0:
        return

    referrer.referral_balance += amount
    referrer.referral_earned += amount
    session.add(
        ReferralEarning(
            referrer_id=referrer.id,
            referee_id=referee.id,
            bet_id=bet.id,
            amount=amount,
        )
    )
    # Track as referral txn but do not change main balance — referral_balance is
    # a separate pot; user explicitly converts it via transfer endpoint.
    session.add(
        Transaction(
            user_id=referrer.id,
            type=TxnType.REFERRAL,
            amount=amount,
            balance_after=referrer.balance,
            bonus_after=referrer.bonus_balance,
            note=f"referral from user {referee.id}",
            meta={"bet_id": bet.id, "referee_id": referee.id},
        )
    )
