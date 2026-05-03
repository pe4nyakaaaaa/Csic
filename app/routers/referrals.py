"""Referral endpoints — info, transfer earnings to balance, list referees."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..deps import current_user, db_session
from ..models import ReferralEarning, Transaction, TxnType, User

router = APIRouter(prefix="/referrals", tags=["referrals"])


class ReferralInfo(BaseModel):
    ref_code: str
    ref_link: str
    referral_balance: float
    referral_earned: float
    pct: float
    referees_count: int


@router.get("/info", response_model=ReferralInfo)
async def info(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> ReferralInfo:
    res = await session.execute(
        select(func.count(User.id)).where(User.referred_by_id == user.id)
    )
    count = res.scalar_one()
    return ReferralInfo(
        ref_code=user.ref_code,
        ref_link=f"{settings.public_base_url}/?ref={user.ref_code}",
        referral_balance=round(user.referral_balance, 4),
        referral_earned=round(user.referral_earned, 4),
        pct=settings.referral_pct,
        referees_count=int(count),
    )


class ReferralRow(BaseModel):
    id: int
    bet_id: int
    referee_id: int
    amount: float
    created_at: str


@router.get("/earnings", response_model=list[ReferralRow])
async def earnings(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> list[ReferralRow]:
    res = await session.execute(
        select(ReferralEarning)
        .where(ReferralEarning.referrer_id == user.id)
        .order_by(ReferralEarning.created_at.desc())
        .limit(100)
    )
    return [
        ReferralRow(
            id=r.id,
            bet_id=r.bet_id,
            referee_id=r.referee_id,
            amount=r.amount,
            created_at=r.created_at.isoformat(),
        )
        for r in res.scalars()
    ]


class ClaimResponse(BaseModel):
    transferred: float
    balance: float


@router.post("/claim", response_model=ClaimResponse)
async def claim(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> ClaimResponse:
    amount = round(user.referral_balance, 4)
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="referral balance is empty"
        )
    user.referral_balance = 0.0
    user.balance += amount
    session.add(
        Transaction(
            user_id=user.id,
            type=TxnType.REFERRAL,
            amount=amount,
            balance_after=user.balance,
            bonus_after=user.bonus_balance,
            note="referral claim to balance",
        )
    )
    await session.commit()
    return ClaimResponse(transferred=amount, balance=round(user.balance, 4))
