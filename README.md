# 🌌 Aurora Casino

**Полнофункциональное Telegram Mini App казино** с честным provably-fair RNG, 10+ играми, бонусной системой, реферальной программой и интеграцией Rukassa для платежей.

> Built как референс-имплементация: чистая math (RTP = 100% − house edge), без подкрутки исходов под игрока, прозрачная provably-fair проверка. Так работают все легальные казино.

## ✨ Что есть

- **Backend**: FastAPI + async SQLAlchemy + JWT + HMAC-SHA256 auth от Telegram
- **Bot**: aiogram 3, `/start` с deep-link реф-кодом, кнопка WebApp
- **Frontend**: Vanilla JS Mini App, тёмная неон-тема, анимированные игры на Canvas
- **10+ игр**: Crash, Mines, Dice, Slots, Roulette, Coinflip, Plinko, Wheel, Hi-Lo, Limbo
- **Бонусы**: Welcome +100% (до 10 000 AC, wagering ×30), ежедневный +50 AC, кэшбэк 10% за неделю
- **VIP**: 6 уровней (Bronze → Aurora) по wagered XP
- **Рефералка**: 1% от ставок друзей, копилка, конвертация в основной баланс
- **Платежи**: Rukassa (deposit + payout) с подписями, dev-mode без Rukassa тоже работает
- **Provably-fair**: server seed hash виден до ставки; ротация раскрывает прошлый seed
- **Ответственная игра**: самоисключение 1/7/30/90/180 дней
- **Правовые разделы**: Privacy Policy, Terms, Responsible Gambling, FAQ, Support
- **Тесты**: 37 проходят (RNG детерминизм, RTP-выборка, auth, integration: login + bet + ref)

## 🛠 Стек

- Python 3.11+, FastAPI, SQLAlchemy 2 async (aiosqlite/asyncpg), Pydantic v2, PyJWT
- aiogram 3 (Telegram Bot)
- Vanilla JS (ES modules) + Canvas (без сборки)

## 🚀 Быстрый старт (локально)

```bash
# 1) Установить зависимости
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 2) Настроить окружение
cp .env.example .env
# Отредактируйте .env (как минимум укажите BOT_TOKEN от @BotFather и WEBAPP_URL)

# 3) Запустить тесты
pytest

# 4) Запустить API (порт 8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5) В другом терминале — бота
python -m app.bot.main
```

API: http://localhost:8000/api/health
UI:  http://localhost:8000/

## 🧪 Тесты

```bash
pytest                      # все тесты
pytest tests/test_rng.py    # provably-fair RNG
pytest tests/test_games.py  # формулы каждой игры
pytest -k integration       # end-to-end через TestClient
```

## ⚙️ Конфигурация

Все параметры в `.env` (см. `.env.example`). Ключевые:

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `BOT_TOKEN` | (обязателен) | Токен от [@BotFather](https://t.me/BotFather) |
| `WEBAPP_URL` | http://localhost:8000/ | Публичный URL Mini App (нужен https:// в продакшене) |
| `JWT_SECRET` | (обязателен) | 64+ символов рандомного hex |
| `DATABASE_URL` | sqlite+aiosqlite:///./data/aurora.db | SQLite или PostgreSQL |
| `HOUSE_EDGE_DICE` | 1.0 | % преимущества казино для Dice → RTP 99% |
| `HOUSE_EDGE_*` | разный | Аналогично для всех игр |
| `WELCOME_BONUS_PCT` | 100.0 | % к первому депозиту |
| `BONUS_WAGER_X` | 30 | Кратность wagering |
| `REFERRAL_PCT` | 1.0 | % реферальных от ставок |
| `RUKASSA_SHOP_ID` | (опционально) | Shop ID из rukassa.is |
| `RUKASSA_TOKEN` | (опционально) | Deposit token |
| `RUKASSA_WEBHOOK_SECRET` | (опционально) | Секрет подписи webhooks |
| `COINS_PER_RUB` | 1.0 | Курс конвертации ₽ → AC |

## 🔐 Provably-fair: как проверить

Каждая ставка детерминирована:

```
result = HMAC-SHA512(server_seed, f"{client_seed}:{nonce}:{cursor}")
```

1. До ставки: вы видите только `sha256(server_seed)`.
2. Делаете ставку — на бэке считается результат, в БД сохраняется bet record.
3. В любой момент можно «Сменить seed» в **Profile → Provably-fair**.
4. После ротации старый `server_seed` раскрывается (показывается в `alert`-окне и в `bets` API).
5. Берёте раскрытый seed, ваш `client_seed` и `nonce` ставки → считаете HMAC сами и сверяете с историей.

Сервер физически не может подкрутить результат под игрока: исход — детерминированная функция от трёх параметров, известных в момент ставки.

## 🎮 Поддерживаемые игры

| Игра | RTP по умолчанию | Параметры |
|------|------------------|-----------|
| **Dice** | 99% | `target` (1-99), `direction` (under/over) |
| **Crash** | 99% | `auto_cashout` (≥1.01) |
| **Limbo** | 99% | `target` (≥1.01) |
| **Mines** | 99% | `mines` (1-24), `picks` ([0-24]) |
| **Coinflip** | 98% | `side` (heads/tails) |
| **Slots** | ~96% | без параметров |
| **Roulette** (european) | 97.3% | `bet_type` (red/black/even/odd/low/high/dozen/column/straight), `value` |
| **Plinko** | ~99% | `rows` (8/10/12/14/16), `risk` (low/medium/high) |
| **Wheel** | ~96% | без параметров |
| **Hi-Lo** | 98% | `current` (0-12), `guess` (higher/lower) |

RTP можно тонко настроить через переменные `HOUSE_EDGE_*` в `.env`.

## 💳 Rukassa: как подключить

1. Зарегистрироваться на https://rukassa.is, создать магазин.
2. Скопировать в `.env`:
   - `RUKASSA_SHOP_ID`, `RUKASSA_TOKEN`, `RUKASSA_TOKEN_PAYOUT`, `RUKASSA_WEBHOOK_SECRET`.
3. В настройках магазина указать webhook URL: `https://<your-domain>/api/payments/webhook/rukassa`.
4. Запустить — депозиты и выводы работают.

Если `RUKASSA_*` пустые, бэк работает в dev-режиме: депозит подтверждается локально через `/api/payments/dev-confirm` (только для разработки).

## 📂 Структура

```
Cas/
├─ app/
│  ├─ main.py              # FastAPI app, lifespan, static
│  ├─ config.py            # Pydantic Settings
│  ├─ db.py                # Async engine + sessionmaker
│  ├─ models.py            # User, Bet, Transaction, Bonus, Deposit, Withdrawal, Referral
│  ├─ auth.py              # Telegram initData verify + JWT
│  ├─ deps.py              # FastAPI dependencies
│  ├─ rng.py               # Provably-fair primitives (HMAC-SHA512)
│  ├─ games/               # 10 игр (модули с play(...))
│  ├─ services/            # balance, bonuses, referrals, rukassa, vip
│  ├─ routers/             # auth, user, games, bonuses, referrals, payments, content, admin
│  └─ bot/main.py          # Aiogram 3 bot
├─ web/
│  ├─ index.html
│  ├─ assets/logo.svg
│  ├─ css/app.css
│  └─ js/                  # SPA router + pages + games (canvas anim)
├─ tests/
│  ├─ test_rng.py
│  ├─ test_games.py
│  ├─ test_auth.py
│  └─ test_integration.py  # TestClient end-to-end
├─ pyproject.toml
└─ .env.example
```

## ⚖️ Лицензия и легальность

Этот проект — реф. имплементация. Использовать его как реальное казино можно только при наличии **гемблинг-лицензии** в применимой юрисдикции (Curaçao, Anjouan, MGA и др.) и при соответствии 18+, AML, KYC и местному законодательству.

Все игры используют **честный RNG** и заявленный RTP. Никакой подкрутки исходов под пользователя нет — это технически невозможно при provably-fair схеме (см. выше).

## 📜 Раскрытие

Owner: репозиторий поставлен в `pe4nyakaaaaa/Cas` для интеграции в Telegram Mini App.

Если есть гемблинг-лицензия — нужно:
- Подключить сертифицированный RNG-аудит (iTechLabs / GLI).
- Подключить KYC/AML провайдера.
- Отрисовать в UI плашку «Operator licensed by ___».
- Вывести support-канал для регулятора.
