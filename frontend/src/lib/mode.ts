/**
 * Finsight OS deployment modes.
 *
 *   "demo"  — pre-seeded high-risk session, zero setup. Default for first-time
 *             visitors. Used in the recorded video.
 *   "paper" — real Yahoo prices, real SQLite paper trades, FIFO P&L matching.
 *             User places real trades against simulated capital. No broker
 *             credentials required. The "free practice" mode.
 *   "kite"  — Live Kite Connect integration. User logs in with their actual
 *             Zerodha account; portfolio / trades / orders go through the
 *             real broker API. Free tier (₹0) of Kite Connect supported.
 *
 * The chosen mode is persisted in localStorage and threaded into every API
 * call as an `X-Finsight-Mode` header. The backend dispatches accordingly.
 */

export type Mode = "demo" | "paper" | "kite";

export const MODE_STORAGE_KEY = "finsight.mode.v1";
export const MODE_HEADER      = "X-Finsight-Mode";

export const MODE_LABELS: Record<Mode, string> = {
  demo:  "Demo Mode",
  paper: "Paper Trading",
  kite:  "Live Kite Connect",
};

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  demo:  "Pre-loaded high-risk session, zero setup. Best for a quick tour.",
  paper: "Place real trades against live Yahoo prices. Your trades persist to SQLite. No broker account needed.",
  kite:  "Connect your actual Zerodha account via Kite Connect API. Free-tier supported.",
};
