"""ORM models for Aurora Casino."""

from __future__ import annotations

import enum
import secrets
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


def gen_ref_code() -> str:
    return secrets.token_urlsafe(6).replace("_", "").replace("-", "")[:8].upper()


def gen_seed() -> str:
    return secrets.token_hex(32)


class TxnType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    BET = "bet"
    WIN = "win"
    BONUS = "bonus"
    REFERRAL = "referral"
    CASHBACK = "cashback"
    ADJUST = "adjust"


class TxnStatus(str, enum.Enum):
    PENDING = "pending"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BonusType(str, enum.Enum):
    WELCOME = "welcome"
    DAILY = "daily"
    DEPOSIT = "deposit"
    CASHBACK = "cashback"
    REFERRAL = "referral"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64))
    first_name: Mapped[str | None] = mapped_column(String(64))
    last_name: Mapped[str | None] = mapped_column(String(64))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    language_code: Mapped[str | None] = mapped_column(String(8))

    # Real (withdrawable) balance and bonus balance kept separately.
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bonus_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Wagering progress (cumulative wager since current bonus was credited).
    wager_progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    wager_required: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Lifetime stats
    total_wagered: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_won: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_deposited: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_withdrawn: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # VIP / level
    xp: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    vip_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Referral
    ref_code: Mapped[str] = mapped_column(String(16), unique=True, default=gen_ref_code, index=True)
    referred_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    referral_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    referral_earned: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Bonus claim flags / timers
    welcome_bonus_claimed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_daily_bonus_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_cashback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Provably-fair active seeds
    server_seed: Mapped[str] = mapped_column(String(64), default=gen_seed, nullable=False)
    server_seed_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    next_server_seed: Mapped[str] = mapped_column(String(64), default=gen_seed, nullable=False)
    client_seed: Mapped[str] = mapped_column(String(64), default=gen_seed, nullable=False)
    nonce: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Self-exclusion / responsible gambling
    self_excluded_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    daily_loss_limit: Mapped[float | None] = mapped_column(Float)

    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    transactions: Mapped[list[Transaction]] = relationship(back_populates="user")
    bets: Mapped[list[Bet]] = relationship(back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[TxnType] = mapped_column(Enum(TxnType), index=True)
    status: Mapped[TxnStatus] = mapped_column(Enum(TxnStatus), default=TxnStatus.DONE)
    amount: Mapped[float] = mapped_column(Float)
    balance_after: Mapped[float] = mapped_column(Float, default=0.0)
    bonus_after: Mapped[float] = mapped_column(Float, default=0.0)
    note: Mapped[str | None] = mapped_column(String(255))
    meta: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    user: Mapped[User] = relationship(back_populates="transactions")


class Bet(Base):
    __tablename__ = "bets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String(32), index=True)
    bet_amount: Mapped[float] = mapped_column(Float)
    payout: Mapped[float] = mapped_column(Float, default=0.0)
    multiplier: Mapped[float] = mapped_column(Float, default=0.0)
    win: Mapped[bool] = mapped_column(Boolean, default=False)

    # Provably fair
    server_seed_hash: Mapped[str] = mapped_column(String(64))
    server_seed: Mapped[str | None] = mapped_column(String(64))  # filled on reveal/rotation
    client_seed: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[int] = mapped_column(Integer)

    params: Mapped[dict | None] = mapped_column(JSON)   # bet parameters
    result: Mapped[dict | None] = mapped_column(JSON)   # full game result
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    user: Mapped[User] = relationship(back_populates="bets")


class BonusClaim(Base):
    __tablename__ = "bonus_claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[BonusType] = mapped_column(Enum(BonusType))
    amount: Mapped[float] = mapped_column(Float)
    wager_required: Mapped[float] = mapped_column(Float, default=0.0)
    note: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class Deposit(Base):
    __tablename__ = "deposits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="rukassa")
    provider_order_id: Mapped[str | None] = mapped_column(String(64), index=True)
    amount_rub: Mapped[float] = mapped_column(Float)
    amount_coins: Mapped[float] = mapped_column(Float)
    method: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[TxnStatus] = mapped_column(Enum(TxnStatus), default=TxnStatus.PENDING)
    pay_url: Mapped[str | None] = mapped_column(String(512))
    raw: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="rukassa")
    provider_payout_id: Mapped[str | None] = mapped_column(String(64), index=True)
    amount_rub: Mapped[float] = mapped_column(Float)
    amount_coins: Mapped[float] = mapped_column(Float)
    method: Mapped[str | None] = mapped_column(String(32))
    wallet: Mapped[str] = mapped_column(String(255))
    status: Mapped[TxnStatus] = mapped_column(Enum(TxnStatus), default=TxnStatus.PENDING)
    raw: Mapped[dict | None] = mapped_column(JSON)
    review_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class ReferralEarning(Base):
    __tablename__ = "referral_earnings"
    __table_args__ = (UniqueConstraint("bet_id", name="uq_ref_earn_bet"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referrer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    referee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    bet_id: Mapped[int] = mapped_column(ForeignKey("bets.id"))
    amount: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class CrashRound(Base):
    """Optional shared multiplayer Crash round (for live feed). Single-player
    Crash uses provably-fair via Bet model; this is for global rounds."""

    __tablename__ = "crash_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    server_seed: Mapped[str] = mapped_column(String(64))
    server_seed_hash: Mapped[str] = mapped_column(String(64))
    crash_at: Mapped[float] = mapped_column(Float)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
