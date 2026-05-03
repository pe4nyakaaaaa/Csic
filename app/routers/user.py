"""User profile, balance, history, settings."""

from __future__ import annotations

from datetime import UTC

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..deps import current_user, db_session
from ..models import Bet, Transaction, User
from ..services.vip import level_for_xp

router = APIRouter(prefix="/user", tags=["user"])


class UserMeOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    photo_url: str | None
    balance: float
    bonus_balance: float
    referral_balance: float
    referral_earned: float
    wager_progress: float
    wager_required: float
    total_wagered: float
    total_won: float
    total_deposited: float
    total_withdrawn: float
    xp: float
    vip_level: int
    vip_name: str
    vip_progress: float
    vip_next_threshold: float | None
    ref_code: str
    welcome_bonus_claimed: bool
    server_seed_hash: str
    client_seed: str
    nonce: int
    currency: str


@router.get("/me", response_model=UserMeOut)
async def me(user: User = Depends(current_user)) -> UserMeOut:
    lvl, lvl_name, lvl_threshold, lvl_next = level_for_xp(user.xp)
    progress = user.xp - lvl_threshold
    import hashlib

    return UserMeOut(
        id=user.id,
        tg_id=user.tg_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        photo_url=user.photo_url,
        balance=round(user.balance, 4),
        bonus_balance=round(user.bonus_balance, 4),
        referral_balance=round(user.referral_balance, 4),
        referral_earned=round(user.referral_earned, 4),
        wager_progress=round(user.wager_progress, 4),
        wager_required=round(user.wager_required, 4),
        total_wagered=round(user.total_wagered, 2),
        total_won=round(user.total_won, 2),
        total_deposited=round(user.total_deposited, 2),
        total_withdrawn=round(user.total_withdrawn, 2),
        xp=round(user.xp, 2),
        vip_level=lvl,
        vip_name=lvl_name,
        vip_progress=round(progress, 2),
        vip_next_threshold=lvl_next,
        ref_code=user.ref_code,
        welcome_bonus_claimed=user.welcome_bonus_claimed,
        server_seed_hash=hashlib.sha256(user.server_seed.encode()).hexdigest(),
        client_seed=user.client_seed,
        nonce=user.nonce,
        currency=settings.currency_code,
    )


class TransactionOut(BaseModel):
    id: int
    type: str
    status: str
    amount: float
    balance_after: float
    note: str | None
    created_at: str


@router.get("/transactions", response_model=list[TransactionOut])
async def transactions(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    limit: int = Query(50, ge=1, le=200),
) -> list[TransactionOut]:
    res = await session.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(desc(Transaction.created_at))
        .limit(limit)
    )
    out = []
    for t in res.scalars():
        out.append(
            TransactionOut(
                id=t.id,
                type=t.type.value,
                status=t.status.value,
                amount=t.amount,
                balance_after=t.balance_after,
                note=t.note,
                created_at=t.created_at.isoformat(),
            )
        )
    return out


class BetOut(BaseModel):
    id: int
    game: str
    bet_amount: float
    payout: float
    multiplier: float
    win: bool
    server_seed_hash: str
    server_seed: str | None
    client_seed: str
    nonce: int
    params: dict | None
    result: dict | None
    created_at: str


@router.get("/bets", response_model=list[BetOut])
async def bets(
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    limit: int = Query(50, ge=1, le=200),
) -> list[BetOut]:
    res = await session.execute(
        select(Bet).where(Bet.user_id == user.id).order_by(desc(Bet.created_at)).limit(limit)
    )
    out = []
    for b in res.scalars():
        out.append(
            BetOut(
                id=b.id,
                game=b.game,
                bet_amount=b.bet_amount,
                payout=b.payout,
                multiplier=b.multiplier,
                win=b.win,
                server_seed_hash=b.server_seed_hash,
                server_seed=b.server_seed,
                client_seed=b.client_seed,
                nonce=b.nonce,
                params=b.params,
                result=b.result,
                created_at=b.created_at.isoformat(),
            )
        )
    return out


class RotateSeedsRequest(BaseModel):
    client_seed: str | None = None


class RotateSeedsResponse(BaseModel):
    revealed_server_seed: str
    new_server_seed_hash: str
    client_seed: str
    nonce: int


@router.post("/seeds/rotate", response_model=RotateSeedsResponse)
async def rotate_seeds(
    body: RotateSeedsRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> RotateSeedsResponse:
    """Reveal current server seed and rotate to the next one. Optionally
    set a new client seed."""
    from ..models import gen_seed

    revealed = user.server_seed
    user.server_seed = user.next_server_seed
    user.next_server_seed = gen_seed()
    user.nonce = 0
    user.server_seed_revealed = False

    if body.client_seed:
        cs = body.client_seed.strip()[:64]
        if cs:
            user.client_seed = cs

    await session.commit()
    import hashlib

    return RotateSeedsResponse(
        revealed_server_seed=revealed,
        new_server_seed_hash=hashlib.sha256(user.server_seed.encode()).hexdigest(),
        client_seed=user.client_seed,
        nonce=user.nonce,
    )


class SelfExcludeRequest(BaseModel):
    days: int


@router.post("/self-exclude")
async def self_exclude(
    body: SelfExcludeRequest,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> dict:
    if body.days <= 0 or body.days > 365 * 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid days")
    from datetime import datetime, timedelta

    until = datetime.now(UTC) + timedelta(days=body.days)
    user.self_excluded_until = until
    await session.commit()
    return {"self_excluded_until": until.isoformat()}
