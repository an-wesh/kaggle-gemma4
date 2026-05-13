"""
broker_client.py — Trading context provider, mode-aware.

Reads the user's actual paper-trading session from the SQLite engine in
paper_trading.py and shapes it into a TradingContext that the Gemma 4
behavioral analysis prompt can consume.

Three modes:
  - "demo"  -> auto-seeded high-risk session, fixed canonical scenario
  - "paper" -> user's own trades, starts empty; low-risk default until they
               actually trade themselves into trouble
  - "kite"  -> live Zerodha account snapshot normalized into the same
               TradingContext, plus extra live-account risk fields
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from models import TradingContext, MarginData, Trade, Language
from paper_trading import (
    get_session_trades_for_ai,
    compute_margin,
    seed_demo_trades,
    has_session_trades,
)

PAPER_CAPITAL = float(os.getenv("PAPER_CAPITAL", "100000"))


def get_trading_context(mode: str = "demo") -> TradingContext:
    """
    Build the TradingContext that /analyze-behavior feeds into Gemma 4.

    Mode-aware:
      - demo: seed if empty, return high-risk session
      - paper: never seed; if empty return low-risk "Healthy Trading"
               context so no Speed Bump fires until the user actually
               trades into a high-risk pattern themselves
      - kite: same as paper for the non-broker fallback path
    """
    if mode not in ("demo", "paper", "kite"):
        mode = "demo"

    db_mode = "demo" if mode == "demo" else "paper"

    if mode == "demo" and not has_session_trades(mode=db_mode):
        seeded = seed_demo_trades(mode=db_mode)
        print(f"[broker_client] Seeded demo session: {seeded}")

    trades: list[Trade] = get_session_trades_for_ai(
        since_minutes=240, mode=db_mode,
    )
    margin: MarginData = compute_margin(total=PAPER_CAPITAL, mode=db_mode)

    return TradingContext(
        recent_trades=trades,
        margin=margin,
        trading_vows=[
            "I will stop trading after 2 consecutive losses",
            "I will not use more than 50% of my margin",
            "I will not revenge trade after a big loss",
        ],
        session_start=_session_start(trades),
        preferred_language=Language.EN,
        historical_sessions=0,
        historical_loss_rate=0.0,
        source_mode="demo" if mode == "demo" else "paper",
    )


def _session_start(trades: list[Trade]) -> datetime:
    """Earliest trade timestamp, or now if the session has no trades yet."""
    if not trades:
        return datetime.now(timezone.utc)
    return min(t.timestamp for t in trades)


async def get_kite_trading_context(session_id: str) -> TradingContext:
    """
    Build a TradingContext from the user's live Zerodha account.

    Uses the aggregated account snapshot so both the dashboard and AI see
    one coherent live view of trades, exposure, holdings, and current P&L.
    """
    import kite_client  # local import keeps demo/paper paths free of the SDK

    snapshot = await kite_client.get_account_snapshot(session_id)

    trades = _kite_snapshot_trades_for_ai(snapshot)

    margins = snapshot.get("margins", {}) or {}
    summary = snapshot.get("summary", {}) or {}
    warnings = snapshot.get("warnings", []) or []

    total_margin = float(margins.get("total", PAPER_CAPITAL) or PAPER_CAPITAL)
    used_margin = float(margins.get("used", 0) or 0)
    available_margin = float(
        margins.get("available", max(0.0, total_margin - used_margin)) or 0
    )
    margin = MarginData(
        available=available_margin,
        used=used_margin,
        total=total_margin,
    )

    return TradingContext(
        recent_trades=trades,
        margin=margin,
        trading_vows=[
            "I will stop trading after 2 consecutive losses",
            "I will not use more than 50% of my margin",
            "I will not revenge trade after a big loss",
        ],
        session_start=_session_start(trades),
        preferred_language=Language.EN,
        historical_sessions=0,
        historical_loss_rate=0.0,
        source_mode="kite",
        day_realized_pnl=_opt_float(summary.get("realized_pnl")),
        open_pnl=_opt_float(summary.get("open_pnl")),
        open_positions_count=int(summary.get("open_positions_count", 0) or 0),
        holdings_count=int(summary.get("holdings_count", 0) or 0),
        exposure_concentration=float(summary.get("exposure_concentration", 0) or 0),
        inferred_loss_streak=int(summary.get("inferred_loss_streak", 0) or 0),
        realized_pnl_source=str(summary.get("realized_pnl_source", "unknown")),
        open_pnl_source=str(summary.get("open_pnl_source", "unknown")),
        analysis_notes=[
            str(note)
            for note in [
                *warnings,
                *_kite_position_notes(snapshot.get("positions", [])),
                *_kite_holding_notes(snapshot.get("holdings", [])),
            ]
            if note
        ],
    )


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        ts = value
    elif value:
        try:
            ts = datetime.fromisoformat(str(value))
        except Exception:
            ts = datetime.now(timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts


def _opt_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _norm_action(value: Any) -> str:
    return "SELL" if str(value or "").upper() == "SELL" else "BUY"


def _kite_snapshot_trades_for_ai(snapshot: dict[str, Any]) -> list[Trade]:
    """
    Closed live trades + current open positions for Gemma.

    Kite's trade-book endpoint only describes executions. Current risk lives in
    `positions`, so an account with an open live position but no closed trade
    could previously look empty to the AI. We feed closed realized legs from
    the trade book, then append one derived OPEN leg per current net position.
    """
    out: list[Trade] = []

    for t in snapshot.get("trades", []) or []:
        realized_pnl = _opt_float(t.get("realized_pnl"))
        if realized_pnl is None:
            continue
        out.append(
            Trade(
                trade_id=str(t.get("trade_id") or t.get("order_id") or ""),
                symbol=str(t.get("symbol", "")),
                action=_norm_action(t.get("action")),
                quantity=int(t.get("quantity", 0) or 0),
                price=float(t.get("price", 0) or 0),
                timestamp=_parse_timestamp(t.get("timestamp")),
                pnl=realized_pnl,
                is_loss=bool(t.get("is_loss")) if t.get("is_loss") is not None else realized_pnl < 0,
            )
        )

    now = datetime.now(timezone.utc)
    for pos in snapshot.get("positions", []) or []:
        symbol = str(pos.get("symbol", "") or "")
        qty = int(pos.get("quantity", 0) or 0)
        price = float(pos.get("avg_price", pos.get("last_price", 0)) or 0)
        if not symbol or qty <= 0 or price <= 0:
            continue
        out.append(
            Trade(
                trade_id=f"OPEN-POS-{symbol}-{_norm_action(pos.get('side'))}",
                symbol=symbol,
                action=_norm_action(pos.get("side")),
                quantity=qty,
                price=price,
                timestamp=now,
                pnl=None,
                is_loss=False,
            )
        )

    return out


def _kite_position_notes(positions: list[dict[str, Any]]) -> list[str]:
    notes: list[str] = []
    for pos in (positions or [])[:5]:
        notes.append(
            "Open position: "
            f"{pos.get('side', '')} {pos.get('symbol', '')} "
            f"qty={pos.get('quantity', 0)} avg={pos.get('avg_price', 0)} "
            f"open_pnl={pos.get('pnl', 0)}"
        )
    return notes


def _kite_holding_notes(holdings: list[dict[str, Any]]) -> list[str]:
    notes: list[str] = []
    for holding in (holdings or [])[:3]:
        notes.append(
            "Holding: "
            f"{holding.get('symbol', '')} qty={holding.get('quantity', 0)} "
            f"avg={holding.get('avg_price', 0)} pnl={holding.get('pnl', 0)}"
        )
    return notes
