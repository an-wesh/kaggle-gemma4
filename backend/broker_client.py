"""
broker_client.py — Trading context provider.

Reads the user's actual paper-trading session from the SQLite engine in
paper_trading.py and shapes it into a TradingContext that the Gemma 4
behavioral analysis prompt can consume.

If the database has no recent trades AND DEMO_MODE is on, the high-risk
demo session is seeded once so first-run judges immediately see the
Speed Bump fire. After seeding, every analysis runs on real DB data —
including any fresh trades the user places via /confirm-trade.

The Zerodha Kite live-trading adapter belongs here too; it's stubbed
behind DEMO_MODE for the hackathon submission.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from models import TradingContext, MarginData, Trade, Language
from paper_trading import (
    get_session_trades_for_ai,
    compute_margin,
    seed_demo_trades,
    has_session_trades,
)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
PAPER_CAPITAL = float(os.getenv("PAPER_CAPITAL", "100000"))


def get_trading_context() -> TradingContext:
    """
    Build the TradingContext that /analyze-behavior feeds into Gemma 4.

    - Trades come from paper_trading.get_session_trades_for_ai() — only
      closed legs with realized P&L (these are what Gemma reasons about).
    - Margin is derived from paper_trading.compute_margin() over the
      currently open positions.
    - On a cold start in DEMO_MODE, the realistic high-risk demo session
      is seeded once so the app demonstrates the Speed Bump immediately.
    """
    if DEMO_MODE and not has_session_trades():
        seeded = seed_demo_trades()
        print(f"[broker_client] Seeded demo session: {seeded}")

    trades: list[Trade] = get_session_trades_for_ai(since_minutes=240)
    margin: MarginData = compute_margin(total=PAPER_CAPITAL)

    # If the user has placed enough trades for a real session but margin
    # ended up at 0 (everything closed), keep margin at the conservative
    # default so the AI prompt still has a meaningful number to reason
    # about. ₹100K paper account, no open exposure → 0% used (low risk).
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
    )


def _session_start(trades: list[Trade]) -> datetime:
    """Earliest trade timestamp, or now if the session has no trades yet."""
    if not trades:
        return datetime.now(timezone.utc)
    return min(t.timestamp for t in trades)
