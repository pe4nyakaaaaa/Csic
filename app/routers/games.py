"""Game endpoints — all run server-side, fully provably-fair.

Single endpoint ``POST /games/{game}/play`` accepts:
  - ``bet`` (float, in casino coins)
  - ``params`` (game-specific dict)
  - ``client_seed`` (optional override)

Returns the deterministic outcome plus updated balance.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..deps import current_user, db_session
from ..games import GAMES
from ..models import Bet, TxnType, User, gen_seed
from ..rng import hash_seed
from ..services.balance import credit, debit, update_wagering
from ..services.referrals import credit_referral
from ..services.vip import level_for_xp

router = APIRouter(prefix="/games", tags=["games"])


class PlayRequest(BaseModel):
    bet: float
    params: dict = {}
    client_seed: str | None = None


class PlayResponse(BaseModel):
    bet_id: int
    game: str
    bet: float
    payout: float
    multiplier: float
    win: bool
    server_seed_hash: str
    client_seed: str
    nonce: int
    result: dict
    balance: float
    bonus_balance: float
    wager_progress: float
    wager_required: float


@router.get("/list")
async def list_games() -> dict:
    return {
        "games": sorted(GAMES.keys()),
        "house_edge": {g: settings.house_edge(g) for g in GAMES},
        "min_bet": settings.min_bet,
        "max_bet": settings.max_bet,
        "max_win": settings.max_win,
        "currency": settings.currency_code,
    }


@router.post("/{game}/play", response_model=PlayResponse)
async def play(
    game: str,
    body: PlayRequest = Body(...),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PlayResponse:
    if game not in GAMES:
        raise HTTPException(status_code=404, detail="unknown game")
    if user.self_excluded_until:
        ex = user.self_excluded_until
        if ex.tzinfo is None:
            ex = ex.replace(tzinfo=UTC)
        if ex > datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="account is self-excluded"
            )

    bet = float(body.bet)
    if bet < settings.min_bet:
        raise HTTPException(status_code=400, detail=f"bet < min ({settings.min_bet})")
    if bet > settings.max_bet:
        raise HTTPException(status_code=400, detail=f"bet > max ({settings.max_bet})")

    available = user.balance + user.bonus_balance
    if bet > available + 1e-9:
        raise HTTPException(status_code=400, detail="insufficient funds")

    # Optionally update client_seed
    if body.client_seed:
        cs = body.client_seed.strip()[:64]
        if cs and cs != user.client_seed:
            user.client_seed = cs

    if not user.server_seed:
        user.server_seed = gen_seed()
    if not user.next_server_seed:
        user.next_server_seed = gen_seed()

    server_seed = user.server_seed
    server_seed_hash = hash_seed(server_seed)
    client_seed = user.client_seed
    nonce = user.nonce + 1

    edge = settings.house_edge(game)
    module = GAMES[game]

    try:
        result = module.play(
            params=body.params,
            server_seed=server_seed,
            client_seed=client_seed,
            nonce=nonce,
            edge=edge,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    multiplier = float(result.get("multiplier", 0.0))
    win_flag = bool(result.get("win", multiplier > 0))
    payout = round(bet * multiplier, 4) if multiplier > 0 else 0.0
    payout = min(payout, settings.max_win)

    # Debit bet, then credit win.
    await debit(
        session, user, bet, TxnType.BET, note=game, meta={"params": body.params}
    )
    if payout > 0:
        await credit(
            session, user, payout, TxnType.WIN, note=game, meta={"multiplier": multiplier}
        )

    # Update lifetime stats and XP.
    user.total_wagered += bet
    user.total_won += payout
    user.xp += bet  # 1 wagered coin = 1 XP

    # Update VIP level
    lvl, _, _, _ = level_for_xp(user.xp)
    user.vip_level = lvl

    # Wagering for bonus.
    update_wagering(user, bet)

    user.nonce = nonce

    # Persist bet record.
    bet_row = Bet(
        user_id=user.id,
        game=game,
        bet_amount=bet,
        payout=payout,
        multiplier=multiplier,
        win=win_flag,
        server_seed_hash=server_seed_hash,
        server_seed=None,  # filled in upon seed reveal
        client_seed=client_seed,
        nonce=nonce,
        params=body.params,
        result=result,
    )
    session.add(bet_row)
    await session.flush()

    # Referral commission.
    await credit_referral(session, user, bet_row, bet)

    await session.commit()

    return PlayResponse(
        bet_id=bet_row.id,
        game=game,
        bet=bet,
        payout=payout,
        multiplier=multiplier,
        win=win_flag,
        server_seed_hash=server_seed_hash,
        client_seed=client_seed,
        nonce=nonce,
        result=result,
        balance=round(user.balance, 4),
        bonus_balance=round(user.bonus_balance, 4),
        wager_progress=round(user.wager_progress, 4),
        wager_required=round(user.wager_required, 4),
    )
