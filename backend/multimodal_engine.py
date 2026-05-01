"""
multimodal_engine.py — Uses Gemma 4's vision capabilities to analyze
trading chart screenshots. This showcases a KEY Gemma 4 differentiator.
"""

import base64
import json
import re
import os
from pathlib import Path

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")


async def analyze_chart_image(image_b64: str, symbol: str = "") -> str:
    """
    Analyzes a trading chart screenshot using Gemma 4's vision.
    Returns a behavioral insight about the price action.
    """
    import ollama

    prompt = f"""You are a behavioral finance expert analyzing a trading chart.
Look at this {symbol} chart screenshot and identify:
1. The overall trend (up/down/sideways)
2. Any dangerous patterns (sharp drops, gap-downs, extreme volatility)
3. Whether this chart suggests a panic or FOMO situation
4. ONE sentence behavioral warning for a retail investor viewing this

Respond with only JSON:
{{"trend": "up|down|sideways", "danger_level": "low|medium|high",
  "pattern_visible": "describe what you see",
  "behavioral_warning": "one sentence for the trader"}}"""

    try:
        response = await ollama.AsyncClient(host=OLLAMA_HOST).generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            images=[image_b64],
            options={"temperature": 0.1, "num_predict": 200, "num_ctx": 1024},
        )
        raw = response["response"]
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            data = json.loads(match.group())
            return data.get("behavioral_warning", "Chart shows high volatility — trade with caution.")
    except Exception as e:
        print(f"[Multimodal] Vision analysis failed: {e}")

    return "Unable to analyze chart. Please review carefully before trading."
