"use client";

/**
 * StockSearch — Kite-mode-only stock picker + real-order placement.
 *
 * Search → /kite/instruments/search debounced 250ms.
 * Select → adds to local watchlist, exposes BUY / SELL / EXIT action row.
 * Order  → /kite/place-order (MARKET by default, LIMIT optional).
 *
 * Mindful Speed Bump intentionally runs ONE level up in TradePanel; this
 * component only fires the request after the user confirms.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Match {
  instrument_token: number;
  tradingsymbol: string;
  name: string;
  segment: string;
  exchange: string;
  instrument_type: string;
  lot_size: number;
}

interface SelectedSymbol {
  tradingsymbol: string;
  exchange: string;
  name: string;
  instrument_type: string;
  lot_size: number;
  instrument_token: number;
}

const WATCHLIST_KEY = "finsight.kite.watchlist.v1";

function loadWatchlist(): SelectedSymbol[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); }
  catch { return []; }
}
function saveWatchlist(list: SelectedSymbol[]) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch {/**/}
}

interface Props {
  onChange?: (symbols: SelectedSymbol[]) => void;
  onAfterOrder?: () => void;
}

export function StockSearch({ onChange, onAfterOrder }: Props) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [watchlist, setWatchlist] = useState<SelectedSymbol[]>(loadWatchlist);
  const [order, setOrder] = useState<null | {
    sym: SelectedSymbol;
    side: "BUY" | "SELL";
    qty: number;
    product: "MIS" | "CNC";
    orderType: "MARKET" | "LIMIT";
    limitPrice: string;
    placing: boolean;
    error: string | null;
    success: string | null;
  }>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live prices for watchlist items — keyed by tradingsymbol. Refreshed
  // every 30 s (matches the Yahoo cache TTL). Initial fetch fires the
  // moment the watchlist changes (e.g., user just added a stock).
  const [prices, setPrices] = useState<Record<string, { last: number; pct: number; available: boolean }>>({});

  useEffect(() => { onChange?.(watchlist); }, [watchlist, onChange]);

  useEffect(() => {
    if (watchlist.length === 0) { setPrices({}); return; }
    let cancelled = false;
    const symbols = watchlist.map(s => s.tradingsymbol);

    async function fetchPrices() {
      try {
        const r = await api.quotesLookup(symbols);
        if (cancelled) return;
        const map: Record<string, { last: number; pct: number; available: boolean }> = {};
        for (const q of r.quotes) {
          map[q.symbol] = { last: q.last_price, pct: q.change_pct, available: q.available };
        }
        setPrices(map);
      } catch (e) {
        if (!cancelled) console.error("quotesLookup failed:", e);
      }
    }

    fetchPrices();
    const id = setInterval(fetchPrices, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [watchlist]);

  // Close the dropdown when the user clicks anywhere outside the search box.
  // Replaces the onBlur handler we removed (which was racing the ADD click).
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setMatches([]); setOpen(false); return; }
    setSearching(true);
    try {
      const r = await api.kiteSearchInstruments(q.trim(), 12);
      setMatches(r.matches);
      setOpen(true);
    } catch (e) {
      console.error("search failed:", e);
      setMatches([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search — never hammers the backend on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  function addToWatchlist(m: Match) {
    const sym: SelectedSymbol = {
      tradingsymbol:   m.tradingsymbol,
      exchange:        m.exchange,
      name:            m.name,
      instrument_type: m.instrument_type,
      lot_size:        m.lot_size,
      instrument_token: m.instrument_token,
    };
    setWatchlist(prev => {
      if (prev.find(x => x.tradingsymbol === sym.tradingsymbol && x.exchange === sym.exchange)) {
        return prev;
      }
      const next = [...prev, sym];
      saveWatchlist(next);
      return next;
    });
    setQuery("");
    setOpen(false);
  }

  function removeFromWatchlist(sym: SelectedSymbol) {
    setWatchlist(prev => {
      const next = prev.filter(x =>
        !(x.tradingsymbol === sym.tradingsymbol && x.exchange === sym.exchange)
      );
      saveWatchlist(next);
      return next;
    });
  }

  function openOrder(sym: SelectedSymbol, side: "BUY" | "SELL") {
    // Pre-fill the limit price with the latest LTP we have, so switching
    // order-type to LIMIT doesn't leave the user staring at an empty field.
    const ltp = prices[sym.tradingsymbol]?.last;
    setOrder({
      sym, side,
      qty: sym.lot_size > 1 ? sym.lot_size : 1,
      product: "MIS",
      orderType: "MARKET",
      limitPrice: ltp && ltp > 0 ? ltp.toFixed(2) : "",
      placing: false,
      error: null, success: null,
    });
  }

  async function submitOrder() {
    if (!order) return;
    if (order.qty <= 0) { setOrder({ ...order, error: "Quantity must be > 0" }); return; }
    if (order.orderType === "LIMIT" && (!order.limitPrice || Number(order.limitPrice) <= 0)) {
      setOrder({ ...order, error: "Set a positive limit price" });
      return;
    }
    setOrder({ ...order, placing: true, error: null });
    try {
      const r = await api.kitePlaceOrder({
        symbol:           order.sym.tradingsymbol,
        quantity:         order.qty,
        transaction_type: order.side,
        product:          order.product,
        order_type:       order.orderType,
        price:            order.orderType === "LIMIT" ? Number(order.limitPrice) : undefined,
        exchange:         order.sym.exchange as "NSE" | "BSE",
      });
      setOrder({ ...order, placing: false, success: `Order ${r.order_id} placed` });
      onAfterOrder?.();
      setTimeout(() => setOrder(null), 1800);
    } catch (e: any) {
      const msg = e?.message || "Order rejected";
      setOrder({ ...order, placing: false, error: msg });
    }
  }

  const watchlistByKey = useMemo(
    () => Object.fromEntries(watchlist.map(s => [`${s.exchange}:${s.tradingsymbol}`, s])),
    [watchlist],
  );

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #16A34A33",
      borderRadius: 14,
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      position: "relative",
    }}>
      <div style={{
        fontSize: 13, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.01em",
        marginBottom: 10,
      }}>
        Search & Trade · Live Kite
      </div>

      {/* Search input */}
      <div ref={containerRef} style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (matches.length) setOpen(true); }}
          // No onBlur close — we rely on Escape / outside-click instead, because
          // onBlur fires *before* the dropdown button's onClick, eating the add.
          onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
          placeholder="Type a symbol or company name (e.g. RELIANCE, INFY, NIFTY)…"
          style={{
            width: "100%", padding: "10px 12px",
            border: "1px solid #BBF7D0", borderRadius: 10,
            fontSize: 13, fontFamily: "inherit",
            outline: "none", background: "#F0FDF4",
          }}
        />
        {searching && (
          <span style={{ position: "absolute", right: 12, top: 11, fontSize: 11, color: "#6B6860" }}>
            …
          </span>
        )}

        {open && matches.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            zIndex: 10, background: "#fff",
            border: "1px solid #BBF7D0", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            maxHeight: 280, overflowY: "auto",
          }}>
            {matches.map(m => {
              const key = `${m.exchange}:${m.tradingsymbol}`;
              const inWL = !!watchlistByKey[key];
              return (
                <button
                  key={`${m.instrument_token}-${m.tradingsymbol}`}
                  // Use onMouseDown — fires before input's blur and before
                  // any other handler can close the dropdown. This is the
                  // standard pattern for autocomplete result selection.
                  onMouseDown={e => { e.preventDefault(); addToWatchlist(m); }}
                  disabled={inWL}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 12px",
                    background: inWL ? "#F1F5F9" : "#fff",
                    border: "none", borderBottom: "1px solid #F1EEE7",
                    cursor: inWL ? "default" : "pointer",
                    textAlign: "left", font: "inherit", color: "#1A1814",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{m.tradingsymbol}</div>
                    <div style={{ fontSize: 11, color: "#6B6860" }}>
                      {m.exchange} · {m.instrument_type} · {m.name || "—"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: inWL ? "#9CA3AF" : "#16A34A",
                  }}>
                    {inWL ? "ADDED" : "+ ADD"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Watchlist + actions */}
      {watchlist.length === 0 ? (
        <p style={{ fontSize: 12, color: "#6B6860", marginTop: 12 }}>
          Your watchlist is empty. Search a stock above to add it; then BUY, SELL, or EXIT directly from this row.
        </p>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {watchlist.map(s => {
            const q = prices[s.tradingsymbol];
            const hasPrice = q && q.available && q.last > 0;
            const positive = q ? q.pct >= 0 : false;
            return (
              <div key={`${s.exchange}:${s.tradingsymbol}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px",
                border: "1px solid #E5E7EB", borderRadius: 10,
                background: "#FAFAFA",
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{s.tradingsymbol}</div>
                  <div style={{ fontSize: 11, color: "#6B6860" }}>
                    {s.exchange} · {s.instrument_type} · lot {s.lot_size}
                  </div>
                </div>
                {/* Live price + day-change pill (via yfinance fallback) */}
                <div style={{ textAlign: "right", minWidth: 72 }}>
                  {hasPrice ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#1A1814" }}>
                        ₹{q.last.toFixed(2)}
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: positive ? "#15803D" : "#DC2626",
                      }}>
                        {positive ? "+" : ""}{q.pct.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>…</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn label="BUY"  onClick={() => openOrder(s, "BUY")}  bg="#16A34A" />
                  <ActionBtn label="SELL" onClick={() => openOrder(s, "SELL")} bg="#DC2626" />
                  <ActionBtn label="EXIT" onClick={() => openOrder(s, "SELL")} bg="#1A1814" title="Square off the position" />
                  <ActionBtn label="✕"    onClick={() => removeFromWatchlist(s)} bg="#9CA3AF" title="Remove from watchlist" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order modal */}
      {order && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16,
            padding: 22, width: "100%", maxWidth: 380,
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: order.side === "BUY" ? "#15803D" : "#DC2626",
              letterSpacing: "0.06em", marginBottom: 4,
            }}>
              {order.side} ORDER · LIVE KITE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
              {order.sym.tradingsymbol}
            </div>
            <div style={{ fontSize: 12, color: "#6B6860", marginBottom: 14 }}>
              {order.sym.exchange} · {order.sym.instrument_type} · lot {order.sym.lot_size}
            </div>

            <Field label="Quantity">
              <input
                type="number" min={1}
                value={order.qty}
                onChange={e => setOrder({ ...order, qty: Number(e.target.value) || 0 })}
                style={input}
              />
            </Field>

            <Field label="Product">
              <select
                value={order.product}
                onChange={e => setOrder({ ...order, product: e.target.value as "MIS" | "CNC" })}
                style={input}
              >
                <option value="MIS">MIS · intraday</option>
                <option value="CNC">CNC · delivery</option>
              </select>
            </Field>

            <Field label="Order type">
              <select
                value={order.orderType}
                onChange={e => setOrder({ ...order, orderType: e.target.value as "MARKET" | "LIMIT" })}
                style={input}
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </Field>

            {order.orderType === "LIMIT" && (
              <Field label="Limit price">
                <input
                  type="number" step="0.05" min={0}
                  value={order.limitPrice}
                  onChange={e => setOrder({ ...order, limitPrice: e.target.value })}
                  style={input}
                />
              </Field>
            )}

            {order.error && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#B91C1C" }}>{order.error}</div>
            )}
            {order.success && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#15803D", fontWeight: 700 }}>
                {order.success}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setOrder(null)}
                disabled={order.placing}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                }}
              >Cancel</button>
              <button
                onClick={submitOrder}
                disabled={order.placing || !!order.success}
                style={{
                  flex: 2, padding: "10px 12px", borderRadius: 8,
                  border: "none",
                  background: order.side === "BUY" ? "#16A34A" : "#DC2626",
                  color: "#fff", cursor: order.placing ? "wait" : "pointer",
                  fontWeight: 800, fontSize: 13,
                  opacity: order.placing || order.success ? 0.7 : 1,
                }}
              >
                {order.placing ? "Placing…"
                  : order.success ? "Placed ✓"
                  : `Confirm ${order.side}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── helpers ──────────────────────────────────────────────────────────────────
function ActionBtn({ label, onClick, bg, title }: {
  label: string; onClick: () => void; bg: string; title?: string;
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: bg, color: "#fff",
        border: "none", borderRadius: 6,
        padding: "5px 9px", fontSize: 11, fontWeight: 800,
        cursor: "pointer",
      }}
    >{label}</button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#6B6860", marginBottom: 4, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid #E5E7EB", borderRadius: 8,
  fontSize: 13, fontFamily: "inherit",
};
