"""
evaluate.py — Side-by-side benchmark: base Gemma 4 E2B vs. LoRA adapter.

Metrics
-------
1. JSON validity              — fraction of outputs that parse cleanly
2. Schema completeness        — fraction with all required keys
3. Pattern accuracy           — exact-match against ground-truth pattern
4. Risk-level accuracy        — exact-match against ground-truth risk_level
5. Score MAE                  — mean absolute error vs. ground-truth score
6. Vow-recall                 — F1 on the violated-vow set
7. SEBI-citation grounding    — fraction whose disclosure cites a real
                                circular id from rag_engine.py seed corpus
8. Mean inference latency     — wall-clock per example (single GPU)

Output
------
A markdown table written to stdout AND to docs/finetune-results.md so the
writeup can pull the numbers in directly.

Usage
-----
    python evaluate.py \
        --base-model google/gemma-4-2b-it \
        --adapter adapters/v1 \
        --test data/sebi_test.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import time
from pathlib import Path
from typing import Any

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

REQUIRED_KEYS = {
    "behavioral_score", "risk_level", "detected_pattern",
    "nudge_message", "nudge_message_local", "vows_violated",
    "crisis_score", "sebi_disclosure",
}

SEBI_VALID_CIRCULARS = {
    "SEBI F&O Study FY2024-25",
    "SEBI/HO/MIRSD/PoD-1/P/CIR/2024/001",
    "SEBI Investor Charter 2021",
    "SEBI Investor Protection Guidelines",
    "SEBI Peak Margin Circular 2021",
}


def extract_json(raw: str) -> dict | None:
    """Same brace-balanced extractor as the live ai_engine.py path."""
    start = raw.find("{")
    if start < 0: return None
    depth, in_string, escape = 0, False, False
    for i in range(start, len(raw)):
        c = raw[i]
        if escape: escape = False; continue
        if c == "\\": escape = True; continue
        if c == '"': in_string = not in_string; continue
        if in_string: continue
        if c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:    return json.loads(raw[start:i+1])
                except: return None
    return None


def grounded_in_sebi(disclosure: str) -> bool:
    """Heuristic: did the disclosure cite a real SEBI circular id?"""
    if not disclosure: return False
    return any(cid in disclosure for cid in SEBI_VALID_CIRCULARS)


def vow_f1(pred: list[str], gold: list[str]) -> float:
    if not pred and not gold: return 1.0
    if not pred or not gold: return 0.0
    p_set, g_set = {v.lower().strip() for v in pred}, {v.lower().strip() for v in gold}
    tp = len(p_set & g_set)
    if tp == 0: return 0.0
    precision = tp / len(p_set); recall = tp / len(g_set)
    return 2 * precision * recall / (precision + recall)


def make_prompt(scenario: dict) -> str:
    return (
        "<start_of_turn>user\n"
        "You are Finsight OS, a behavioral guardian for retail F&O traders in India.\n"
        "Analyze this trading session and reply with the JSON schema only.\n\n"
        f"DATA\n"
        f"Losses this session: {scenario['losses']} | Total loss: ₹{scenario['total_loss_inr']:.0f}\n"
        f"Margin used: {scenario['margin_pct']}%\n"
        f"Vows: {scenario['vows']}\n"
        f"History: {scenario['history_sessions']} sessions, "
        f"{scenario['history_high_risk_rate']*100:.0f}% high-risk rate\n"
        f"Last trade: {scenario['last_trade_outcome']}\n"
        f"Preferred language: {scenario['language']}\n"
        f"<end_of_turn>\n<start_of_turn>model\n"
    )


def run_inference(model, tokenizer, prompt: str, max_new_tokens: int = 280) -> tuple[str, float]:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    t0 = time.time()
    with torch.no_grad():
        out = model.generate(
            **inputs, max_new_tokens=max_new_tokens, do_sample=False, temperature=0.1,
        )
    elapsed = time.time() - t0
    text = tokenizer.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    return text, elapsed


def score_run(test_examples: list[dict], model, tokenizer, label: str) -> dict[str, Any]:
    print(f"[eval] Scoring {label} on {len(test_examples)} examples…")
    json_ok = 0; schema_ok = 0
    pattern_correct = 0; risk_correct = 0
    score_errors: list[float] = []
    vow_f1s: list[float] = []
    sebi_grounded = 0
    latencies: list[float] = []

    for i, ex in enumerate(test_examples):
        prompt = make_prompt(ex["scenario"])
        raw, elapsed = run_inference(model, tokenizer, prompt)
        latencies.append(elapsed)

        data = extract_json(raw)
        if data is None: continue
        json_ok += 1

        if REQUIRED_KEYS.issubset(data.keys()): schema_ok += 1

        if data.get("detected_pattern") == ex["response"]["detected_pattern"]:
            pattern_correct += 1
        if data.get("risk_level") == ex["response"]["risk_level"]:
            risk_correct += 1

        try:
            score_errors.append(abs(int(data.get("behavioral_score", 0)) -
                                    ex["response"]["behavioral_score"]))
        except (ValueError, TypeError):
            score_errors.append(1000.0)

        vow_f1s.append(vow_f1(data.get("vows_violated", []) or [],
                              ex["response"]["vows_violated"]))

        if grounded_in_sebi(data.get("sebi_disclosure", "")):
            sebi_grounded += 1

        if (i + 1) % 5 == 0:
            print(f"  [{i+1}/{len(test_examples)}] avg-latency={statistics.mean(latencies):.2f}s")

    n = len(test_examples)
    return {
        "label": label,
        "n": n,
        "json_validity": json_ok / n,
        "schema_completeness": schema_ok / n,
        "pattern_accuracy": pattern_correct / n,
        "risk_accuracy": risk_correct / n,
        "score_mae": statistics.mean(score_errors) if score_errors else float("nan"),
        "vow_f1": statistics.mean(vow_f1s) if vow_f1s else float("nan"),
        "sebi_grounding": sebi_grounded / n,
        "mean_latency_s": statistics.mean(latencies),
    }


def render_markdown(base: dict, adapted: dict) -> str:
    rows = [
        ("JSON validity",          "{:.1%}",  "json_validity"),
        ("Schema completeness",    "{:.1%}",  "schema_completeness"),
        ("Pattern accuracy",       "{:.1%}",  "pattern_accuracy"),
        ("Risk-level accuracy",    "{:.1%}",  "risk_accuracy"),
        ("Score MAE (lower=better)", "{:.1f}", "score_mae"),
        ("Vow-violation F1",       "{:.3f}",  "vow_f1"),
        ("SEBI citation grounding", "{:.1%}", "sebi_grounding"),
        ("Mean latency (s)",       "{:.2f}",  "mean_latency_s"),
    ]
    lines = [
        f"# Fine-tune evaluation · n={base['n']} held-out examples",
        "",
        "| Metric | Base Gemma 4 E2B | + SEBI LoRA Adapter | Δ |",
        "|---|---:|---:|---:|",
    ]
    for label, fmt, key in rows:
        b = base[key]; a = adapted[key]
        delta = a - b
        delta_fmt = "{:+.1%}" if "%" in fmt or "1%" in fmt else "{:+.2f}"
        if "MAE" in label or "latency" in label:
            delta_fmt = "{:+.2f}"
        lines.append(
            f"| {label} | {fmt.format(b)} | {fmt.format(a)} | {delta_fmt.format(delta)} |"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="google/gemma-4-2b-it")
    parser.add_argument("--adapter", required=True, help="Path to trained adapter directory")
    parser.add_argument("--test", required=True, help="Path to test JSONL")
    parser.add_argument("--out", default="../docs/finetune-results.md")
    args = parser.parse_args()

    test_examples = [json.loads(l) for l in Path(args.test).read_text(encoding="utf-8").splitlines() if l.strip()]
    print(f"[eval] {len(test_examples)} test examples")

    bnb = BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None: tokenizer.pad_token = tokenizer.eos_token

    print("[eval] Loading base model…")
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model, quantization_config=bnb, device_map="auto",
        torch_dtype=torch.float16, attn_implementation="eager",
    )
    base_results = score_run(test_examples, base_model, tokenizer, "base")
    del base_model; torch.cuda.empty_cache()

    print("[eval] Loading adapter…")
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model, quantization_config=bnb, device_map="auto",
        torch_dtype=torch.float16, attn_implementation="eager",
    )
    adapted_model = PeftModel.from_pretrained(base_model, args.adapter)
    adapted_results = score_run(test_examples, adapted_model, tokenizer, "adapter")

    md = render_markdown(base_results, adapted_results)
    print("\n" + md)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")
    print(f"[eval] Wrote {out_path}")


if __name__ == "__main__":
    main()
