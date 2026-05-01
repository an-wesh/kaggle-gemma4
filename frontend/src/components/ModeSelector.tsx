"use client";
import { useEffect, useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import type { Mode } from "@/lib/mode";
import { api } from "@/lib/api";

interface KiteAvailability {
  configured: boolean;            // KITE_API_KEY present in backend .env
  authenticated: boolean;         // user has a live access_token
  user_name?: string;
  error?: string;
}

const CARD_COLORS: Record<Mode, { bg: string; border: string; accent: string; pill: string; pillBg: string }> = {
  demo:  { bg: "#FFF7ED", border: "#FED7AA", accent: "#F97316", pill: "#C2410C", pillBg: "#FFEDD5" },
  paper: { bg: "#EFF6FF", border: "#BFDBFE", accent: "#2563EB", pill: "#1E40AF", pillBg: "#DBEAFE" },
  kite:  { bg: "#F0FDF4", border: "#BBF7D0", accent: "#16A34A", pill: "#15803D", pillBg: "#DCFCE7" },
};

export function ModeSelector() {
  const { setMode } = useMode();
  const [kite, setKite] = useState<KiteAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  // Probe whether the backend has Kite Connect configured.
  useEffect(() => {
    api.kiteStatus()
      .then(s => setKite(s))
      .catch(() => setKite({ configured: false, authenticated: false }));
  }, []);

  function pickMode(m: Mode) {
    if (m === "kite" && !kite?.configured) return;
    setMode(m);
  }

  async function startKiteLogin() {
    if (loading) return;
    setLoading(true);
    try {
      const { login_url } = await api.kiteLoginUrl();
      // Set the mode FIRST so when the user comes back from Zerodha
      // we land directly on the dashboard.
      setMode("kite");
      window.location.href = login_url;
    } catch (e) {
      console.error("kite login failed:", e);
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FFFBF5 0%, #F5F4F0 60%, #FFF7ED 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: "980px", width: "100%" }}>

        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "14px", marginBottom: "32px",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "#F97316",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.01em", color: "#1A1814" }}>
              Finsight OS
            </div>
            <div style={{ fontSize: "12px", color: "#9B9890", letterSpacing: "0.04em" }}>
              BEHAVIORAL GUARDIAN · BUILT ON GEMMA 4
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1 style={{
            fontSize: "32px", fontWeight: "800", color: "#1A1814",
            letterSpacing: "-0.02em", margin: "0 0 10px",
          }}>
            How would you like to explore?
          </h1>
          <p style={{ fontSize: "15px", color: "#6B6860", lineHeight: "1.6", maxWidth: "640px", margin: "0 auto" }}>
            Three deployment modes ship with Finsight OS. Pick whichever
            matches your situation. You can change it later from the dashboard.
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px", marginBottom: "20px",
        }}>

          {/* DEMO CARD */}
          <ModeCard
            mode="demo"
            badge="INSTANT"
            title="Demo Mode"
            description="Pre-loaded high-risk session, zero setup. Best for a quick tour or showing a friend in 30 seconds."
            features={[
              "5 closed losing trades + 2 open positions",
              "Speed Bump fires on first analysis",
              "All Gemma 4 features active",
              "Zero broker credentials needed",
            ]}
            cta="Enter Demo"
            onClick={() => pickMode("demo")}
            disabled={false}
          />

          {/* PAPER CARD */}
          <ModeCard
            mode="paper"
            badge="FREE PRACTICE"
            title="Paper Trading"
            description="Place real trades against live Yahoo prices. Trades persist to a local SQLite engine with FIFO P&L matching. No broker account required."
            features={[
              "Real NSE prices via Yahoo Finance",
              "FIFO lot matching · realized P&L",
              "₹100,000 paper capital",
              "Trades flow into Gemma analysis",
            ]}
            cta="Start Paper Trading"
            onClick={() => pickMode("paper")}
            disabled={false}
          />

          {/* KITE CARD */}
          <ModeCard
            mode="kite"
            badge={kite?.configured ? "REAL BROKER" : "REQUIRES SETUP"}
            title="Live Kite Connect"
            description={
              kite?.configured
                ? "Connect your actual Zerodha account. Free-tier of Kite Connect (₹0/month) supported. You retain full control — Finsight only reads and adds the Speed Bump layer."
                : "Configure KITE_API_KEY in backend/.env. Kite Connect Personal tier is free (₹0). See docs/kite-setup.md for the 5-minute walkthrough."
            }
            features={
              kite?.configured
                ? [
                    "OAuth login via Zerodha",
                    "Real holdings, positions, P&L",
                    "Daily access-token refresh",
                    "Rate-limited at 3 req/s per Kite TOS",
                  ]
                : [
                    "kite.trade/connect → register app",
                    "Set redirect URL · localhost:8000",
                    "Add api_key + secret to .env",
                    "Restart backend → mode unlocks",
                  ]
            }
            cta={
              !kite?.configured ? "Backend not configured" :
              kite.authenticated ? `Continue as ${kite.user_name || "trader"}` :
              loading ? "Redirecting…" :
              "Login with Zerodha"
            }
            onClick={kite?.configured ? startKiteLogin : () => {}}
            disabled={!kite?.configured || loading}
          />
        </div>

        {/* Footer attribution */}
        <div style={{
          textAlign: "center", fontSize: "11px", color: "#9B9890",
          letterSpacing: "0.03em", marginTop: "20px",
        }}>
          Edge-AI · 100% local inference via Gemma 4 + Ollama · Open source · MIT licensed
        </div>
      </div>
    </div>
  );
}


// ────────────────────────────────────────────────────────────────────────────

interface CardProps {
  mode: Mode;
  badge: string;
  title: string;
  description: string;
  features: string[];
  cta: string;
  onClick: () => void;
  disabled: boolean;
}

function ModeCard({ mode, badge, title, description, features, cta, onClick, disabled }: CardProps) {
  const c = CARD_COLORS[mode];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: "left",
        background: "#ffffff",
        border: `1.5px solid ${c.border}`,
        borderRadius: "16px",
        padding: "22px 22px 18px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        font: "inherit",
        color: "#1A1814",
        display: "flex", flexDirection: "column", gap: "12px",
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${c.accent}22, 0 1px 3px rgba(0,0,0,0.04)`;
        e.currentTarget.style.borderColor = c.accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = c.border;
      }}
    >
      {/* Badge */}
      <span style={{
        alignSelf: "flex-start",
        fontSize: "10px", fontWeight: "700",
        color: c.pill, background: c.pillBg,
        border: `1px solid ${c.border}`,
        borderRadius: "99px", padding: "3px 9px",
        letterSpacing: "0.07em",
      }}>
        {badge}
      </span>

      {/* Title */}
      <h2 style={{
        fontSize: "20px", fontWeight: "800", margin: 0,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>

      {/* Description */}
      <p style={{ fontSize: "13px", color: "#6B6860", lineHeight: "1.55", margin: 0 }}>
        {description}
      </p>

      {/* Feature list */}
      <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none",
                   display: "flex", flexDirection: "column", gap: "5px" }}>
        {features.map((f, i) => (
          <li key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "7px",
            fontSize: "12px", color: "#1A1814",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={c.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: "4px" }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div style={{
        marginTop: "8px", paddingTop: "12px",
        borderTop: `1px solid ${c.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "13px", fontWeight: "700", color: c.accent,
      }}>
        <span>{cta}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </button>
  );
}
