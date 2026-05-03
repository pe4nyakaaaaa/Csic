"""Aiogram 3 Telegram bot — main entry point.

Run with:  ``python -m app.bot.main``

The bot's job is small: greet new users (with referral capture),
provide a button that opens the Mini App, and broadcast notifications.
The casino UX itself is entirely inside the WebApp.
"""

from __future__ import annotations

import asyncio
import logging
import re

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from ..config import settings

logger = logging.getLogger("aurora.bot")
logging.basicConfig(level=logging.INFO)


def _menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎰 Открыть Aurora Casino",
                    web_app=WebAppInfo(url=settings.webapp_url),
                )
            ],
            [
                InlineKeyboardButton(text="ℹ️ О казино", callback_data="about"),
                InlineKeyboardButton(text="🎁 Бонусы", callback_data="bonuses"),
            ],
            [
                InlineKeyboardButton(text="🤝 Реферальная программа", callback_data="ref"),
            ],
            [
                InlineKeyboardButton(text="🛡 Ответственная игра", callback_data="responsible"),
            ],
        ]
    )


WELCOME = (
    "<b>🌌 Aurora Casino</b>\n"
    "Mini-app казино с честным provably-fair RNG.\n\n"
    "🎮 10+ игр: Crash, Mines, Dice, Slots, Roulette, Plinko, Coinflip, Hi-Lo, Limbo, Wheel\n"
    "🎁 Welcome-бонус +100% на первый депозит\n"
    "🤝 Реферальная программа\n"
    "💎 VIP-уровни и кэшбэк\n\n"
    "Нажмите кнопку, чтобы открыть казино:"
)


async def start_handler(message: Message) -> None:
    args = ""
    if message.text:
        m = re.match(r"^/start(?:@\S+)?(?:\s+(.+))?", message.text)
        if m and m.group(1):
            args = m.group(1).strip()
    # If start arg looks like a referral code, deep-link the WebApp with it.
    url = settings.webapp_url
    if args and re.fullmatch(r"[A-Z0-9]{4,12}", args.upper()):
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}ref={args.upper()}"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎰 Открыть Aurora Casino",
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )
    await message.answer(WELCOME, reply_markup=kb)


async def menu_handler(message: Message) -> None:
    await message.answer("Выберите раздел:", reply_markup=_menu_kb())


async def help_handler(message: Message) -> None:
    await message.answer(
        "Команды:\n"
        "/start — открыть казино\n"
        "/menu — меню\n"
        "/help — эта справка\n"
        "/responsible — ответственная игра"
    )


async def responsible_handler(message: Message) -> None:
    await message.answer(
        "<b>🛡 Ответственная игра</b>\n\n"
        "Помните, что азартные игры — это развлечение, а не способ заработка.\n"
        "На длинной дистанции у казино есть математическое преимущество.\n\n"
        "В Mini App в разделе «Профиль» вы можете:\n"
        "• установить дневной лимит проигрыша,\n"
        "• включить самоисключение на 1 / 7 / 30 дней,\n"
        "• получить помощь и контакты профильных служб."
    )


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.message.register(start_handler, CommandStart())
    dp.message.register(menu_handler, Command("menu"))
    dp.message.register(help_handler, Command("help"))
    dp.message.register(responsible_handler, Command("responsible"))

    @dp.message(F.web_app_data)
    async def _wa_data(msg: Message) -> None:  # pragma: no cover - relays only
        await msg.answer("Получено сообщение из Mini App.")

    return dp


async def main() -> None:
    if not settings.bot_token:
        raise SystemExit("BOT_TOKEN is not set; please configure .env")
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = build_dispatcher()
    logger.info("Aurora Casino bot starting; webapp=%s", settings.webapp_url)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
