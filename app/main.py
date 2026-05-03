"""Aurora Casino — FastAPI application entrypoint.

Serves both the JSON API at ``/api/*`` and the static Mini App at ``/``.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routers import admin, auth, bonuses, content, games, payments, referrals, user

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Aurora Casino API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(user.router, prefix=API_PREFIX)
app.include_router(games.router, prefix=API_PREFIX)
app.include_router(bonuses.router, prefix=API_PREFIX)
app.include_router(referrals.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(content.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health")
async def health() -> dict:
    return {
        "ok": True,
        "name": "Aurora Casino",
        "version": "0.1.0",
        "currency": settings.currency_code,
    }


# --- Static SPA ---
if WEB_DIR.exists():
    # Sub-folders served as static assets.
    for sub in ("css", "js", "assets"):
        d = WEB_DIR / sub
        if d.exists():
            app.mount(f"/{sub}", StaticFiles(directory=str(d)), name=sub)

    @app.get("/", response_class=HTMLResponse)
    async def index() -> HTMLResponse:
        idx = WEB_DIR / "index.html"
        return HTMLResponse(idx.read_text(encoding="utf-8"))

    @app.get("/dev-pay", response_class=HTMLResponse)
    async def dev_pay(order_id: str = "", amount: float = 0) -> HTMLResponse:
        return HTMLResponse(
            f"""<!doctype html><meta charset=utf-8>
            <title>DEV pay</title>
            <body style='font-family:sans-serif;background:#0a0e1a;color:#fff;padding:24px'>
            <h2>DEV-pay (Rukassa is not configured)</h2>
            <p>Order: <code>{order_id}</code><br>Amount: <code>{amount}</code> RUB</p>
            <p>This page is only used in dev mode. To simulate a paid invoice
            from the browser, the Mini App calls
            <code>POST /api/payments/dev-confirm</code>.</p>
            </body>"""
        )

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"ok": True}
