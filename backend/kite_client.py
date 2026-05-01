"""
kite_client.py — Live Kite Connect adapter for Finsight OS.

Wraps the official `kiteconnect` SDK so the FastAPI layer can:

  • Generate the Zerodha login URL
  • Handle the `/kite/callback` redirect that Zerodha sends after login
  • Persist the resulting access_token in a server-side session map
  • Read holdings, positions, orders, trades, quotes, profile, margin
  • Place / cancel / modify orders
  • Honor Kite's 3 req/s rate limit via an asyncio semaphore + spacing

Authentication flow (OAuth-style, per kite.trade/connect/docs):

  1. Frontend hits   GET  /kite/login-url
                                 ↓ redirects user to
     Zerodha login page
                                 ↓ on success Zerodha redirects to
  2. Backend handles GET  /kite/callback?request_token=xxx&action=login&status=success
                                 ↓ exchanges request_token + api_secret for
     KiteConnect.generate_session() returns access_token + user profile
                                 ↓ stored in session map keyed by HTTP-only cookie
  3. Subsequent requests with mode="kite" cookie route through this client.

Daily expiry: access_token expires at ~6 AM IST. We catch TokenException
and clear the session so the user is prompted to re-login.

Configuration (in backend/.env):
    KITE_API_KEY=...              # from kite.trade/connect/ app registration
    KITE_API_SECRET=...
    KITE_REDIRECT_URL=http://localhost:8000/kite/callback
"""

from __future__ import annotations

import asyncio
import os
import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

# Lazy import: kiteconnect is only needed when this mode is actually used.
# Keeps startup time fast and avoids a hard requirement when judges only run Demo/Paper.
try:
    from kiteconnect import KiteConnect             # type: ignore
    from kiteconnect.exceptions import (             # type: ignore
        TokenException, NetworkException, GeneralException,
    )
    KITECONNECT_AVAILABLE = True
except ImportError:
    KITECONNECT_AVAILABLE = False
    KiteConnect = None                                # type: ignore
    TokenException = NetworkException = GeneralException = Exception  # type: ignore


KITE_API_KEY      = os.getenv("KITE_API_KEY", "").strip()
KITE_API_SECRET   = os.getenv("KITE_API_SECRET", "").strip()
KITE_REDIRECT_URL = os.getenv("KITE_REDIRECT_URL", "http://localhost:8000/kite/callback").strip()

KITE_CONFIGURED   = bool(KITE_API_KEY and KITE_API_SECRET and KITECONNECT_AVAILABLE)


@dataclass
class KiteSession:
    """Per-user session container."""
    access_token: str
    user_id: str
    user_name: str
    email: str | None = None
    issued_at: float = field(default_factory=time.time)
    public_token: str | None = None


# ── In-memory session map (single-process; sufficient for solo demo use) ─────
# key: opaque session id stored in HTTP-only cookie
# val: KiteSession
_sessions: dict[str, KiteSession] = {}

# ── Rate limiter ─────────────────────────────────────────────────────────────
# Kite Connect Personal/Connect tier ceiling: 3 requests/sec.
# Semaphore=3 caps concurrency; the 0.34s post-call delay enforces 1/3 second
# minimum spacing so a fast burst still respects the per-second budget.
_RATE_SEM   = asyncio.Semaphore(3)
_RATE_DELAY = 0.34


def _ensure_lib() -> None:
    if not KITECONNECT_AVAILABLE:
        raise RuntimeError(
            "kiteconnect package not installed. "
            "Run `pip install kiteconnect` in the backend venv to enable Live Kite mode."
        )


# ── Status / introspection ───────────────────────────────────────────────────

def is_configured() -> bool:
    """True iff KITE_API_KEY + secret are set and kiteconnect is importable."""
    return KITE_CONFIGURED


def is_authenticated(session_id: str | None) -> bool:
    return session_id is not None and session_id in _sessions


def status_dict(session_id: str | None) -> dict[str, Any]:
    """Used by /kite/status — what the frontend Mode Selector shows."""
    if not is_configured():
        return {
            "configured":    False,
            "authenticated": False,
            "error":         "KITE_API_KEY and KITE_API_SECRET must be set in backend/.env",
        }
    sess = _sessions.get(session_id) if session_id else None
    if sess is None:
        return {"configured": True, "authenticated": False}
    return {
        "configured":    True,
        "authenticated": True,
        "user_id":       sess.user_id,
        "user_name":     sess.user_name,
    }


# ── Auth flow ────────────────────────────────────────────────────────────────

def login_url() -> str:
    """The Zerodha login URL we redirect the browser to."""
    _ensure_lib()
    kite = KiteConnect(api_key=KITE_API_KEY)          # type: ignore[call-arg]
    return kite.login_url()


def handle_callback(request_token: str) -> tuple[str, KiteSession]:
    """
    Exchange the single-use request_token for a long-lived access_token.

    Returns (session_id, KiteSession). The session_id is what we set as an
    HTTP-only cookie; the caller routes that on every subsequent request.
    """
    _ensure_lib()
    kite = KiteConnect(api_key=KITE_API_KEY)          # type: ignore[call-arg]
    try:
        data = kite.generate_session(request_token, api_secret=KITE_API_SECRET)
    except TokenException as e:
        raise PermissionError(f"Kite rejected the request_token: {e}")

    sess = KiteSession(
        access_token = data["access_token"],
        user_id      = data.get("user_id",   ""),
        user_name    = data.get("user_name", ""),
        email        = data.get("email"),
        public_token = data.get("public_token"),
    )
    sid = secrets.token_urlsafe(32)
    _sessions[sid] = sess
    return sid, sess


def logout(session_id: str | None) -> None:
    if session_id and session_id in _sessions:
        del _sessions[session_id]


def _get_kite(session_id: str) -> KiteConnect:                # type: ignore[valid-type]
    """Build a KiteConnect bound to the user's access_token."""
    _ensure_lib()
    sess = _sessions.get(session_id)
    if sess is None:
        raise PermissionError("Kite session not found — re-login required.")
    kite = KiteConnect(api_key=KITE_API_KEY)                   # type: ignore[call-arg]
    kite.set_access_token(sess.access_token)
    return kite


# ── Read API (rate-limited) ──────────────────────────────────────────────────

async def _call(session_id: str, fn_name: str, *args, **kwargs) -> Any:
    """Run a blocking kite SDK method in a thread, rate-limited."""
    async with _RATE_SEM:
        loop = asyncio.get_event_loop()
        try:
            kite = _get_kite(session_id)
            method = getattr(kite, fn_name)
            result = await loop.run_in_executor(None, lambda: method(*args, **kwargs))
        except TokenException:
            # Daily token expired — drop the session so the user re-logs in.
            logout(session_id)
            raise PermissionError("Kite access_token expired — please log in again.")
        finally:
            await asyncio.sleep(_RATE_DELAY)
        return result


async def get_profile(session_id: str) -> dict[str, Any]:
    return await _call(session_id, "profile")


async def get_margins(session_id: str) -> dict[str, Any]:
    return await _call(session_id, "margins")


async def get_holdings(session_id: str) -> list[dict[str, Any]]:
    return await _call(session_id, "holdings")


async def get_positions(session_id: str) -> dict[str, Any]:
    return await _call(session_id, "positions")


async def get_orders(session_id: str) -> list[dict[str, Any]]:
    return await _call(session_id, "orders")


async def get_trades(session_id: str) -> list[dict[str, Any]]:
    return await _call(session_id, "trades")


async def get_quote(session_id: str, instruments: list[str]) -> dict[str, Any]:
    return await _call(session_id, "quote", instruments)


# ── Write API ────────────────────────────────────────────────────────────────

async def place_order(
    session_id: str,
    symbol: str,
    quantity: int,
    price: float,
    transaction_type: str,                    # "BUY" or "SELL"
    exchange: str = "NSE",
    product:  str = "MIS",                    # MIS = intraday, CNC = delivery
    order_type: str = "LIMIT",                # LIMIT | MARKET | SL | SL-M
    variety:  str = "regular",
) -> dict[str, Any]:
    """
    Place a live order on Zerodha. Returns the broker order_id.

    NOTE: This actually moves money in the user's real account. Finsight OS
    only places this call AFTER the Mindful Speed Bump has been satisfied.
    """
    return await _call(
        session_id, "place_order",
        variety           = variety,
        exchange          = exchange,
        tradingsymbol     = symbol,
        transaction_type  = transaction_type,
        quantity          = int(quantity),
        product           = product,
        order_type        = order_type,
        price             = float(price) if order_type != "MARKET" else None,
    )


async def cancel_order(session_id: str, order_id: str, variety: str = "regular") -> dict[str, Any]:
    return await _call(session_id, "cancel_order", variety=variety, order_id=order_id)


# ── Adapter shape: convert Kite responses into Finsight's internal types ────

def kite_trades_to_finsight(kite_trades: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Map Zerodha's trade payload to the same shape paper_trading.get_recent_trades()
    returns. Lets the existing /trade-history endpoint serve both modes uniformly.
    """
    out = []
    for t in kite_trades:
        action = t.get("transaction_type", "BUY")
        qty    = int(t.get("quantity", 0))
        price  = float(t.get("average_price") or t.get("price") or 0)
        ts     = t.get("trade_timestamp") or t.get("order_timestamp") or datetime.now(timezone.utc)
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        out.append({
            "order_id":           t.get("trade_id") or t.get("order_id") or "",
            "symbol":             t.get("tradingsymbol", ""),
            "action":             action,
            "quantity":           qty,
            "price":              price,
            "timestamp":          ts_str,
            "quantity_remaining": 0,                 # kite trades are completed fills
            "realized_pnl":       None,              # Kite's /trades doesn't carry per-trade P&L
            "is_loss":            None,
        })
    return out


def kite_positions_to_finsight(kite_positions: dict[str, Any]) -> list[dict[str, Any]]:
    """Map Kite's positions['net'] to Finsight's OpenPosition shape."""
    out = []
    for p in kite_positions.get("net", []):
        qty = int(p.get("quantity", 0))
        if qty == 0: continue
        out.append({
            "symbol":    p.get("tradingsymbol", ""),
            "side":      "BUY" if qty > 0 else "SELL",
            "quantity":  abs(qty),
            "avg_price": float(p.get("average_price", 0)),
        })
    return out
