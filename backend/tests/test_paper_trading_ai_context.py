from models import Language, TradingContext

import ai_engine
import paper_trading


def test_open_paper_trades_are_visible_to_gemma_context(tmp_path, monkeypatch):
    monkeypatch.setitem(paper_trading.DB_PATHS, "paper", tmp_path / "paper.db")

    paper_trading.reset_db(mode="paper")
    for _ in range(3):
        paper_trading.record_trade(
            "RELIANCE",
            "BUY",
            10,
            1298.40,
            mode="paper",
        )

    trades = paper_trading.get_session_trades_for_ai(mode="paper")

    assert len(trades) == 3
    assert all(t.symbol == "RELIANCE" for t in trades)
    assert all(t.pnl is None for t in trades)
    assert all(not t.is_loss for t in trades)

    ctx = TradingContext(
        recent_trades=trades,
        margin=paper_trading.compute_margin(total=100_000, mode="paper"),
        trading_vows=[
            "I will stop trading after 2 consecutive losses",
            "I will not use more than 50% of my margin",
        ],
        preferred_language=Language.EN,
        source_mode="paper",
    )

    prompt = ai_engine.build_analysis_prompt(ctx)
    thinking_log = ai_engine._build_real_thinking_log(
        ctx,
        score=120,
        risk="low",
        pattern="Healthy Trading",
        nudge="",
        nudge_loc="",
        vows_v=[],
        crisis=0,
        elapsed=12.3,
    )

    assert "Trades this session: 3 (0 closed, 3 open)" in prompt
    assert prompt.count("pnl=unrealized OPEN") == 3
    assert "No trades placed yet" not in thinking_log
    assert "Gemma received 3 trade(s) (3 open, 0 closed)" in thinking_log
