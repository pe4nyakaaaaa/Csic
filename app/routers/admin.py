"""Admin endpoints — for the casino owner to inspect and manage."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_admin, db_session
from ..models import Bet, Deposit, Transaction, TxnStatus, TxnType, User, Withdrawal

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def stats(
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> dict:
    users_total = (await session.execute(select(func.count(User.id)))).scalar_one()
    bets_total = (await session.execute(select(func.count(Bet.id)))).scalar_one()
    wagered = (await session.execute(select(func.coalesce(func.sum(Bet.bet_amount), 0)))).scalar_one()
    paid_out = (await session.execute(select(func.coalesce(func.sum(Bet.payout), 0)))).scalar_one()
    deposits = (
        await session.execute(
            select(func.coalesce(func.sum(Deposit.amount_rub), 0)).where(
                Deposit.status == TxnStatus.DONE
            )
        )
    ).scalar_one()
    withdrawals = (
        await session.execute(
            select(func.coalesce(func.sum(Withdrawal.amount_rub), 0)).where(
                Withdrawal.status == TxnStatus.DONE
            )
        )
    ).scalar_one()
    actual_rtp = (paid_out / wagered * 100.0) if wagered else 0.0
    return {
        "users": int(users_total),
        "bets": int(bets_total),
        "wagered_coins": float(wagered),
        "paid_out_coins": float(paid_out),
        "actual_rtp_pct": round(actual_rtp, 4),
        "house_profit_coins": float(wagered - paid_out),
        "deposits_rub": float(deposits),
        "withdrawals_rub": float(withdrawals),
    }


class WithdrawalReviewRequest(BaseModel):
    approve: bool
    note: str | None = None


@router.post("/withdrawals/{wd_id}/review")
async def review_withdrawal(
    wd_id: int,
    body: WithdrawalReviewRequest,
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> dict:
    wd = await session.get(Withdrawal, wd_id)
    if not wd:
        raise HTTPException(status_code=404, detail="not found")
    if wd.status != TxnStatus.PENDING:
        raise HTTPException(status_code=400, detail="already processed")
    user = await session.get(User, wd.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="user gone")

    if body.approve:
        wd.status = TxnStatus.DONE
        wd.review_note = body.note
        user.total_withdrawn += wd.amount_rub
        session.add(
            Transaction(
                user_id=user.id,
                type=TxnType.WITHDRAW,
                status=TxnStatus.DONE,
                amount=-wd.amount_coins,
                balance_after=user.balance,
                bonus_after=user.bonus_balance,
                note=f"withdraw #{wd.id} approved",
            )
        )
    else:
        wd.status = TxnStatus.CANCELLED
        wd.review_note = body.note
        # Refund the coins.
        user.balance += wd.amount_coins
        session.add(
            Transaction(
                user_id=user.id,
                type=TxnType.WITHDRAW,
                status=TxnStatus.CANCELLED,
                amount=wd.amount_coins,
                balance_after=user.balance,
                bonus_after=user.bonus_balance,
                note=f"withdraw #{wd.id} cancelled",
            )
        )
    await session.commit()
    return {"ok": True, "status": wd.status.value}


@router.get("/recent-bets")
async def recent_bets(
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
    limit: int = 50,
) -> list[dict]:
    res = await session.execute(select(Bet).order_by(desc(Bet.created_at)).limit(limit))
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "game": b.game,
            "bet": b.bet_amount,
            "payout": b.payout,
            "win": b.win,
            "created_at": b.created_at.isoformat(),
        }
        for b in res.scalars()
    ]
