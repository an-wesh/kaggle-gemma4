import json
import sys
import types
from datetime import datetime, timezone

import pytest

import ai_engine
from models import Language, MarginData, Trade, TradingContext


@pytest.mark.asyncio
async def test_analyze_behavior_sends_trades_and_vows_to_gemma(monkeypatch):
    captured: dict[str, str] = {}

    class FakeAsyncClient:
        def __init__(self, host: str):
            captured["host"] = host

        async def generate(self, **kwargs):
            captured["prompt"] = kwargs["prompt"]
            captured["model"] = kwargs["model"]
            return {
                "response": json.dumps({
                    "behavioral_score": 640,
                    "risk_level": "high",
                    "detected_pattern": "Over-Leveraging",
                    "nudge_message": "I am increasing exposure too quickly, and I need to reduce risk before trading.",
                    "nudge_message_local": "",
                    "vows_violated": ["I will not use more than 50% of my margin"],
                    "crisis_score": 22,
                })
            }

    monkeypatch.setitem(
        sys.modules,
        "ollama",
        types.SimpleNamespace(AsyncClient=FakeAsyncClient),
    )

    ctx = TradingContext(
        recent_trades=[
            Trade(
                trade_id="PAPER-1",
                symbol="RELIANCE",
                action="BUY",
                quantity=10,
                price=1298.40,
                timestamp=datetime(2026, 5, 13, 17, 4, tzinfo=timezone.utc),
                pnl=None,
                is_loss=False,
            )
        ],
        margin=MarginData(available=40_000, used=60_000, total=100_000),
        trading_vows=[
            "I will stop trading after 2 consecutive losses",
            "I will not use more than 50% of my margin",
        ],
        preferred_language=Language.EN,
        source_mode="paper",
    )

    result = await ai_engine.analyze_behavior(ctx)

    assert captured["model"] == ai_engine.OLLAMA_MODEL
    assert "Trades this session: 1 (0 closed, 1 open)" in captured["prompt"]
    assert "BUY RELIANCE qty=10 @ Rs.1298.40 pnl=unrealized OPEN" in captured["prompt"]
    assert "I will not use more than 50% of my margin" in captured["prompt"]
    assert result.behavioral_score == 640
    assert result.detected_pattern == "Over-Leveraging"
    assert result.vows_violated == ["I will not use more than 50% of my margin"]
    assert "Gemma received 1 trade(s) (1 open, 0 closed)" in (result.thinking_log or "")
    assert "No trades placed yet" not in (result.thinking_log or "")


@pytest.mark.asyncio
async def test_analyze_behavior_timeout_is_explicit_unavailable(monkeypatch):
    class SlowAsyncClient:
        def __init__(self, host: str):
            pass

        async def generate(self, **kwargs):
            raise TimeoutError("simulated model stall")

    monkeypatch.setitem(
        sys.modules,
        "ollama",
        types.SimpleNamespace(AsyncClient=SlowAsyncClient),
    )

    ctx = TradingContext(
        recent_trades=[],
        margin=MarginData(available=100_000, used=0, total=100_000),
        trading_vows=[],
        preferred_language=Language.EN,
        source_mode="paper",
    )

    result = await ai_engine.analyze_behavior(ctx)

    assert result.detected_pattern == "Gemma unavailable"
    assert result.inference_seconds is None
    assert "no model insight produced" in (result.thinking_log or "")
