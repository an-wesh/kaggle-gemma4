"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Mode } from "@/lib/mode";
import { MODE_STORAGE_KEY } from "@/lib/mode";

interface ModeContextValue {
  mode: Mode | null;            // null until the user picks
  setMode: (m: Mode) => void;
  resetMode: () => void;
  loaded: boolean;              // true once we've consulted localStorage
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode | null>(null);
  const [loaded, setLoaded]  = useState(false);

  // Hydrate from localStorage exactly once.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === "demo" || saved === "paper" || saved === "kite") {
        setModeState(saved);
      }
    } catch {
      // localStorage unavailable (private browsing) — that's fine, just stay null.
    }
    setLoaded(true);
  }, []);

  function setMode(m: Mode) {
    setModeState(m);
    try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch { /* ignore */ }
  }

  function resetMode() {
    setModeState(null);
    try { localStorage.removeItem(MODE_STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, resetMode, loaded }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
