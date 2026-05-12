import type { Mode } from "@/lib/mode";

/**
 * Per-mode visual + copy theme used everywhere a Dashboard component
 * needs to differentiate Demo / Paper / Live Kite. Centralized here so
 * a single edit propagates through the header pill, banner, footer
 * captions, button labels, and Speed Bump headlines.
 */
export interface ModeThemeSpec {
  accent:        string;     // primary color used for the mode's pill / banner / accents
  accentBg:      string;     // soft background tint
  accentBorder:  string;     // matching border color
  accentText:    string;     // darker variant for text on accentBg
  bannerTitle:   string;     // top-of-dashboard banner headline
  bannerBody:    string;     // top-of-dashboard banner detail
  bannerCta?:    string;     // optional CTA caption
  pillLabel:     string;     // header pill text (current-mode indicator)
  tradesFooter:  string;     // "real paper trades · SQLite" replacement
  marginLabel:   string;     // "Margin Usage" replacement
  confirmBuy:    string;     // BUY button label after Speed Bump clears
  confirmSell:   string;     // SELL button label after Speed Bump clears
  bumpHeadline:  string;     // Speed Bump modal headline
  showCoachmarks: boolean;   // first-time tooltips on/off
  showResetButton: boolean;  // "Reset Paper Account" footer button
}

export const MODE_THEMES: Record<Mode, ModeThemeSpec> = {
  demo: {
    accent:       "#F97316",
    accentBg:     "#FFF7ED",
    accentBorder: "#FED7AA",
    accentText:   "#C2410C",
    bannerTitle:  "Demo session loaded",
    bannerBody:
      "A pre-built high-risk session is already in your account. Click any BUY to see the Mindful Speed Bump fire instantly.",
    bannerCta:    "Try it now ↓",
    pillLabel:    "DEMO MODE",
    tradesFooter: "Demo session · auto-seeded · paper SQLite",
    marginLabel:  "Margin Usage · Demo",
    confirmBuy:   "✓ Confirm (demo trade)",
    confirmSell:  "✓ Confirm (demo trade)",
    bumpHeadline: "Mindful Speed Bump · Demo",
    showCoachmarks: true,
    showResetButton: false,
  },
  paper: {
    accent:       "#2563EB",
    accentBg:     "#EFF6FF",
    accentBorder: "#BFDBFE",
    accentText:   "#1E40AF",
    bannerTitle:  "Paper Trading · ₹100,000 paper capital",
    bannerBody:
      "Place real trades against live NSE prices. The AI will start watching for emotional patterns once you have 2+ trades.",
    bannerCta:    "Place your first trade ↓",
    pillLabel:    "PAPER TRADING",
    tradesFooter: "Your paper trades · live NSE prices · SQLite",
    marginLabel:  "Margin Usage · Paper",
    confirmBuy:   "✓ Confirm Paper BUY",
    confirmSell:  "✓ Confirm Paper SELL",
    bumpHeadline: "Mindful Speed Bump",
    showCoachmarks: true,
    showResetButton: true,
  },
  kite: {
    accent:       "#16A34A",
    accentBg:     "#F0FDF4",
    accentBorder: "#BBF7D0",
    accentText:   "#15803D",
    bannerTitle:  "⚠ LIVE TRADING · Real Zerodha account",
    bannerBody:
      "Orders placed here go through the actual Kite Connect API and move real money. The Speed Bump fires for high-risk trades; low-risk trades execute normally.",
    bannerCta:    undefined,
    pillLabel:    "LIVE · ZERODHA",
    tradesFooter: "Live from Zerodha · via Kite Connect API",
    marginLabel:  "Margin · Live (Kite)",
    confirmBuy:   "✓ Place LIVE Order on Zerodha",
    confirmSell:  "✓ Place LIVE Order on Zerodha",
    bumpHeadline: "⚠ LIVE TRADE · Mindful Speed Bump",
    showCoachmarks: false,
    showResetButton: false,
  },
};

/** Safe getter — falls back to demo theme if mode is null/unknown. */
export function themeFor(mode: Mode | null): ModeThemeSpec {
  return MODE_THEMES[mode ?? "demo"] ?? MODE_THEMES.demo;
}
