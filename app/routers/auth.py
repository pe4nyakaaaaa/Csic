"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import InvalidInitData, issue_jwt, verify_init_data
from ..deps import db_session
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramAuthRequest(BaseModel):
    init_data: str
    ref: str | None = None


class TelegramAuthResponse(BaseModel):
    token: str
    user: dict


@router.post("/telegram", response_model=TelegramAuthResponse)
async def telegram_auth(
    payload: TelegramAuthRequest = Body(...),
    session: AsyncSession = Depends(db_session),
) -> TelegramAuthResponse:
    try:
        parsed = verify_init_data(payload.init_data)
    except InvalidInitData as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"invalid init_data: {exc}"
        ) from exc

    tg_user = parsed["user"]
    tg_id = int(tg_user["id"])

    res = await session.execute(select(User).where(User.tg_id == tg_id))
    user = res.scalar_one_or_none()

    if user is None:
        ref_code = (payload.ref or parsed.get("start_param") or "").strip().upper() or None
        referrer = None
        if ref_code:
            r = await session.execute(select(User).where(User.ref_code == ref_code))
            referrer = r.scalar_one_or_none()
        user = User(
            tg_id=tg_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
            last_name=tg_user.get("last_name"),
            photo_url=tg_user.get("photo_url"),
            language_code=tg_user.get("language_code"),
            referred_by_id=referrer.id if (referrer and referrer.tg_id != tg_id) else None,
        )
        session.add(user)
        await session.flush()
    else:
        # Refresh basic profile fields on re-auth.
        user.username = tg_user.get("username") or user.username
        user.first_name = tg_user.get("first_name") or user.first_name
        user.last_name = tg_user.get("last_name") or user.last_name
        user.photo_url = tg_user.get("photo_url") or user.photo_url
        user.language_code = tg_user.get("language_code") or user.language_code

    await session.commit()
    token = issue_jwt(user.id)
    return TelegramAuthResponse(
        token=token,
        user={
            "id": user.id,
            "tg_id": user.tg_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "balance": user.balance,
            "bonus_balance": user.bonus_balance,
            "ref_code": user.ref_code,
        },
    )
