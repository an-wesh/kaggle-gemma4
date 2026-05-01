import os, time, asyncio, json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from dotenv import load_dotenv
import base64

load_dotenv()
from models import TradingContext, BehavioralAnalysis, TradeRequest, VowsUpdate, Language
from broker_client import get_trading_context
from ai_engine import (
    analyze_behavior, get_demo_analysis, warm_up_model, OLLAMA_MODEL,
    analyze_behavior_stream,
)
from behavioral_dna import get_behavioral_dna, save_session, get_historical_context
from multimodal_engine import analyze_chart_image
from rag_engine import retrieve_sebi_context
from crisis_protocol import get_crisis_resources, should_trigger_crisis
from market_data import get_market_snapshot
from paper_trading import (
    record_trade as paper_record_trade,
    get_recent_trades as paper_get_recent_trades,
    get_open_positions as paper_get_open_positions,
    get_session_pnl as paper_get_session_pnl,
)
import kite_client


# ── Mode-aware dispatch ──────────────────────────────────────────────────────
# The frontend threads the user's chosen mode into every request via the
# X-Finsight-Mode header. Three values: "demo" | "paper" | "kite". Most
# endpoints behave identically across demo and paper (paper just lets the
# user place real fresh trades). The "kite" path routes reads/writes to the
# Live Kite Connect adapter.

VALID_MODES = {"demo", "paper", "kite"}
KITE_COOKIE = "finsight_kite_session"

def get_mode(request: Request) -> str:
    m = (request.headers.get("X-Finsight-Mode", "") or "").lower()
    return m if m in VALID_MODES else "demo"

def get_kite_session(request: Request) -> str | None:
    return request.cookies.get(KITE_COOKIE)

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
user_vows: list[str] = [
    "I will stop trading after 2 consecutive losses",
    "I will not use more than 50% of my margin",
    "I will not revenge trade after a big loss",
]
preferred_language = Language.EN

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n Finsight OS - Behavioral Guardian for India's Retail Traders")
    print(f"   Mode: {'DEMO (High-Risk Mock)' if DEMO_MODE else 'LIVE (Zerodha Kite)'}")
    print(f"   AI:   {OLLAMA_MODEL} via Ollama (local, private, CPU)")
    print(f"   RAG:  Initializing SEBI circular index...")
    from rag_engine import get_collection
    get_collection()
    print(f"   RAG:  SEBI circulars indexed")

    # Pre-warm Gemma so the first user request doesn't pay cold-start.
    # Runs in the background — we don't block startup if Ollama is offline.
    asyncio.create_task(warm_up_model())

    yield

app = FastAPI(title="Finsight OS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {"status": "ok", "demo_mode": DEMO_MODE, "model": OLLAMA_MODEL, "edge_ai": True}


@app.post("/analyze-behavior", response_model=BehavioralAnalysis)
async def analyze(request: Request):
    # Read raw body — if empty or missing fields, fall back to mock context
    try:
        body = await request.json()
    except Exception:
        body = {}

    # Only parse as TradingContext if the body has the required fields
    if body and "recent_trades" in body and "margin" in body:
        ctx = TradingContext(**body)
    else:
        ctx = get_trading_context()

    ctx.trading_vows = user_vows
    ctx.preferred_language = preferred_language

    # Enrich with historical context
    hist_sessions, hist_loss_rate = get_historical_context()
    ctx.historical_sessions = hist_sessions
    ctx.historical_loss_rate = hist_loss_rate

    # Enrich SEBI disclosure via RAG
    loss_count = len([t for t in ctx.recent_trades if t.is_loss])
    sebi_ctx, sebi_source = retrieve_sebi_context(
        f"retail F&O trading {loss_count} losses margin {ctx.margin.usage_ratio*100:.0f}%"
    )

    # Run Gemma 4 analysis (falls back to demo if Ollama is offline)
    try:
        result = await analyze_behavior(ctx)
    except Exception as e:
        print(f"[ERROR] Gemma offline: {e} — using demo fallback")
        result = get_demo_analysis()

    # Attach RAG-grounded SEBI disclosure
    result.sebi_disclosure = sebi_ctx[:200]
    result.sebi_source = sebi_source

    # Persist session to Behavioral DNA
    session_id = f"S{int(time.time())}"
    save_session(session_id, result,
                 len(ctx.recent_trades), ctx.margin.usage_ratio * 100)

    # Crisis protocol check
    if should_trigger_crisis(result.crisis_score, result.behavioral_score, hist_loss_rate):
        result.crisis_detected = True

    return result


@app.get("/behavioral-dna")
async def get_dna():
    return get_behavioral_dna()


@app.post("/analyze-chart")
async def analyze_chart(file: UploadFile = File(...)):
    contents = await file.read()
    b64 = base64.b64encode(contents).decode()
    insight = await analyze_chart_image(b64, symbol=file.filename or "")
    return {"insight": insight}


@app.post("/trading-vows")
async def update_vows(update: VowsUpdate):
    global user_vows, preferred_language
    user_vows = update.vows
    preferred_language = update.preferred_language
    return {"status": "saved", "count": len(user_vows)}

@app.get("/trading-vows")
async def get_vows():
    return {"vows": user_vows, "language": preferred_language}

@app.get("/crisis-resources")
async def crisis_resources(lang: str = "en"):
    return get_crisis_resources(lang)


@app.get("/market-quotes")
async def market_quotes():
    """Live NSE watchlist quotes (Yahoo Finance, 30s server-side cache)."""
    snap = await get_market_snapshot()
    return snap.to_dict()


@app.post("/analyze-behavior-stream")
async def analyze_stream(request: Request):
    """
    Server-Sent Events variant of /analyze-behavior.

    Streams Gemma's reasoning token-by-token to the UI as it's produced.
    Each event is a JSON object with one of:
        {"type": "status",  "message": str}
        {"type": "token",   "text":    str}
        {"type": "result",  "analysis": BehavioralAnalysis dict}

    The same broker_client / RAG enrichment / behavioral DNA persistence
    happens here as in /analyze-behavior — only the model output streams.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    if body and "recent_trades" in body and "margin" in body:
        ctx = TradingContext(**body)
    else:
        ctx = get_trading_context()

    ctx.trading_vows = user_vows
    ctx.preferred_language = preferred_language

    hist_sessions, hist_loss_rate = get_historical_context()
    ctx.historical_sessions = hist_sessions
    ctx.historical_loss_rate = hist_loss_rate

    # SEBI RAG retrieval up front so we can attach it to the final result
    loss_count = len([t for t in ctx.recent_trades if t.is_loss])
    sebi_ctx, sebi_source = retrieve_sebi_context(
        f"retail F&O trading {loss_count} losses margin {ctx.margin.usage_ratio*100:.0f}%"
    )

    async def event_stream():
        async for event in analyze_behavior_stream(ctx):
            # Attach SEBI grounding + persist session at the result event
            if event.get("type") == "result":
                analysis_dict = event["analysis"]
                analysis_dict["sebi_disclosure"] = sebi_ctx[:200]
                analysis_dict["sebi_source"] = sebi_source

                # Crisis post-processing & DNA save (mirrors /analyze-behavior)
                if should_trigger_crisis(
                    analysis_dict.get("crisis_score", 0),
                    analysis_dict.get("behavioral_score", 0),
                    hist_loss_rate,
                ):
                    analysis_dict["crisis_detected"] = True

                try:
                    session_id = f"S{int(time.time())}"
                    save_session(
                        session_id,
                        BehavioralAnalysis(**analysis_dict),
                        len(ctx.recent_trades),
                        ctx.margin.usage_ratio * 100,
                    )
                except Exception as e:
                    print(f"[stream] save_session failed: {e}")

            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        # Explicit close marker so the client can release resources cleanly.
        yield "event: close\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@app.post("/confirm-trade")
async def confirm_trade(trade: TradeRequest, request: Request):
    """
    Persist or place a trade. Mode-aware:
      - demo / paper → SQLite paper-trading engine (FIFO matched)
      - kite         → real broker via kiteconnect (real money)
    """
    mode = get_mode(request)
    print(f"[TRADE/{mode}] {trade.action} {trade.quantity}x {trade.symbol} @ Rs.{trade.price}")

    if mode == "kite":
        sid = get_kite_session(request)
        if not sid or not kite_client.is_authenticated(sid):
            raise HTTPException(status_code=401, detail="Not logged in to Kite — re-login required.")
        try:
            result = await kite_client.place_order(
                sid, trade.symbol, trade.quantity, trade.price, trade.action,
            )
            return {"status": "confirmed", "order_id": result.get("order_id", ""), "broker": "kite"}
        except PermissionError as e:
            raise HTTPException(status_code=401, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Kite error: {e}")

    # demo / paper paths share the same paper-trading engine
    try:
        result = paper_record_trade(
            symbol=trade.symbol, action=trade.action,
            quantity=trade.quantity, price=trade.price,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "confirmed", **result, "broker": "paper"}


@app.get("/trade-history")
async def trade_history(request: Request, limit: int = 20):
    """Recent trades. Mode-aware: paper trades from SQLite OR Kite trades from broker."""
    mode = get_mode(request)
    if mode == "kite":
        sid = get_kite_session(request)
        if sid and kite_client.is_authenticated(sid):
            try:
                kite_trades = await kite_client.get_trades(sid)
                return {
                    "trades":      kite_client.kite_trades_to_finsight(kite_trades),
                    "session_pnl": {"since": "today", "total_trades": len(kite_trades),
                                    "closed_trades": len(kite_trades),
                                    "realized_pnl": 0.0, "loss_count": 0},
                }
            except PermissionError as e:
                raise HTTPException(status_code=401, detail=str(e))
            except Exception as e:
                print(f"[trade-history/kite] {e} — falling back to paper view")

    return {
        "trades": paper_get_recent_trades(limit=limit),
        "session_pnl": paper_get_session_pnl(),
    }


@app.get("/portfolio")
async def portfolio(request: Request):
    """Open positions. Mode-aware: paper SQLite OR Kite positions['net']."""
    mode = get_mode(request)
    if mode == "kite":
        sid = get_kite_session(request)
        if sid and kite_client.is_authenticated(sid):
            try:
                pos = await kite_client.get_positions(sid)
                return {
                    "positions":   kite_client.kite_positions_to_finsight(pos),
                    "session_pnl": {"since": "today", "total_trades": 0, "closed_trades": 0,
                                    "realized_pnl": 0.0, "loss_count": 0},
                }
            except PermissionError as e:
                raise HTTPException(status_code=401, detail=str(e))
            except Exception as e:
                print(f"[portfolio/kite] {e} — falling back to paper view")

    return {
        "positions": paper_get_open_positions(),
        "session_pnl": paper_get_session_pnl(),
    }


# ── Live Kite Connect routes ─────────────────────────────────────────────────

@app.get("/kite/status")
async def kite_status(request: Request):
    """Tells the frontend whether Kite is configured + the user is logged in."""
    return kite_client.status_dict(get_kite_session(request))


@app.get("/kite/login-url")
async def kite_login_url():
    """Returns the Zerodha OAuth login URL the frontend opens for the user."""
    if not kite_client.is_configured():
        raise HTTPException(status_code=503,
            detail="Kite Connect is not configured. Set KITE_API_KEY and KITE_API_SECRET in backend/.env.")
    return {"login_url": kite_client.login_url()}


@app.get("/kite/callback")
async def kite_callback(request_token: str = "", status: str = "", action: str = ""):
    """
    Zerodha redirects here after the user logs in. We exchange the
    request_token for an access_token, set a server-side session, drop the
    session id into an HTTP-only cookie, and redirect back to the dashboard.
    """
    if not kite_client.is_configured():
        raise HTTPException(status_code=503, detail="Kite Connect not configured")
    if status != "success" or not request_token:
        raise HTTPException(status_code=400, detail=f"Kite login failed: status={status!r}")

    try:
        sid, _sess = kite_client.handle_callback(request_token)
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))

    front = os.getenv("FRONTEND_URL", "http://localhost:3000")
    response = RedirectResponse(url=front, status_code=303)
    response.set_cookie(
        key=KITE_COOKIE, value=sid,
        httponly=True, samesite="lax", path="/",
        max_age=60 * 60 * 12,                      # Kite tokens expire ~6 AM IST → 12h is safe
    )
    return response


@app.post("/kite/logout")
async def kite_logout(request: Request):
    sid = get_kite_session(request)
    kite_client.logout(sid)
    response = {"ok": True}
    res = StreamingResponse(iter([json.dumps(response)]), media_type="application/json")
    res.delete_cookie(KITE_COOKIE, path="/")
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)