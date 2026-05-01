"use client";
import { useEffect, useRef, useState } from "react";
import type { BehavioralAnalysis } from "@/types";
import { api } from "@/lib/api";

/**
 * Map a behavioral score + detected pattern to a Speed Bump cooldown.
 *
 * The "Mindful Speed Bump" idea is that more dangerous patterns require
 * more cognitive friction. Revenge Trading at score 892 is a 12-second
 * cooldown; Addiction Loop near 1000 deserves more; light FOMO needs less.
 *
 * Range: 6s (low edge of high-risk) to 18s (worst case). The exact-match
 * commitment phrase + this clock both gate the Confirm button.
 */
function computeCooldown(analysis: BehavioralAnalysis | null): number {
  if (!analysis || analysis.risk_level !== "high") return 0;
  const score = analysis.behavioral_score;
  // Score ramp: 600 → 6s, 800 → 10s, 950 → 14s
  let s = Math.max(6, Math.min(14, Math.round(6 + (score - 600) * 0.023)));
  // Pattern multiplier: addiction loop is the worst, healthy / panic less so
  switch (analysis.detected_pattern) {
    case "Addiction Loop":   s = Math.min(18, Math.round(s * 1.4)); break;
    case "Revenge Trading":  s = Math.min(18, Math.round(s * 1.15)); break;
    case "Over-Leveraging":  s = Math.min(18, Math.round(s * 1.1));  break;
    case "FOMO":             s = Math.max(6,  Math.round(s * 0.95)); break;
    default: break;
  }
  return s;
}

// Realistic NSE instruments with early-2026 prices
const INSTRUMENTS = [
  { symbol: "RELIANCE",              price: 1298.40 },
  { symbol: "INFY",                  price: 1847.60 },
  { symbol: "TCS",                   price: 4102.50 },
  { symbol: "HDFCBANK",              price: 1782.90 },
  { symbol: "TATAMOTORS",            price: 984.20  },
  { symbol: "NIFTY24DEC23000CE",     price: 187.50  },
  { symbol: "BANKNIFTY24DEC49000PE", price: 224.30  },
];

interface Props {
  analysis: BehavioralAnalysis | null;
  onTradeExecuted?: () => void;
}

export function TradePanel({ analysis, onTradeExecuted }: Props) {
  const [symbol,   setSymbol]   = useState(INSTRUMENTS[0].symbol);
  const [quantity, setQuantity] = useState(10);
  const [price,    setPrice]    = useState(INSTRUMENTS[0].price);
  const [action,   setAction]   = useState<"BUY" | "SELL">("BUY");

  // Speed Bump state
  const [showBump,    setShowBump]    = useState(false);
  const [typed,       setTyped]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);

  // Cooldown state — counts down from cooldownTotal in 100ms ticks.
  const cooldownTotal = computeCooldown(analysis);
  const [cooldownMs, setCooldownMs] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHigh   = analysis?.risk_level === "high";
  const required = analysis?.nudge_message ?? "";
  const matches  = required.length > 0 &&
    typed.trim().toLowerCase() === required.trim().toLowerCase();
  const cooldownDone = cooldownMs <= 0;
  const canConfirm   = matches && cooldownDone && !loading;

  // When the modal opens, kick off the cooldown clock.
  useEffect(() => {
    if (!showBump) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    const totalMs = cooldownTotal * 1000;
    setCooldownMs(totalMs);
    const id = setInterval(() => {
      setCooldownMs(prev => {
        const next = prev - 100;
        if (next <= 0) {
          if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
          return 0;
        }
        return next;
      });
    }, 100);
    tickRef.current = id;
    return () => {
      clearInterval(id);
      if (tickRef.current === id) tickRef.current = null;
    };
  }, [showBump, cooldownTotal]);

  function handleSymbolChange(sym: string) {
    setSymbol(sym);
    const inst = INSTRUMENTS.find(i => i.symbol === sym);
    if (inst) setPrice(inst.price);
    setDone(false);
    setTyped("");
    setShowBump(false);
  }

  function handleQtyChange(val: number) {
    setQuantity(Math.max(1, Math.floor(val) || 1));
  }

  function handlePriceChange(val: number) {
    setPrice(Math.max(0.05, Number(val.toFixed(2)) || 0.05));
  }

  function handleTradeClick(type: "BUY" | "SELL") {
    setAction(type);
    if (isHigh) {
      setTyped("");
      setShowBump(true);
    } else {
      executeTrade(type);
    }
  }

  async function executeTrade(type: "BUY" | "SELL") {
    setLoading(true);
    try {
      await api.confirmTrade(symbol, quantity, price, type);
      setDone(true);
      onTradeExecuted?.();
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error("Trade failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!canConfirm) return;
    setShowBump(false);
    setTyped("");
    await executeTrade(action);
  }

  const orderValue = (quantity * price).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ── Shared input style ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid #D0CCC4",
    borderRadius: "8px",
    background: "#F9F8F6",
    color: "#1A1814",
    fontSize: "13px",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    fontWeight: "700",
    color: "#9B9890",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "5px",
  };

  return (
    <>
      {/* ── Speed Bump overlay ──────────────────────────────────────────── */}
      {showBump && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(26,24,20,0.45)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "28px 26px",
            maxWidth: "440px",
            width: "100%",
            border: "1px solid #FECACA",
            boxShadow: "0 24px 64px rgba(220,38,38,0.12), 0 4px 16px rgba(0,0,0,0.08)",
          }}>
            {/* Icon with cooldown ring */}
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              {(() => {
                const SIZE = 64, R = 28, CIRC = 2 * Math.PI * R;
                const totalMs = cooldownTotal * 1000;
                const progress = totalMs > 0 ? cooldownMs / totalMs : 0;  // 1 → 0
                const offset   = CIRC * (1 - progress);                   // depletes
                const ringColor = cooldownDone ? "#16A34A" : "#DC2626";

                return (
                  <div style={{
                    position: "relative", width: `${SIZE}px`, height: `${SIZE}px`,
                    margin: "0 auto 14px",
                  }}>
                    {/* Cooldown progress ring */}
                    <svg width={SIZE} height={SIZE} style={{
                      position: "absolute", inset: 0, transform: "rotate(-90deg)",
                    }}>
                      <circle cx={SIZE/2} cy={SIZE/2} r={R}
                        fill="none" stroke="#FECACA" strokeWidth="3"/>
                      <circle cx={SIZE/2} cy={SIZE/2} r={R}
                        fill="none" stroke={ringColor} strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={CIRC}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
                      />
                    </svg>
                    {/* Inner circle with warning icon OR countdown number */}
                    <div style={{
                      position: "absolute", inset: "8px",
                      borderRadius: "50%",
                      background: "#FEF2F2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1.5px solid #FECACA",
                    }}>
                      {cooldownDone ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                          stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: "16px", fontWeight: "800", color: "#DC2626",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {Math.ceil(cooldownMs / 1000)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <h3 style={{
                fontSize: "18px", fontWeight: "800", color: "#1A1814",
                marginBottom: "6px", letterSpacing: "-0.01em",
              }}>
                Mindful Speed Bump
              </h3>
              <p style={{ fontSize: "13px", color: "#6B6860", lineHeight: "1.6" }}>
                Gemma 4 detected{" "}
                <strong style={{ color: "#DC2626" }}>{analysis?.detected_pattern}</strong>
                {" "}— behavioral score{" "}
                <strong style={{ color: "#DC2626" }}>{analysis?.behavioral_score}/1000</strong>.
                {cooldownDone
                  ? " Type your commitment to continue."
                  : ` Reflect for ${cooldownTotal} seconds, then type your commitment.`}
              </p>
            </div>

            {/* Phrase box */}
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "10px", padding: "12px 16px", marginBottom: "14px",
            }}>
              <p style={{
                fontSize: "10px", fontWeight: "700", color: "#DC2626",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px",
              }}>
                Type this exactly:
              </p>
              <p style={{
                fontSize: "14px", color: "#991B1B",
                fontStyle: "italic", lineHeight: "1.6",
              }}>
                "{required}"
              </p>
            </div>

            {/* Input */}
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCommit()}
              placeholder="Type the commitment phrase above..."
              autoFocus
              style={{
                ...inputStyle,
                marginBottom: "10px",
                border: `1.5px solid ${matches ? "#16A34A" : typed.length > 0 ? "#F97316" : "#D0CCC4"}`,
                background: matches ? "#F0FDF4" : "#ffffff",
                fontFamily: "'DM Mono', 'Courier New', monospace",
                fontSize: "13px",
              }}
            />

            {/* Progress bar */}
            {typed.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{
                  flex: 1, height: "3px", background: "#E8E5DF",
                  borderRadius: "2px", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    background: matches ? "#16A34A" : "#F97316",
                    width: `${Math.min(100, (typed.length / required.length) * 100)}%`,
                    transition: "width 0.1s, background 0.3s",
                  }} />
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: "600",
                  color: matches ? "#16A34A" : "#9B9890",
                  minWidth: "48px", textAlign: "right",
                }}>
                  {matches ? "✓ Match" : `${typed.length}/${required.length}`}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setShowBump(false); setTyped(""); }}
                style={{
                  flex: 1, padding: "11px", borderRadius: "8px",
                  border: "1px solid #D0CCC4", background: "transparent",
                  color: "#6B6860", fontSize: "13px", cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!canConfirm}
                style={{
                  flex: 2, padding: "11px", borderRadius: "8px",
                  border: "none", fontSize: "13px", fontWeight: "700",
                  cursor: canConfirm ? "pointer" : "not-allowed",
                  background: canConfirm ? "#DC2626" : "#E8E5DF",
                  color: canConfirm ? "#ffffff" : "#9B9890",
                  transition: "all 0.2s",
                }}
              >
                {loading
                  ? "Placing order..."
                  : !cooldownDone
                    ? `Reflect · ${Math.ceil(cooldownMs / 1000)}s`
                    : !matches
                      ? "Complete phrase to unlock"
                      : `✓ Confirm ${action}`}
              </button>
            </div>

            <p style={{
              textAlign: "center", fontSize: "11px",
              color: "#9B9890", marginTop: "12px",
            }}>
              This pause is for your protection · Finsight OS
            </p>
          </div>
        </div>
      )}

      {/* ── Trade card ──────────────────────────────────────────────────── */}
      <div style={{
        background: "#ffffff", borderRadius: "12px",
        border: "1px solid #E8E5DF", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "11px 16px", borderBottom: "1px solid #E8E5DF",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontSize: "11px", fontWeight: "700", color: "#1A1814",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            Place Order
          </span>

          {isHigh && (
            <span style={{
              fontSize: "11px", fontWeight: "600", color: "#DC2626",
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "99px", padding: "2px 9px",
            }}>
              ⚠ High Risk — commitment required
            </span>
          )}
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Instrument selector */}
          <div>
            <label style={labelStyle}>Instrument</label>
            <select
              value={symbol}
              onChange={e => handleSymbolChange(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            >
              {INSTRUMENTS.map(i => (
                <option key={i.symbol} value={i.symbol}>{i.symbol}</option>
              ))}
            </select>
          </div>

          {/* Qty + Price row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={e => handleQtyChange(Number(e.target.value))}
                onBlur={e => handleQtyChange(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Price (₹)</label>
              <input
                type="number"
                min="0.05"
                step="0.05"
                value={price}
                onChange={e => handlePriceChange(Number(e.target.value))}
                onBlur={e => handlePriceChange(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Order value summary */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 12px", borderRadius: "8px",
            background: "#F9F8F6", border: "1px solid #E8E5DF",
          }}>
            <span style={{ fontSize: "12px", color: "#9B9890" }}>Order value</span>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#1A1814",
              fontVariantNumeric: "tabular-nums" }}>
              ₹{orderValue}
            </span>
          </div>

          {/* BUY / SELL — always clickable; Speed Bump fires on click when high risk */}
          {done ? (
            <div style={{
              padding: "13px", borderRadius: "8px", textAlign: "center",
              background: "#F0FDF4", border: "1px solid #BBF7D0",
            }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#16A34A" }}>
                ✓ Order placed successfully
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={() => handleTradeClick("BUY")}
                disabled={loading}
                style={{
                  padding: "12px", borderRadius: "8px", border: "none",
                  background: "#16A34A", color: "#ffffff",
                  fontSize: "14px", fontWeight: "800",
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                  opacity: loading ? 0.7 : 1,
                  transition: "opacity 0.15s, transform 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                BUY
              </button>
              <button
                onClick={() => handleTradeClick("SELL")}
                disabled={loading}
                style={{
                  padding: "12px", borderRadius: "8px", border: "none",
                  background: "#DC2626", color: "#ffffff",
                  fontSize: "14px", fontWeight: "800",
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                  opacity: loading ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                SELL
              </button>
            </div>
          )}

          {/* Informational note when high risk */}
          {isHigh && !done && (
            <p style={{
              fontSize: "11px", color: "#DC2626", textAlign: "center",
              lineHeight: "1.5",
            }}>
              Gemma 4 detected <strong>{analysis?.detected_pattern}</strong>.
              A commitment phrase will be required before your order executes.
            </p>
          )}
        </div>
      </div>
    </>
  );
}