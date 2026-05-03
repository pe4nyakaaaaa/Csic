"""Application settings loaded from environment / .env file."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Telegram ----
    bot_token: str = Field("", alias="BOT_TOKEN")
    webapp_url: str = Field("https://example.com", alias="WEBAPP_URL")
    admin_ids: str = Field("", alias="ADMIN_IDS")

    # ---- Server ----
    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8000, alias="PORT")
    public_base_url: str = Field("https://example.com", alias="PUBLIC_BASE_URL")
    jwt_secret: str = Field("change-me", alias="JWT_SECRET")
    jwt_ttl_seconds: int = Field(86400, alias="JWT_TTL_SECONDS")
    cors_origins: str = Field("*", alias="CORS_ORIGINS")

    # ---- DB ----
    database_url: str = Field(
        "sqlite+aiosqlite:///./data/aurora.db", alias="DATABASE_URL"
    )

    # ---- Economy ----
    currency_code: str = Field("AC", alias="CURRENCY_CODE")
    currency_name: str = Field("Aurora Coins", alias="CURRENCY_NAME")
    welcome_bonus_pct: float = Field(100.0, alias="WELCOME_BONUS_PCT")
    welcome_bonus_max: float = Field(10000.0, alias="WELCOME_BONUS_MAX")
    daily_bonus_amount: float = Field(50.0, alias="DAILY_BONUS_AMOUNT")
    cashback_pct: float = Field(10.0, alias="CASHBACK_PCT")
    bonus_wager_x: float = Field(30.0, alias="BONUS_WAGER_X")
    min_bet: float = Field(10.0, alias="MIN_BET")
    max_bet: float = Field(100_000.0, alias="MAX_BET")
    max_win: float = Field(1_000_000.0, alias="MAX_WIN")

    # ---- House edge per game ----
    house_edge_dice: float = Field(1.0, alias="HOUSE_EDGE_DICE")
    house_edge_crash: float = Field(1.0, alias="HOUSE_EDGE_CRASH")
    house_edge_mines: float = Field(1.0, alias="HOUSE_EDGE_MINES")
    house_edge_coinflip: float = Field(2.0, alias="HOUSE_EDGE_COINFLIP")
    house_edge_slots: float = Field(4.0, alias="HOUSE_EDGE_SLOTS")
    house_edge_roulette: float = Field(2.7, alias="HOUSE_EDGE_ROULETTE")
    house_edge_plinko: float = Field(1.0, alias="HOUSE_EDGE_PLINKO")
    house_edge_wheel: float = Field(4.0, alias="HOUSE_EDGE_WHEEL")
    house_edge_hilo: float = Field(2.0, alias="HOUSE_EDGE_HILO")
    house_edge_limbo: float = Field(1.0, alias="HOUSE_EDGE_LIMBO")

    # ---- Referrals ----
    referral_pct: float = Field(1.0, alias="REFERRAL_PCT")
    referral_cap: float = Field(1_000_000.0, alias="REFERRAL_CAP")

    # ---- Rukassa ----
    rukassa_shop_id: str = Field("", alias="RUKASSA_SHOP_ID")
    rukassa_token: str = Field("", alias="RUKASSA_TOKEN")
    rukassa_token_payout: str = Field("", alias="RUKASSA_TOKEN_PAYOUT")
    rukassa_webhook_secret: str = Field("", alias="RUKASSA_WEBHOOK_SECRET")
    deposit_min_rub: float = Field(100.0, alias="DEPOSIT_MIN_RUB")
    deposit_max_rub: float = Field(300_000.0, alias="DEPOSIT_MAX_RUB")
    withdraw_min_rub: float = Field(500.0, alias="WITHDRAW_MIN_RUB")
    withdraw_max_rub: float = Field(300_000.0, alias="WITHDRAW_MAX_RUB")
    coins_per_rub: float = Field(1.0, alias="COINS_PER_RUB")

    @property
    def admin_id_set(self) -> set[int]:
        return {int(x.strip()) for x in self.admin_ids.split(",") if x.strip().isdigit()}

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*" or not raw:
            return ["*"]
        return [x.strip() for x in raw.split(",") if x.strip()]

    def house_edge(self, game: str) -> float:
        return float(getattr(self, f"house_edge_{game}", 1.0))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
