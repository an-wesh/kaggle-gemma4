"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BehavioralDNA as BDNA } from "@/types";

export function BehavioralDNA() {
  const [dna, setDNA] = useState<BDNA | null>(null);

  useEffect(() => {
    api.getDNA().then(setDNA).catch(console.error);
  }, []);

  const sectionLabel: React.CSSProperties = {
    fontSize: "11px", fontWeight: "700", color: "#1A1814",
    textTransform: "uppercase", letterSpacing: "0.07em",
  };

  // ── Empty / building state ─────────────────────────────────────────────
  if (!dna || dna.total_sessions === 0) {
    return (
      <div style={{
        background: "#ffffff", borderRadius: "12px",
        border: "1px solid #E8E5DF", overflow: "hidden",
      }}>
        <div style={{
          padding: "11px 16px", borderBottom: "1px solid #E8E5DF",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "7px",
            background: "#FFF7ED", border: "1px solid #FED7AA",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#F97316" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span style={sectionLabel}>Behavioral DNA</span>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "12px", color: "#9B9890", lineHeight: "1.5" }}>
            Building your behavioral profile…
            Complete your first analysis session to see history.
          </p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...dna.sessions.map(s => s.score), 1);

  const statColor = (val: number, threshHigh: number, threshMed: number) =>
    val >= threshHigh ? "#DC2626" : val >= threshMed ? "#D97706" : "#16A34A";

  const stats = [
    {
      label: "Avg Score",
      value: String(dna.avg_score),
      color: statColor(dna.avg_score, 600, 300),
    },
    {
      label: "High Risk",
      value: `${Math.round(dna.high_risk_rate * 100)}%`,
      color: statColor(dna.high_risk_rate * 100, 60, 30),
    },
    {
      label: "Streak",
      value: `${dna.streak_days}d`,
      color: dna.streak_days > 2 ? "#DC2626" : "#6B6860",
    },
  ];

  return (
    <div style={{
      background: "#ffffff", borderRadius: "12px",
      border: "1px solid #E8E5DF", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px", borderBottom: "1px solid #E8E5DF",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px",
          background: "#FFF7ED", border: "1px solid #FED7AA",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#F97316" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <span style={sectionLabel}>Behavioral DNA</span>
        <span style={{
          marginLeft: "auto", fontSize: "10px", color: "#9B9890",
          background: "#F9F8F6", border: "1px solid #E8E5DF",
          borderRadius: "99px", padding: "2px 7px",
        }}>
          {dna.total_sessions} sessions
        </span>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {stats.map(s => (
            <div key={s.label} style={{
              padding: "10px 8px", borderRadius: "8px", textAlign: "center",
              background: "#F9F8F6", border: "1px solid #E8E5DF",
            }}>
              <div style={{ fontSize: "16px", fontWeight: "800", color: s.color,
                fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "10px", color: "#9B9890", marginTop: "3px",
                fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Dominant pattern */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px", borderRadius: "8px",
          background: "#FEF2F2", border: "1px solid #FECACA",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            <polyline points="17 18 23 18 23 12"/>
          </svg>
          <p style={{ fontSize: "12px", color: "#991B1B" }}>
            Dominant:{" "}
            <span style={{ fontWeight: "700" }}>{dna.dominant_pattern}</span>
          </p>
        </div>

        {/* Bar chart */}
        <div>
          <p style={{ fontSize: "10px", color: "#9B9890", marginBottom: "7px",
            fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk score — last {dna.sessions.length} sessions
          </p>

          {/* Y-axis labels + bars */}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            {/* Y labels */}
            <div style={{
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              height: "56px", paddingBottom: "2px",
            }}>
              {["1k", "500", "0"].map(l => (
                <span key={l} style={{ fontSize: "9px", color: "#C8C5BE", lineHeight: 1 }}>{l}</span>
              ))}
            </div>

            {/* Bars */}
            <div style={{
              flex: 1, display: "flex", alignItems: "flex-end",
              gap: "3px", height: "56px",
              borderLeft: "1px solid #E8E5DF",
              borderBottom: "1px solid #E8E5DF",
              padding: "2px 0 0 4px",
            }}>
              {dna.sessions.map((s, i) => {
                const barColor = s.score > 600 ? "#DC2626"
                               : s.score > 300 ? "#D97706"
                               : "#16A34A";
                const heightPct = Math.max(6, (s.score / maxScore) * 100);

                return (
                  <div
                    key={i}
                    title={`${s.date}: ${s.score}`}
                    style={{
                      flex: 1, borderRadius: "3px 3px 0 0",
                      background: barColor,
                      height: `${heightPct}%`,
                      transition: "height 0.5s ease",
                      cursor: "default",
                      opacity: 0.85,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "12px", marginTop: "7px", justifyContent: "flex-end" }}>
            {[
              { color: "#16A34A", label: "Low" },
              { color: "#D97706", label: "Med" },
              { color: "#DC2626", label: "High" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: l.color }} />
                <span style={{ fontSize: "10px", color: "#9B9890" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}