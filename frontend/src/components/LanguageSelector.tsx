"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Language } from "@/types";

const LANGS: { code: Language; native: string; name: string }[] = [
  { code: "en", native: "EN", name: "English" },
  { code: "hi", native: "हि", name: "हिन्दी" },
  { code: "te", native: "తె", name: "తెలుగు" },
  { code: "ta", native: "த",  name: "தமிழ்"  },
];

interface Props {
  selected: Language;
  onChange: (l: Language) => void;
  /** Optional — called after the backend has acknowledged the new language.
   *  Dashboard threads its `refresh()` here so the next analysis fires
   *  immediately (instead of waiting up to 30s for the next poll). */
  onLanguageChanged?: () => void;
}

export function LanguageSelector({ selected, onChange, onLanguageChanged }: Props) {
  const [busy, setBusy]     = useState(false);
  const [toast, setToast]   = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  // Auto-dismiss the toast after 2.4s
  useEffect(() => {
    if (!toast && !error) return;
    const id = setTimeout(() => { setToast(null); setError(null); }, 2400);
    return () => clearTimeout(id);
  }, [toast, error]);

  async function handleChange(code: Language) {
    if (busy) return;
    if (code === selected) {
      // Same language clicked — show confirmation but skip backend call
      const lang = LANGS.find(l => l.code === code)!;
      setToast(`Already set to ${lang.name}`);
      return;
    }

    // Update UI immediately so the orange pill moves on click.
    onChange(code);
    setBusy(true);
    setError(null);

    try {
      // Persist the preference. We pull current vows so they aren't wiped.
      const { vows } = await api.getVows();
      await api.updateVows(vows, code);

      const lang = LANGS.find(l => l.code === code)!;
      setToast(`🌐 ${lang.name} · next nudge in this language`);

      // Trigger an immediate re-analysis so the user sees the local nudge
      // appear in seconds instead of waiting for the 30s poll.
      onLanguageChanged?.();
    } catch (e) {
      console.error("[LanguageSelector] backend update failed:", e);
      setError("Backend offline · UI updated locally");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "2px",
        background: "#F9F8F6", border: "1px solid #E8E5DF",
        borderRadius: "8px", padding: "3px",
        opacity: busy ? 0.7 : 1, transition: "opacity 0.15s",
      }}>
        {LANGS.map(l => {
          const isSelected = selected === l.code;
          return (
            <button
              key={l.code}
              onClick={() => handleChange(l.code)}
              disabled={busy}
              title={l.name}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: isSelected ? "#F97316" : "transparent",
                color: isSelected ? "#ffffff" : "#6B6860",
                fontSize: "12px",
                fontWeight: isSelected ? "700" : "500",
                cursor: busy ? "wait" : "pointer",
                transition: "all 0.15s ease",
                minWidth: "30px",
                lineHeight: "1",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                if (!isSelected && !busy) e.currentTarget.style.background = "#F3F1EC";
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.background = "transparent";
              }}
            >
              {l.native}
            </button>
          );
        })}
      </div>

      {/* Toast — appears below the selector for 2.4s */}
      {(toast || error) && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: error ? "#FEF2F2" : "#F0FDF4",
          color: error ? "#991B1B" : "#15803D",
          border: `1px solid ${error ? "#FECACA" : "#BBF7D0"}`,
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          zIndex: 50,
          animation: "ls-fade-in 0.18s ease",
        }}>
          <style>{`
            @keyframes ls-fade-in {
              from { opacity: 0; transform: translateY(-3px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {error || toast}
        </div>
      )}
    </div>
  );
}
