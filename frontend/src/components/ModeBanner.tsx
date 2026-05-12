"use client";

import { useEffect, useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import { themeFor } from "@/lib/modeTheme";

const DISMISS_KEY = "finsight.banner.dismissed.v1";

/**
 * Top-of-dashboard banner that explains the current mode.
 * Dismissible per-session (uses sessionStorage so it returns next time the
 * user opens the app, but goes away within a single session).
 *
 * On Live Kite mode, the banner is NOT dismissible — the safety warning
 * stays visible at all times.
 */
export function ModeBanner() {
  const { mode }   = useMode();
  const t          = themeFor(mode);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  if (!mode) return null;
  // Live Kite is always shown — safety-critical, can't be dismissed.
  if (mode !== "kite" && dismissed[mode]) return null;

  function dismiss() {
    if (mode === "kite") return;          // safety: never dismiss the LIVE warning
    const next = { ...dismissed, [mode]: true };
    setDismissed(next);
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  }

  return (
    <div style={{
      maxWidth: "1300px",
      margin: "12px auto 0",
      padding: "12px 18px",
      background: t.accentBg,
      border: `1px solid ${t.accentBorder}`,
      borderLeft: `4px solid ${t.accent}`,
      borderRadius: "10px",
      display: "flex",
      alignItems: "flex-start",
      gap: "14px",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "8px",
        background: "#fff", border: `1px solid ${t.accentBorder}`,
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {mode === "demo" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
        {mode === "paper" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        )}
        {mode === "kite" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={t.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px", fontWeight: "800", color: t.accentText,
          letterSpacing: "-0.01em",
        }}>
          {t.bannerTitle}
        </div>
        <div style={{
          fontSize: "12px", color: t.accentText, opacity: 0.85,
          lineHeight: "1.5", marginTop: "3px",
        }}>
          {t.bannerBody}
        </div>
        {t.bannerCta && (
          <div style={{
            fontSize: "11px", fontWeight: "700", color: t.accent,
            marginTop: "5px", letterSpacing: "0.04em",
          }}>
            {t.bannerCta}
          </div>
        )}
      </div>

      {mode !== "kite" && (
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          style={{
            background: "transparent", border: "none",
            color: t.accentText, opacity: 0.6,
            cursor: "pointer", padding: "4px",
            display: "flex", alignItems: "center",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
