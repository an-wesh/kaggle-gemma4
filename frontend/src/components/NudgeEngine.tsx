"use client";
import { useEffect, useState } from "react";
import type { BehavioralAnalysis } from "@/types";

interface Props {
  analysis: BehavioralAnalysis | null;
}

export function NudgeEngine({ analysis }: Props) {
  const [showToast, setShowToast] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);

  useEffect(() => {
    if (!analysis) return;

    // Only fire nudge when score changes (new analysis arrived)
    if (analysis.behavioral_score === lastScore) return;
    setLastScore(analysis.behavioral_score);
    setDismissed(false);

    if (analysis.risk_level === "medium") {
      setShowToast(true);
      // Auto-dismiss after 6 seconds
      const id = setTimeout(() => setShowToast(false), 6000);
      return () => clearTimeout(id);
    }

    if (analysis.risk_level === "high") {
      setShowToast(true);
      // High risk banner stays until dismissed
    }
  }, [analysis]);

  if (!analysis || dismissed) return null;

  // ── SOFT nudge — medium risk toast (bottom-right, auto-dismisses) ─────
  if (analysis.risk_level === "medium" && showToast) {
    return (
      <div style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 45,
        maxWidth: "340px", width: "100%",
        background: "#ffffff", borderRadius: "12px",
        border: "1px solid #FDE68A",
        boxShadow: "0 8px 32px rgba(217,119,6,0.15), 0 2px 8px rgba(0,0,0,0.06)",
        padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: "12px",
        animation: "slideUp 0.25s ease-out",
      }}>
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Icon */}
        <div style={{
          width: "34px", height: "34px", borderRadius: "8px", flexShrink: 0,
          background: "#FFFBEB", border: "1px solid #FDE68A",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#D97706" strokeWidth="2.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400E", marginBottom: "3px" }}>
            Finsight Notice · Medium Risk
          </p>
          <p className="behavioral-message" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            {analysis.detected_pattern} pattern detected.
            Behavioral score: {analysis.behavioral_score}/1000.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setShowToast(false)}
          style={{
            flexShrink: 0, width: "20px", height: "20px",
            border: "none", background: "transparent",
            cursor: "pointer", color: "#9B9890",
            fontSize: "14px", lineHeight: "1",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>
    );
  }

  // ── MEDIUM nudge — high risk sticky top banner ─────────────────────────
  if (analysis.risk_level === "high" && showToast && !dismissed) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 45,
        background: "#FEF2F2",
        borderBottom: "1px solid #FECACA",
        padding: "10px 20px",
        display: "flex", alignItems: "center", gap: "12px",
        boxShadow: "0 2px 8px rgba(220,38,38,0.10)",
        animation: "slideDown 0.2s ease-out",
      }}>
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Pulsing dot */}
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
          background: "#DC2626",
          boxShadow: "0 0 0 3px #FEF2F2, 0 0 0 5px #DC262640",
          animation: "pulse 1.5s infinite",
        }} />

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#991B1B" }}>
            ⚠ High Risk Detected — {analysis.detected_pattern}
          </span>
          <span className="behavioral-message" style={{
            fontSize: "12px", marginLeft: "8px",
            fontStyle: "italic",
          }}>
            "{analysis.nudge_message}"
          </span>
        </div>

        <span style={{
          fontSize: "11px", fontWeight: "600", color: "#DC2626",
          background: "#FEF2F2", border: "1px solid #FECACA",
          borderRadius: "99px", padding: "2px 8px", flexShrink: 0,
        }}>
          Score {analysis.behavioral_score}/1000
        </span>

        <button
          onClick={() => setDismissed(true)}
          style={{
            flexShrink: 0, border: "none", background: "transparent",
            cursor: "pointer", color: "#9B9890", fontSize: "18px",
            lineHeight: "1", padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}