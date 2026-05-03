"""Bonus endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_user, db_session
from ..models import User
from ..services.bonuses import claim_daily_bonus, claim_weekly_cashback

router = APIRouter(prefix="/bonuses", tags=["bonuses"])


class BonusOut(BaseModel):
    type: str
    amount: float


@router.post("/daily", response_model=BonusOut)
async def daily(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> BonusOut:
    try:
        amount = await claim_daily_bonus(session, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await session.commit()
    return BonusOut(type="daily", amount=amount)


@router.post("/cashback", response_model=BonusOut)
async def cashback(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> BonusOut:
    try:
        amount = await claim_weekly_cashback(session, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await session.commit()
    return BonusOut(type="cashback", amount=amount)
