"""
behavioral_dna.py — Longitudinal behavioral pattern memory.

Stores trading session history locally in SQLite, **per mode**:
  - data/behavioral_dna_demo.db  → only demo-mode session history
  - data/behavioral_dna_user.db  → paper + kite mode session history

Splitting the database per mode prevents the demo's accumulated
"100% high-risk · 30d streak" sessions from polluting Paper Trading
mode (where the user has placed zero trades and should see a clean slate).

Privacy-first: all data stays on device.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from models import BehavioralAnalysis

DB_DIR = Path("data")
DB_DIR.mkdir(parents=True, exist_ok=True)

DB_PATHS = {
    "demo":  DB_DIR / "behavioral_dna_demo.db",
    "paper": DB_DIR / "behavioral_dna_paper.db",
    "kite":  DB_DIR / "behavioral_dna_kite.db",
}

# Backward-compat alias
DB_PATH = DB_PATHS["demo"]


def _db_path(mode: str = "demo") -> Path:
    return DB_PATHS.get(mode, DB_PATHS["demo"])


def init_db(mode: str = "demo"):
    with sqlite3.connect(_db_path(mode)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                date TEXT,
                trades_count INTEGER,
                loss_count INTEGER,
                pattern TEXT,
                behavioral_score INTEGER,
                max_margin_used REAL,
                nudge_message TEXT,
                vows_violated TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)


def save_session(session_id: str, analysis: BehavioralAnalysis,
                 trades_count: int, max_margin: float,
                 mode: str = "demo"):
    """
    Persist a session to the mode-specific DNA database. Skip persistence
    entirely for empty-context sessions in non-demo modes — those would
    otherwise pollute the user's history with placeholder analyses.
    """
    # Don't pollute paper/kite history with empty-context analyses
    if mode != "demo" and trades_count == 0:
        return

    init_db(mode)
    with sqlite3.connect(_db_path(mode)) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO sessions VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            session_id, datetime.now().isoformat(),
            trades_count,
            sum(1 for v in analysis.vows_violated if v),
            analysis.detected_pattern,
            analysis.behavioral_score,
            max_margin,
            analysis.nudge_message,
            json.dumps(analysis.vows_violated),
        ))


def get_behavioral_dna(mode: str = "demo") -> dict:
    """Returns aggregated insights from past sessions for the given mode."""
    init_db(mode)
    with sqlite3.connect(_db_path(mode)) as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY date DESC LIMIT 30"
        ).fetchall()

    if not rows:
        return {"total_sessions": 0, "dominant_pattern": "Unknown",
                "avg_score": 0, "high_risk_rate": 0.0,
                "worst_score": 0, "streak_days": 0, "sessions": []}

    scores = [r[5] for r in rows]
    patterns = [r[4] for r in rows]
    high_risk = sum(1 for s in scores if s > 600)

    pattern_counts: dict[str, int] = {}
    for p in patterns:
        pattern_counts[p] = pattern_counts.get(p, 0) + 1
    dominant = max(pattern_counts, key=pattern_counts.get)

    streak = 0
    for r in rows:
        if r[5] > 600:
            streak += 1
        else:
            break

    return {
        "total_sessions": len(rows),
        "dominant_pattern": dominant,
        "avg_score": round(sum(scores) / len(scores)),
        "high_risk_rate": round(high_risk / len(rows), 2),
        "worst_score": max(scores),
        "streak_days": streak,
        "sessions": [
            {"date": r[1][:10], "score": r[5], "pattern": r[4]}
            for r in rows[-14:]
        ],
    }


def get_historical_context(mode: str = "demo") -> tuple[int, float]:
    """Returns (total_sessions, historical_loss_rate) for prompt enrichment."""
    dna = get_behavioral_dna(mode=mode)
    return dna["total_sessions"], dna["high_risk_rate"]
