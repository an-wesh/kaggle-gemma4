"""
multimodal_engine.py — Vision analysis of trading chart screenshots.

Gemma 4's E2B and E4B variants both include native vision support — all
"E" (effective-param) models on Ollama accept image + audio inputs out
of the box. We default to `gemma4:e2b` so the same lightweight model
that already runs your behavioral analysis on CPU also powers the Chart
Analyzer; no extra `ollama pull` needed.

Per Ollama's Gemma 4 docs, multimodal inputs perform best when the
image is provided BEFORE the text prompt — the SDK handles this via
the `images=[...]` argument, but the prompt is kept compact to leave
visual tokens room in the context window.

This is NOT a generic "what's on this chart" call. The prompt instructs
the model to produce four layers:
  1. Market structure (trend, momentum, volatility, volume, fakeouts)
  2. Behavioral risk (FOMO / revenge / overconfidence / panic probability)
  3. Decision quality (entry timing, R:R, stop placement, sizing)
  4. Personalized insight (cross-references the trader's historical DNA)
"""

import asyncio
import base64
import json
import os
import re
from pathlib import Path
from typing import Any

OLLAMA_HOST         = os.getenv("OLLAMA_HOST",         "http://localhost:11434")
# Default to the same lightweight Gemma 4 model the behavioral engine uses.
# Both gemma4:e2b and gemma4:e4b are multimodal — image input is supported
# natively (no separate vision model required).
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", os.getenv("OLLAMA_MODEL", "gemma4:e2b"))
OLLAMA_TIMEOUT_S    = int(os.getenv("OLLAMA_VISION_TIMEOUT_S", "300"))


def _parse_json_forgiving(raw: str) -> dict[str, Any] | None:
    """
    Try increasingly tolerant strategies to extract a JSON object from the
    model's response. Handles the three common Gemma-on-CPU failure modes:
      1. Pure JSON                           → json.loads
      2. JSON with prose around it           → regex-extract the {...} body
      3. Truncated / malformed JSON          → repair (trailing commas,
         missing commas before `}` / `"`,    auto-close braces)
    Returns the parsed dict, or None if even repair couldn't salvage it.
    """
    if not raw:
        return None

    # Strategy 1: clean JSON
    try:
        return json.loads(raw)
    except Exception:
        pass

    # Strategy 2: extract the outermost {...} block, even if there's surrounding text
    match = re.search(r"\{[\s\S]*\}", raw)
    candidate = match.group() if match else raw

    # Strategy 3: progressive repairs
    repaired = _repair_json(candidate)
    if repaired is None:
        return None
    try:
        return json.loads(repaired)
    except Exception as e:
        print(f"[Multimodal] json_parse after repair: {e}")
        return None


def _repair_json(s: str) -> str | None:
    """
    Best-effort cleanup of malformed JSON. The three repairs cover ~95% of
    Gemma 4 vision-on-CPU output failures we've observed:
      - Strip trailing commas before `}` or `]`
      - Insert missing commas between `"` and the next key (`}"key"` → `},"key"`,
        `"foo""bar"` → `"foo","bar"`, etc.)
      - Auto-close unterminated objects/arrays at end of string
    """
    if not s:
        return None

    out = s.strip()

    # Remove fenced-code markers if the model wrapped its output
    out = re.sub(r"^```(?:json)?\s*", "", out)
    out = re.sub(r"\s*```\s*$", "", out)

    # Strip trailing commas:  ,}  →  }   and  ,]  →  ]
    out = re.sub(r",\s*([}\]])", r"\1", out)

    # Insert missing commas between adjacent string values / closing-brace boundaries.
    # Pattern matches a `"` or `}` or `]` or digit followed by whitespace then a `"`
    # that begins a key (so a `:` follows shortly after).
    out = re.sub(r'(["\]}0-9])\s*\n\s*(")', r"\1,\n\2", out)
    out = re.sub(r'(["\]}0-9])\s+(")(?=\s*[A-Za-z_][^"]*"\s*:)', r"\1,\2", out)

    # Auto-balance braces / brackets — close any that remain open at EOF.
    open_curly  = out.count("{") - out.count("}")
    open_square = out.count("[") - out.count("]")
    if open_square > 0:
        out += "]" * open_square
    if open_curly > 0:
        out += "}" * open_curly

    return out


def _strip_data_url(b64: str) -> str:
    """Frontend sometimes posts a `data:image/png;base64,...` prefix; strip it."""
    if b64.startswith("data:") and "," in b64:
        return b64.split(",", 1)[1]
    return b64


def _summarize_trader_context(ctx: dict[str, Any] | None) -> str:
    """Render the trader's behavioral DNA + recent trades as a compact prompt block."""
    if not ctx:
        return "No prior trading history available."

    bits: list[str] = []
    dna = ctx.get("dna") or {}
    if dna:
        sessions = dna.get("total_sessions") or dna.get("sessions") or 0
        loss_rate = dna.get("loss_rate") or 0
        avg_score = dna.get("average_score") or 0
        dom = dna.get("dominant_pattern") or "none"
        bits.append(
            f"Trader DNA: {sessions} sessions logged, {loss_rate:.0%} loss rate, "
            f"avg behavioral score {avg_score}, dominant pattern '{dom}'."
        )

    recent = ctx.get("recent_trades") or []
    if recent:
        losses = sum(1 for t in recent if t.get("is_loss"))
        symbols = ", ".join({t.get("symbol", "?") for t in recent[:6]}) or "—"
        bits.append(
            f"Today: {len(recent)} trades, {losses} losses; symbols touched: {symbols}."
        )

    margin_pct = ctx.get("margin_usage_pct")
    if isinstance(margin_pct, (int, float)):
        bits.append(f"Margin currently at {round(margin_pct)}% of capital.")

    streak = ctx.get("loss_streak")
    if isinstance(streak, int) and streak > 0:
        bits.append(f"Active loss streak: {streak} consecutive losing trades.")

    if not bits:
        return "No prior trading history available."
    return " ".join(bits)


# Empty-state structured response used whenever we can't get a real
# multimodal analysis — keeps the frontend schema identical.
def _stub(behavioral_warning: str, **extra: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "market_state":        "unknown",
        "market_structure": {
            "trend":              "unknown",
            "momentum":           "unknown",
            "volatility":         "unknown",
            "volume_confirmation":"unknown",
            "key_observation":    "Chart could not be analyzed.",
        },
        "behavioral_risk": {
            "fomo_probability":     0,
            "revenge_probability":  0,
            "panic_probability":    0,
            "overconfidence_risk":  0,
            "emotional_risk_level": "unknown",
            "primary_concern":      "—",
        },
        "decision_quality": {
            "score":             0,
            "rating":            "unknown",
            "entry_timing":      "—",
            "risk_reward":       "—",
            "stop_placement":    "—",
            "position_sizing":   "—",
        },
        "personalized_insight": behavioral_warning,
        "behavioral_warning":   behavioral_warning,
    }
    base.update(extra)
    return base


async def analyze_chart_image(
    image_b64: str,
    symbol: str = "",
    context: dict[str, Any] | None = None,
) -> str:
    """
    Legacy 1-line wrapper kept for backwards compat with the existing
    /analyze-chart response shape. Returns just the headline string.
    The structured payload is also logged and is accessible via
    `analyze_chart_full()` below.
    """
    res = await analyze_chart_full(image_b64, symbol=symbol, context=context)
    return res.get("personalized_insight") or res.get("behavioral_warning") \
        or "Unable to analyze chart. Please review carefully before trading."


async def analyze_chart_full(
    image_b64: str,
    symbol: str = "",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Four-layer behavioral analysis of a chart screenshot.

    `context` (optional) shapes the personalized insight. Expected keys:
        - dna:               behavioral_dna.get_behavioral_dna(mode) output
        - recent_trades:     list of recent trade dicts
        - margin_usage_pct:  current margin utilization
        - loss_streak:       int, active losing-trade streak
    """
    import ollama

    image_b64   = _strip_data_url(image_b64)
    symbol_hint = f" The chart is for {symbol}." if symbol else ""
    trader_ctx  = _summarize_trader_context(context)

    # Multi-line schema. Pretty-printed JSON in the example massively improves
    # the model's adherence — single-line schemas confuse it and cause missing
    # commas. We also tell it explicitly to keep keys on their own lines.
    prompt = f"""You are Finsight OS — a behavioral trading guardian. Look at the chart and judge the TRADER'S DECISION using their history below, not generic indicators. Speak directly to the trader.

Trader context: {trader_ctx}
Chart{symbol_hint}.

Reply with EXACTLY this JSON shape. All probabilities are integers 0 to 100. Replace each placeholder value but keep every key. Output nothing outside the braces.

{{
  "market_state": "trending or ranging or volatile",
  "market_structure": {{
    "trend": "up or down or sideways",
    "momentum": "strong or weakening or exhausted",
    "volatility": "low or normal or elevated or extreme",
    "volume_confirmation": "yes or no or unclear",
    "key_observation": "one short sentence about what you literally see"
  }},
  "behavioral_risk": {{
    "fomo_probability": 0,
    "revenge_probability": 0,
    "panic_probability": 0,
    "overconfidence_risk": 0,
    "emotional_risk_level": "low or medium or high",
    "primary_concern": "short phrase"
  }},
  "decision_quality": {{
    "score": 0,
    "rating": "poor or average or good",
    "entry_timing": "early or on-time or late",
    "risk_reward": "poor or acceptable or favorable",
    "stop_placement": "short phrase",
    "position_sizing": "small or standard or reduce"
  }},
  "personalized_insight": "one sentence linking THIS setup to the trader's history",
  "behavioral_warning": "one action-oriented sentence directly to the trader"
}}"""

    try:
        client = ollama.AsyncClient(host=OLLAMA_HOST)
        response = await asyncio.wait_for(
            client.generate(
                model    = OLLAMA_VISION_MODEL,
                prompt   = prompt,
                images   = [image_b64],
                format   = "json",                       # structured output
                options  = {
                    "temperature": 0.2,
                    # 500 predict gives the model room to FINISH the closing
                    # braces. Truncated JSON is the #1 cause of parse failures
                    # on CPU — better to spend 30s extra than to retry blind.
                    "num_predict": 500,
                    "num_ctx":     2560,
                    "num_thread":  int(os.getenv("OLLAMA_NUM_THREAD", "8")),
                    "num_gpu":     int(os.getenv("OLLAMA_NUM_GPU", "0")),
                },
                keep_alive = "5m",
            ),
            timeout=OLLAMA_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        return _stub(
            f"Chart analysis exceeded {OLLAMA_TIMEOUT_S}s on CPU. "
            f"Run `ollama pull moondream` and set OLLAMA_VISION_MODEL=moondream "
            "in backend/.env for ~10x faster CPU vision (1.7GB model). "
            f"Currently using `{OLLAMA_VISION_MODEL}`.",
            error=f"Vision inference exceeded {OLLAMA_TIMEOUT_S}s",
        )
    except ollama.ResponseError as e:                # type: ignore[attr-defined]
        msg = str(e)
        if "not found" in msg.lower() or "no such model" in msg.lower():
            return _stub(
                f"Vision model `{OLLAMA_VISION_MODEL}` isn't pulled. "
                f"Run `ollama pull {OLLAMA_VISION_MODEL}` to enable chart analysis.",
                error="model_not_pulled",
            )
        print(f"[Multimodal] Ollama error: {e}")
        return _stub("Chart not analyzed — vision model error.", error=str(e))
    except Exception as e:
        print(f"[Multimodal] Vision analysis failed: {type(e).__name__}: {e}")
        return _stub(
            "Unable to analyze chart. Please review carefully before trading.",
            error=f"{type(e).__name__}: {e}",
        )

    raw = (response.get("response") or "").strip()
    print(f"[Multimodal] {OLLAMA_VISION_MODEL} returned {len(raw)} chars")

    data = _parse_json_forgiving(raw)
    if data is None:
        return _stub(
            "Chart shows market activity — review carefully before trading.",
            error="json_parse_failed",
            raw=raw[:300],
        )

    # Normalize: ensure every required key is present (model sometimes
    # drops a nested object on smaller variants). Merge over the stub.
    merged = _stub(
        data.get("behavioral_warning")
            or data.get("personalized_insight")
            or "Review this chart carefully before placing any trade."
    )

    def merge_nested(top: str, source: dict[str, Any]) -> None:
        if not isinstance(source, dict): return
        for k, v in source.items():
            if k in merged[top] and v not in (None, "", "?"):
                merged[top][k] = v

    if isinstance(data.get("market_state"), str):
        merged["market_state"] = data["market_state"].lower()
    merge_nested("market_structure",  data.get("market_structure", {}) or {})
    merge_nested("behavioral_risk",   data.get("behavioral_risk", {}) or {})
    merge_nested("decision_quality",  data.get("decision_quality", {}) or {})
    if isinstance(data.get("personalized_insight"), str):
        merged["personalized_insight"] = data["personalized_insight"]
    if isinstance(data.get("behavioral_warning"), str):
        merged["behavioral_warning"]   = data["behavioral_warning"]

    # Clamp probability fields into 0–100
    for k in ("fomo_probability", "revenge_probability", "panic_probability", "overconfidence_risk"):
        v = merged["behavioral_risk"].get(k, 0)
        try:
            merged["behavioral_risk"][k] = max(0, min(100, int(v)))
        except (TypeError, ValueError):
            merged["behavioral_risk"][k] = 0
    try:
        merged["decision_quality"]["score"] = max(
            0, min(100, int(merged["decision_quality"].get("score", 0)))
        )
    except (TypeError, ValueError):
        merged["decision_quality"]["score"] = 0

    return merged
