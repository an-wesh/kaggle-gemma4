"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useStreamingAnalysis } from "@/hooks/useStreamingAnalysis";
import { FinsightIntelligence } from "./FinsightIntelligence";
import { NudgeEngine } from "./NudgeEngine";
import { TradePanel } from "./TradePanel";
import { TradingVows } from "./TradingVows";
import { BehavioralDNA } from "./BehavioralDNA";
import { ThinkingLog } from "./ThinkingLog";
import { ChartAnalyzer } from "./ChartAnalyzer";
import { CrisisSupport } from "./CrisisSupport";
import { LanguageSelector } from "./LanguageSelector";
import { api } from "@/lib/api";
import type {
  Language, MarketSnapshot, MarketState,
  PaperTrade, SessionPnL, OpenPosition,
} from "@/types";

// ── NSE watchlist symbols (display order) ─────────────────────────────────
// Real prices come from /market-quotes (Yahoo Finance). These bases are only
// used for the very first paint, before the first fetch resolves.
const BASE_INSTRUMENTS = [
  { sym: "NIFTY 50",   base: 23547.85 },
  { sym: "BANKNIFTY",  base: 49820.10 },
  { sym: "RELIANCE",   base: 1298.40  },
  { sym: "INFY",       base: 1847.60  },
  { sym: "TCS",        base: 4102.50  },
  { sym: "HDFCBANK",   base: 1782.90  },
  { sym: "TATAMOTORS", base: 984.20   },
];

type TickerRow = {
  sym: string;
  price: number;
  prevPrice: number;     // last value seen — drives green/red row flash
  chg: number;           // % change vs previous close
};

function initTicker(): TickerRow[] {
  return BASE_INSTRUMENTS.map(s => ({
    sym: s.sym,
    price: s.base,
    prevPrice: s.base,
    chg: 0,
  }));
}

const MARKET_POLL_MS = 30_000;  // mirrors the 30s server-side cache

// Small dot + caption for the watchlist header. Reflects NSE session state
// AND whether the most recent backend fetch came from Yahoo or fell back.
function marketStateBadge(
  state: MarketState,
  source: MarketSnapshot["source"],
  fetchedAt: Date | null,
): { dot: string; ringBg: string; ring: string; label: string } {
  if (source === "fallback") {
    return {
      dot: "#9B9890", ringBg: "#F5F4F0", ring: "#9B9890",
      label: "Quotes offline · using fallback",
    };
  }

  const ts = fetchedAt
    ? fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "—";

  switch (state) {
    case "open":
      return { dot: "#16A34A", ringBg: "#F0FDF4", ring: "#16A34A",
               label: `NSE live · updated ${ts}` };
    case "pre-open":
      return { dot: "#D97706", ringBg: "#FFFBEB", ring: "#D97706",
               label: `Pre-open · last ${ts}` };
    case "closed":
      return { dot: "#9B9890", ringBg: "#F5F4F0", ring: "#9B9890",
               label: `Market closed · last close ${ts}` };
    case "weekend":
      return { dot: "#9B9890", ringBg: "#F5F4F0", ring: "#9B9890",
               label: "Weekend · markets closed" };
  }
}

function fmtPrice(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(iso: string): string {
  // Render a UTC ISO timestamp as IST HH:mm (NSE-local).
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export function Dashboard() {
  const { analysis, loading, refresh, streamingText, streaming, status: streamStatus } = useStreamingAnalysis(30_000);
  const [language, setLanguage]         = useState<Language>("en");
  const [crisisDismissed, setCrisis]    = useState(false);
  const [chartInsight, setChartInsight] = useState<string | null>(null);
  const [spinning, setSpinning]         = useState(false);
  const [ticker, setTicker]             = useState<TickerRow[]>(initTicker);
  const [marketState, setMarketState]   = useState<MarketState>("closed");
  const [marketSource, setMarketSource] = useState<MarketSnapshot["source"]>("fallback");
  const [marketFetchAt, setMarketFetchAt] = useState<Date | null>(null);
  const prevPricesRef = useRef<Map<string, number>>(new Map());

  // Real paper-trading session: trades + portfolio + session P&L from SQLite.
  const [trades, setTrades]             = useState<PaperTrade[]>([]);
  const [sessionPnl, setSessionPnl]     = useState<SessionPnL | null>(null);
  const [positions, setPositions]       = useState<OpenPosition[]>([]);
  const [marginUsedPct, setMarginUsedPct] = useState(0);
  const [marginUsed, setMarginUsed]     = useState(0);
  const [marginAvailable, setMarginAvailable] = useState(100_000);

  // Server-reported model name (e.g. "gemma4:e4b") — drives the header badge.
  const [model, setModel]   = useState<string>("");
  const [demoMode, setDemo] = useState<boolean>(true);
  useEffect(() => {
    api.health().then(h => {
      setModel(h.model);
      setDemo(h.demo_mode);
    }).catch(() => { /* offline — keep defaults */ });
  }, []);

  // ── Real NSE price feed via /market-quotes (Yahoo Finance) ─────────────
  // Polls every 30s — matches the backend cache TTL so we never hit Yahoo
  // more often than we have to. Row backgrounds flash green/red whenever a
  // symbol's price changes from the previous fetch.
  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
      try {
        const snap = await api.getMarketQuotes();
        if (cancelled) return;

        setMarketState(snap.market_state);
        setMarketSource(snap.source);
        setMarketFetchAt(new Date(snap.fetched_at));

        setTicker(_ => {
          const prevMap = prevPricesRef.current;
          const next: TickerRow[] = BASE_INSTRUMENTS.map(b => {
            const q = snap.quotes.find(qq => qq.symbol === b.sym);
            const price = q?.price ?? b.base;
            const chg   = q?.change_percent ?? 0;
            const prev  = prevMap.get(b.sym) ?? price;
            prevMap.set(b.sym, price);
            return { sym: b.sym, price, prevPrice: prev, chg };
          });
          return next;
        });
      } catch (err) {
        // Network blip — leave the previous ticker in place and try again.
        if (!cancelled) console.error("market-quotes fetch failed:", err);
      }
    }

    fetchQuotes();
    const id = setInterval(fetchQuotes, MARKET_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const liveBadge = marketStateBadge(marketState, marketSource, marketFetchAt);

  // ── Real paper-trading session: history + portfolio ───────────────────
  // Polls every 15s. Also refreshed manually via the header refresh button so
  // a freshly placed trade shows up immediately without waiting for the tick.
  const fetchSession = useCallback(async () => {
    try {
      const [hist, pf] = await Promise.all([
        api.getTradeHistory(20),
        api.getPortfolio(),
      ]);
      setTrades(hist.trades);
      setSessionPnl(hist.session_pnl);
      setPositions(pf.positions);

      // Derive margin display from portfolio response.
      const used = pf.positions.reduce(
        (s, p) => s + p.quantity * p.avg_price, 0,
      );
      const TOTAL = 100_000;
      const usedClamped = Math.min(used, TOTAL);
      setMarginUsed(usedClamped);
      setMarginAvailable(Math.max(0, TOTAL - usedClamped));
      setMarginUsedPct(Math.round((usedClamped / TOTAL) * 100));
    } catch (err) {
      console.error("session fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    const id = setInterval(fetchSession, 15_000);
    return () => clearInterval(id);
  }, [fetchSession]);

  const handleRefresh = useCallback(async () => {
    setSpinning(true);
    await Promise.all([refresh(), fetchSession()]);
    setTimeout(() => setSpinning(false), 700);
  }, [refresh, fetchSession]);

  const showCrisis = !!(analysis?.crisis_detected && !crisisDismissed);

  // ── Shared card style ──────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #E8E5DF",
    overflow: "hidden",
  };

  const cardHeader: React.CSSProperties = {
    padding: "11px 16px",
    borderBottom: "1px solid #E8E5DF",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: "700",
    color: "#1A1814",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0" }}>

      {/* Overlays */}
      {showCrisis && (
        <CrisisSupport
          crisisScore={analysis!.crisis_score}
          crisisDetected
          language={language}
          onDismiss={() => setCrisis(true)}
        />
      )}
      <NudgeEngine analysis={analysis} />

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <header style={{
        background: "#ffffff",
        borderBottom: "1px solid #E8E5DF",
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "9px",
            background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <div style={{ marginRight: "4px" }}>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1814",
              letterSpacing: "-0.02em", lineHeight: "1.1" }}>
              Finsight OS
            </div>
            <div style={{ fontSize: "10px", color: "#9B9890", lineHeight: "1" }}>
              Behavioral Guardian
            </div>
          </div>

          {[
            demoMode ? "DEMO" : "LIVE",
            model || "gemma-4",
            "edge-ai",
          ].map(badge => (
            <span key={badge} style={{
              fontSize: "10px", fontWeight: "600", color: "#6B6860",
              background: "#F9F8F6", border: "1px solid #E8E5DF",
              borderRadius: "99px", padding: "2px 8px",
            }}>
              {badge}
            </span>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LanguageSelector selected={language} onChange={setLanguage} />

          <button
            onClick={handleRefresh}
            title="Re-run AI analysis"
            style={{
              width: "34px", height: "34px", borderRadius: "8px",
              border: "1px solid #E8E5DF", background: "#F9F8F6",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="#6B6860" strokeWidth="2.5" strokeLinecap="round"
              style={{
                transition: "transform 0.6s ease",
                transform: spinning ? "rotate(360deg)" : "none",
              }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <main style={{
        maxWidth: "1300px",
        margin: "0 auto",
        padding: "20px",
        display: "grid",
        gridTemplateColumns: "1fr 336px",
        gap: "16px",
        alignItems: "start",
      }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* ── Watchlist with live price ticker ──────────────────────────── */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={sectionLabel}>Watchlist · NSE</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: liveBadge.dot, flexShrink: 0,
                  boxShadow: `0 0 0 2px ${liveBadge.ringBg}, 0 0 0 3px ${liveBadge.ring}`,
                }} />
                <span style={{ fontSize: "11px", color: "#9B9890" }}>
                  {liveBadge.label}
                </span>
              </div>
            </div>

            <div>
              {ticker.map((s, i) => {
                const isUp     = s.chg >= 0;
                const didRise  = s.price > s.prevPrice;
                const didFall  = s.price < s.prevPrice;
                const rowBg    = didRise ? "#F0FDF4" : didFall ? "#FEF2F2" : "#ffffff";

                return (
                  <div key={s.sym} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: rowBg,
                    borderBottom: i < ticker.length - 1 ? "1px solid #F5F4F0" : "none",
                    transition: "background 0.5s ease",
                  }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#1A1814" }}>
                      {s.sym}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: "14px", fontWeight: "700", color: "#1A1814",
                        fontVariantNumeric: "tabular-nums", fontFamily: "'DM Mono', monospace",
                      }}>
                        ₹{fmtPrice(s.price)}
                      </div>
                      <div style={{
                        fontSize: "11px", fontWeight: "600",
                        color: isUp ? "#16A34A" : "#DC2626",
                      }}>
                        {isUp ? "▲" : "▼"} {Math.abs(s.chg).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Chart Analyzer (Gemma Vision) ─────────────────────────────── */}
          <ChartAnalyzer onInsight={setChartInsight} />

          {chartInsight && (
            <div style={{
              padding: "12px 16px", borderRadius: "10px",
              background: "#EFF6FF", border: "1px solid #BFDBFE",
            }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#1E40AF",
                textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                Gemma 4 Vision · Chart Insight
              </p>
              <p style={{ fontSize: "13px", color: "#1D4ED8", lineHeight: "1.5" }}>
                {chartInsight}
              </p>
            </div>
          )}

          {/* ── Trade Panel ───────────────────────────────────────────────── */}
          <TradePanel analysis={analysis} onTradeExecuted={fetchSession} />

          {/* ── Recent Trades (real, from /trade-history) ─────────────────── */}
          {(() => {
            const realized = sessionPnl?.realized_pnl ?? 0;
            const closedTrades = trades.filter(t => t.realized_pnl !== null);
            const openTrades   = trades.filter(t => t.realized_pnl === null);

            return (
              <div style={card}>
                <div style={cardHeader}>
                  <span style={sectionLabel}>Today's Trades</span>
                  <span style={{
                    fontSize: "12px", fontWeight: "700",
                    color: realized < 0 ? "#DC2626" : "#16A34A",
                    background: realized < 0 ? "#FEF2F2" : "#F0FDF4",
                    border: `1px solid ${realized < 0 ? "#FECACA" : "#BBF7D0"}`,
                    borderRadius: "99px", padding: "2px 10px",
                  }}>
                    {realized < 0 ? "−" : "+"}₹{Math.abs(Math.round(realized)).toLocaleString("en-IN")} P&L
                  </span>
                </div>

                {trades.length === 0 ? (
                  <div style={{ padding: "16px", color: "#9B9890", fontSize: "12px",
                    textAlign: "center" }}>
                    No trades yet — place an order to see them here.
                  </div>
                ) : (
                  trades.map((t, i) => {
                    const isClosed = t.realized_pnl !== null;
                    const pnl = t.realized_pnl ?? 0;
                    return (
                      <div key={t.order_id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom: i < trades.length - 1 ? "1px solid #F5F4F0" : "none",
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "700",
                              color: t.action === "BUY" ? "#16A34A" : "#DC2626",
                              background: t.action === "BUY" ? "#F0FDF4" : "#FEF2F2",
                              border: `1px solid ${t.action === "BUY" ? "#BBF7D0" : "#FECACA"}`,
                              borderRadius: "4px", padding: "1px 5px",
                            }}>
                              {t.action}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: "500", color: "#1A1814" }}>
                              {t.symbol}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#9B9890", marginTop: "2px" }}>
                            {fmtTime(t.timestamp)} · qty {t.quantity} @ ₹{fmtPrice(t.price)}
                          </div>
                        </div>
                        {isClosed ? (
                          <span style={{
                            fontSize: "13px", fontWeight: "700",
                            color: pnl < 0 ? "#DC2626" : "#16A34A",
                          }}>
                            {pnl < 0 ? "−" : "+"}₹{Math.abs(Math.round(pnl)).toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "11px", fontWeight: "600", color: "#9B9890",
                            background: "#F9F8F6", border: "1px solid #E8E5DF",
                            borderRadius: "99px", padding: "2px 8px",
                          }}>
                            open
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Footer: closed/open count for transparency */}
                {trades.length > 0 && (
                  <div style={{
                    padding: "8px 16px", borderTop: "1px solid #F5F4F0",
                    fontSize: "10px", color: "#9B9890", display: "flex",
                    justifyContent: "space-between",
                  }}>
                    <span>{closedTrades.length} closed · {openTrades.length} open</span>
                    <span>real paper trades · SQLite</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Gemma Thinking Log (live token stream + clickable evidence) ── */}
          <ThinkingLog
            log={analysis?.thinking_log ?? null}
            inferenceTime={analysis?.inference_seconds ?? undefined}
            streamingText={streamingText}
            streaming={streaming}
            streamStatus={streamStatus}
            analysis={analysis}
          />
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <FinsightIntelligence analysis={analysis} loading={loading} model={model} />
          <BehavioralDNA />

          {/* Margin usage — derived from real open paper positions */}
          {(() => {
            const isHigh = marginUsedPct > 70;
            const isMed  = marginUsedPct > 40 && marginUsedPct <= 70;
            const badgeColor = isHigh ? "#DC2626" : isMed ? "#D97706" : "#16A34A";
            const badgeBg    = isHigh ? "#FEF2F2" : isMed ? "#FFFBEB" : "#F0FDF4";
            const badgeRing  = isHigh ? "#FECACA" : isMed ? "#FDE68A" : "#BBF7D0";
            const barFill    = isHigh
              ? "linear-gradient(90deg, #F97316, #DC2626)"
              : isMed
                ? "linear-gradient(90deg, #F59E0B, #D97706)"
                : "linear-gradient(90deg, #22C55E, #16A34A)";

            return (
              <div style={{ ...card, overflow: "visible" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "10px" }}>
                    <span style={sectionLabel}>Margin Usage</span>
                    <span style={{
                      fontSize: "11px", fontWeight: "700", color: badgeColor,
                      background: badgeBg, padding: "2px 8px",
                      borderRadius: "99px", border: `1px solid ${badgeRing}`,
                    }}>
                      {marginUsedPct}%{isHigh ? " ⚠" : ""}
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "#F5F4F0",
                    borderRadius: "4px", overflow: "hidden", marginBottom: "7px" }}>
                    <div style={{
                      height: "100%", borderRadius: "4px", background: barFill,
                      width: `${Math.min(100, marginUsedPct)}%`, transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: "11px", color: "#9B9890" }}>
                    <span>₹{Math.round(marginUsed).toLocaleString("en-IN")} used</span>
                    <span>₹{Math.round(marginAvailable).toLocaleString("en-IN")} available</span>
                  </div>
                  {positions.length > 0 && (
                    <div style={{
                      marginTop: "8px", paddingTop: "8px",
                      borderTop: "1px solid #F5F4F0",
                      fontSize: "10px", color: "#9B9890",
                    }}>
                      {positions.length} open position{positions.length !== 1 ? "s" : ""} · derived from SQLite
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <TradingVows />

          {/* Edge AI trust badge */}
          <div style={{
            padding: "12px 14px", borderRadius: "10px",
            background: "#FFF7ED", border: "1px solid #FED7AA",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "#C2410C" }}>
              🔒 Privacy-First Edge AI
            </p>
            <p style={{ fontSize: "11px", color: "#92400E", marginTop: "4px",
              lineHeight: "1.5", opacity: 0.85 }}>
              All behavioral analysis runs locally on your device via Ollama.
              Zero financial data sent to any server.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}