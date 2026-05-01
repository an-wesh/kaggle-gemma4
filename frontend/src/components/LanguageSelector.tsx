"use client";
import { api } from "@/lib/api";
import type { Language } from "@/types";

const LANGS: { code: Language; native: string }[] = [
  { code: "en", native: "EN"  },
  { code: "hi", native: "हि"  },
  { code: "te", native: "తె"  },
  { code: "ta", native: "த"   },
];

interface Props {
  selected: Language;
  onChange: (l: Language) => void;
}

export function LanguageSelector({ selected, onChange }: Props) {
  async function handleChange(code: Language) {
    onChange(code); // update UI immediately
    try {
      // Tell the backend — next AI analysis will generate nudge in this language
      const { vows } = await api.getVows();
      await api.updateVows(vows, code);
    } catch (e) {
      console.error("[LanguageSelector] backend update failed:", e);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "2px",
      background: "#F9F8F6", border: "1px solid #E8E5DF",
      borderRadius: "8px", padding: "3px",
    }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: "none",
            background: selected === l.code ? "#F97316" : "transparent",
            color: selected === l.code ? "#ffffff" : "#6B6860",
            fontSize: "12px",
            fontWeight: selected === l.code ? "700" : "400",
            cursor: "pointer",
            transition: "all 0.15s ease",
            minWidth: "30px",
            lineHeight: "1",
          }}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}