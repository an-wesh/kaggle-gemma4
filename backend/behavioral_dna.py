"""
behavioral_dna.py — Longitudinal behavioral pattern memory.
Stores trading session history locally in SQLite.
This is what makes Finsight OS personal: it LEARNS your patterns.
Privacy-first: all data stays on device.
"""

import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from models import DNASession, BehavioralAnalysis

DB_PATH = Path("data/behavioral_dna.db")
DB_PATH.parent.mkdir(exist_ok=True)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
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
                 trades_count: int, max_margin: float):
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
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

def get_behavioral_dna() -> dict:
    """Returns aggregated insights from all past sessions."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY date DESC LIMIT 30"
        ).fetchall()

    if not rows:
        return {"total_sessions": 0, "dominant_pattern": "Unknown",
                "avg_score": 0, "high_risk_rate": 0.0,
                "worst_day": None, "streak_days": 0}

    scores = [r[5] for r in rows]
    patterns = [r[4] for r in rows]
    high_risk = sum(1 for s in scores if s > 600)

    # Pattern frequency
    pattern_counts = {}
    for p in patterns:
        pattern_counts[p] = pattern_counts.get(p, 0) + 1
    dominant = max(pattern_counts, key=pattern_counts.get)

    # Consecutive high-risk streak
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
            for r in rows[-14:]  # Last 14 sessions for chart
        ],
    }

def get_historical_context() -> tuple[int, float]:
    """Returns (total_sessions, historical_loss_rate) for prompt enrichment."""
    dna = get_behavioral_dna()
    return dna["total_sessions"], dna["high_risk_rate"]
