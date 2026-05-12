"use client";

import type { KiteAccountSnapshot } from "@/types";

const fmtINR = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

interface Props {
  snapshot: KiteAccountSnapshot | null;
  loading: boolean;
  error: string | null;
}

export function KiteAccountPanel({ snapshot, loading, error }: Props) {
  // Only show the loading card on the VERY FIRST fetch (when we have no
  // prior snapshot to keep rendering). Subsequent background refreshes keep
  // the existing data on screen so the panel doesn't flash every poll cycle.
  if (loading && !snapshot) {
    return (
      <Card title="Zerodha Account" accent="#16A34A">
        <p style={{ fontSize: 13, color: "#6B6860" }}>Loading live data...</p>
      </Card>
    );
  }

  // Same principle for errors — only show the standalone error card when
  // there's no cached snapshot to display. If we have data, keep showing it
  // (the daily-reauth banner above the panel already surfaces stale sessions).
  if (error && !snapshot) {
    return (
      <Card title="Zerodha Account" accent="#DC2626">
        <p style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.55 }}>
          {error}
        </p>
        <p style={{ fontSize: 12, color: "#6B6860", marginTop: 8 }}>
          Daily Kite tokens expire at about 6 AM IST. If today&apos;s session is stale,
          log in again and refresh.
        </p>
      </Card>
    );
  }

  if (!snapshot) {
    return null;
  }

  const totalHoldingsPnl = snapshot.holdings.reduce((sum, holding) => sum + holding.pnl, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card title="Balance · Live Kite" accent="#16A34A">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Stat label="Available cash" value={fmtINR(snapshot.margins.available_cash)} bold />
          <Stat label="Opening balance" value={fmtINR(snapshot.margins.opening_balance)} />
          <Stat label="Utilised margin" value={fmtINR(snapshot.margins.utilised_debits)} />
          <Stat
            label="Net day P&L"
            value={fmtINR(snapshot.summary.net_day_pnl)}
            color={snapshot.summary.net_day_pnl >= 0 ? "#15803D" : "#DC2626"}
          />
        </div>
      </Card>

      <Card
        title={`Holdings · ${snapshot.summary.holdings_count}`}
        accent="#16A34A"
        right={(
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: totalHoldingsPnl >= 0 ? "#15803D" : "#DC2626",
          }}>
            P&L {totalHoldingsPnl >= 0 ? "+" : ""}{fmtINR(totalHoldingsPnl)}
          </span>
        )}
      >
        {snapshot.holdings.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6B6860" }}>No long-term holdings.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6B6860", fontSize: 11, letterSpacing: "0.04em" }}>
                <th style={th}>SYMBOL</th>
                <th style={thR}>QTY</th>
                <th style={thR}>AVG</th>
                <th style={thR}>LTP</th>
                <th style={thR}>P&L</th>
                <th style={thR}>1-DAY</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.holdings.slice(0, 10).map((holding) => (
                <tr key={holding.symbol} style={{ borderTop: "1px solid #F1EEE7" }}>
                  <td style={td}><b>{holding.symbol}</b></td>
                  <td style={tdR}>{holding.quantity}</td>
                  <td style={tdR}>{holding.avg_price.toFixed(2)}</td>
                  <td style={tdR}>{holding.ltp.toFixed(2)}</td>
                  <td style={{ ...tdR, color: holding.pnl >= 0 ? "#15803D" : "#DC2626", fontWeight: 700 }}>
                    {fmtINR(holding.pnl)}
                  </td>
                  <td style={{ ...tdR, color: holding.day_change_pct >= 0 ? "#15803D" : "#DC2626" }}>
                    {fmtPct(holding.day_change_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Top Watchlist card only renders when Kite's /quote API actually
          returned data. On Personal-tier plans this endpoint is restricted,
          so we hide the card and let the Search & Trade panel below own
          the watchlist UX (it uses Yahoo Finance for LTPs). */}
      {snapshot.watchlist.length > 0 && (
        <Card title="Watchlist · Live Kite" accent="#16A34A">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {snapshot.watchlist.map((quote) => {
              const positive = quote.change_pct >= 0;
              return (
                <div key={quote.symbol} style={{
                  border: `1px solid ${positive ? "#BBF7D0" : "#FECACA"}`,
                  borderRadius: 10, padding: "10px 12px",
                  background: positive ? "#F0FDF4" : "#FEF2F2",
                }}>
                  <div style={{ fontSize: 11, color: "#6B6860", fontWeight: 700 }}>
                    {quote.symbol.replace(/^NSE:/, "")}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1814", marginTop: 2 }}>
                    {quote.last_price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: positive ? "#15803D" : "#DC2626", fontWeight: 700 }}>
                    {fmtPct(quote.change_pct)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {snapshot.warnings.length > 0 && (
        <Card title="Broker Notes" accent="#D97706">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {snapshot.warnings.map((warning, index) => (
              <p key={`${warning}-${index}`} style={{ fontSize: 12, color: "#7C5E10", lineHeight: 1.5 }}>
                {warning}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card(props: { title: string; accent: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${props.accent}33`,
      borderRadius: 14,
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.01em" }}>
          {props.title}
        </div>
        {props.right}
      </div>
      {props.children}
    </div>
  );
}

function Stat({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6B6860", letterSpacing: "0.04em" }}>{label.toUpperCase()}</div>
      <div style={{
        fontSize: bold ? 20 : 16, fontWeight: bold ? 800 : 700,
        color: color || "#1A1814", marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

const th  = { padding: "8px 4px", fontWeight: 700 } as const;
const thR = { ...th, textAlign: "right" as const };
const td  = { padding: "8px 4px" } as const;
const tdR = { ...td, textAlign: "right" as const };
