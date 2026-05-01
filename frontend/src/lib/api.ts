import { MODE_HEADER, MODE_STORAGE_KEY } from "@/lib/mode";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Read the user's chosen mode from localStorage. Used to thread the
 * X-Finsight-Mode header into every backend call. Falls back to "demo"
 * if no mode is set (so /health and similar work even before the picker).
 */
function currentMode(): string {
  if (typeof window === "undefined") return "demo";
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) || "demo";
  } catch {
    return "demo";
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [MODE_HEADER]:  currentMode(),
  };
  if (init?.headers) Object.assign(headers, init.headers as Record<string, string>);

  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",     // forward Kite session cookie when present
    ...init,
    headers,
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export const api = {
  // Server health + actual configured model name (drives badges)
  health: () => req<{ status: string; demo_mode: boolean; model: string; edge_ai: boolean }>("/health"),

  // Behavioral analysis (non-streaming) + DNA history
  analyze: () => req<import("@/types").BehavioralAnalysis>("/analyze-behavior", { method: "POST", body: "{}" }),
  getDNA:  () => req<import("@/types").BehavioralDNA>("/behavioral-dna"),

  // Vows + crisis resources
  getVows:    () => req<{ vows: string[]; language: string }>("/trading-vows"),
  updateVows: (vows: string[], language = "en") =>
    req("/trading-vows", { method: "POST", body: JSON.stringify({ vows, preferred_language: language }) }),
  getCrisisResources: (lang = "en") =>
    req<{ helpline: string; message: string; action: string }>(`/crisis-resources?lang=${lang}`),

  // Trades + portfolio (mode-aware on the backend)
  confirmTrade: (symbol: string, qty: number, price: number, action: "BUY" | "SELL" = "BUY") =>
    req<{ order_id: string }>("/confirm-trade", {
      method: "POST", body: JSON.stringify({ symbol, quantity: qty, price, action }),
    }),
  getTradeHistory: (limit = 20) =>
    req<import("@/types").TradeHistoryResponse>(`/trade-history?limit=${limit}`),
  getPortfolio:    () => req<import("@/types").PortfolioResponse>("/portfolio"),
  getMarketQuotes: () => req<import("@/types").MarketSnapshot>("/market-quotes"),

  // Multimodal Gemma vision (chart screenshot → behavioral warning)
  analyzeChart: async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${BASE}/analyze-chart`, {
      method: "POST",
      body: fd,
      headers: { [MODE_HEADER]: currentMode() },
      credentials: "include",
    });
    return r.json() as Promise<{ insight: string }>;
  },

  // ── Live Kite Connect ────────────────────────────────────────────────
  /** Backend tells us whether KITE_API_KEY is configured + whether a session is live. */
  kiteStatus: () => req<{
    configured: boolean;
    authenticated: boolean;
    user_name?: string;
    error?: string;
  }>("/kite/status"),

  /** Returns the Zerodha login URL we redirect the user to. */
  kiteLoginUrl: () => req<{ login_url: string }>("/kite/login-url"),

  /** Logs out — backend clears the access_token cookie. */
  kiteLogout: () => req<{ ok: true }>("/kite/logout", { method: "POST", body: "{}" }),
};
