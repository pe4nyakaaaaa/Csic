"""Deposit / withdrawal via Rukassa."""

from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..deps import current_user, db_session
from ..models import Deposit, Transaction, TxnStatus, TxnType, User, Withdrawal
from ..services import payments_rukassa as rk
from ..services.balance import credit
from ..services.bonuses import grant_welcome_bonus

router = APIRouter(prefix="/payments", tags=["payments"])


class DepositRequest(BaseModel):
    amount_rub: float
    method: str | None = None


class DepositResponse(BaseModel):
    deposit_id: int
    pay_url: str
    amount_rub: float
    amount_coins: float


@router.post("/deposit", response_model=DepositResponse)
async def create_deposit(
    body: DepositRequest = Body(...),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> DepositResponse:
    amt = float(body.amount_rub)
    if amt < settings.deposit_min_rub or amt > settings.deposit_max_rub:
        raise HTTPException(
            status_code=400,
            detail=f"amount must be in [{settings.deposit_min_rub}, {settings.deposit_max_rub}]",
        )
    order_id = f"u{user.id}-{secrets.token_hex(6)}"
    coins = round(amt * settings.coins_per_rub, 4)
    inv = await rk.create_invoice(
        order_id=order_id, amount_rub=amt, user_id=user.id, method=body.method
    )
    dep = Deposit(
        user_id=user.id,
        provider_order_id=order_id,
        amount_rub=amt,
        amount_coins=coins,
        method=body.method,
        status=TxnStatus.PENDING,
        pay_url=inv["url"],
        raw=inv["raw"],
    )
    session.add(dep)
    await session.commit()
    return DepositResponse(
        deposit_id=dep.id, pay_url=inv["url"], amount_rub=amt, amount_coins=coins
    )


async def _credit_completed_deposit(
    session: AsyncSession, dep: Deposit, raw: dict[str, Any]
) -> None:
    """Mark a deposit as completed and credit user balance + welcome bonus."""
    if dep.status == TxnStatus.DONE:
        return
    user = await session.get(User, dep.user_id)
    if user is None:
        dep.status = TxnStatus.FAILED
        dep.raw = (dep.raw or {}) | {"error": "user_not_found"}
        return
    dep.status = TxnStatus.DONE
    dep.raw = (dep.raw or {}) | {"webhook": raw}
    user.total_deposited += dep.amount_rub
    await credit(
        session,
        user,
        dep.amount_coins,
        TxnType.DEPOSIT,
        note=f"deposit #{dep.id}",
        meta={"order_id": dep.provider_order_id, "amount_rub": dep.amount_rub},
    )
    if not user.welcome_bonus_claimed:
        await grant_welcome_bonus(session, user, dep.amount_coins)


@router.post("/webhook/rukassa")
async def rukassa_webhook(request: Request, session: AsyncSession = Depends(db_session)) -> dict:
    """Webhook called by Rukassa after a successful deposit."""
    form = dict((await request.form()).items())
    if not rk.verify_webhook(form):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bad signature")
    order_id = str(form.get("order_id") or form.get("merchant_order_id") or "")
    if not order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="missing order_id")
    res = await session.execute(
        select(Deposit).where(Deposit.provider_order_id == order_id)
    )
    dep = res.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="deposit not found")
    await _credit_completed_deposit(session, dep, form)
    await session.commit()
    return {"ok": True}


# --- Dev-only: simulate webhook from the local "pay" page ---
class DevConfirmRequest(BaseModel):
    order_id: str


@router.post("/dev-confirm")
async def dev_confirm(
    body: DevConfirmRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> dict:
    """Dev helper to mark a deposit as paid without going through Rukassa.

    Disabled in prod by checking that ``RUKASSA_TOKEN`` is empty (i.e. Rukassa
    is not configured). When Rukassa is configured this endpoint refuses.
    """
    if settings.rukassa_token:
        raise HTTPException(status_code=403, detail="dev-confirm disabled when Rukassa is configured")
    res = await session.execute(
        select(Deposit).where(
            Deposit.provider_order_id == body.order_id, Deposit.user_id == user.id
        )
    )
    dep = res.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="deposit not found")
    await _credit_completed_deposit(session, dep, {"dev_confirm": True})
    await session.commit()
    return {"ok": True, "balance": user.balance}


# --- Withdrawals ---


class WithdrawRequest(BaseModel):
    amount_rub: float
    method: str  # "card" / "qiwi" / "yandex" / etc.
    wallet: str


class WithdrawResponse(BaseModel):
    withdrawal_id: int
    status: str


@router.post("/withdraw", response_model=WithdrawResponse)
async def withdraw(
    body: WithdrawRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> WithdrawResponse:
    amt = float(body.amount_rub)
    if amt < settings.withdraw_min_rub or amt > settings.withdraw_max_rub:
        raise HTTPException(
            status_code=400,
            detail=f"amount must be in [{settings.withdraw_min_rub}, {settings.withdraw_max_rub}]",
        )
    coins = round(amt * settings.coins_per_rub, 4)
    if user.balance < coins - 1e-9:
        raise HTTPException(
            status_code=400, detail="insufficient real balance (bonus money cannot be withdrawn)"
        )
    if user.wager_required > user.wager_progress + 1e-9:
        raise HTTPException(
            status_code=400,
            detail=(
                f"wagering not complete: {user.wager_progress:.2f}/{user.wager_required:.2f}"
            ),
        )

    user.balance -= coins
    wd = Withdrawal(
        user_id=user.id,
        amount_rub=amt,
        amount_coins=coins,
        method=body.method,
        wallet=body.wallet[:255],
        status=TxnStatus.PENDING,
    )
    session.add(wd)
    await session.flush()

    session.add(
        Transaction(
            user_id=user.id,
            type=TxnType.WITHDRAW,
            status=TxnStatus.PENDING,
            amount=-coins,
            balance_after=user.balance,
            bonus_after=user.bonus_balance,
            note=f"withdraw #{wd.id} pending",
            meta={"method": body.method, "wallet": body.wallet[-4:]},
        )
    )

    # If Rukassa payouts are configured, fire it; otherwise stays "pending" for
    # admin review.
    if settings.rukassa_token_payout:
        try:
            res = await rk.create_payout(
                amount_rub=amt, wallet=body.wallet, method=body.method
            )
            wd.provider_payout_id = (res.get("id") or "")
            wd.raw = res.get("raw")
            wd.status = TxnStatus.PENDING  # final status comes via admin/webhook
        except Exception as exc:  # pragma: no cover
            wd.status = TxnStatus.FAILED
            wd.review_note = f"payout error: {exc}"
            user.balance += coins  # refund

    await session.commit()
    return WithdrawResponse(withdrawal_id=wd.id, status=wd.status.value)
