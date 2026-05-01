export type RiskLevel = "low" | "medium" | "high";
export type Language = "en" | "hi" | "te" | "ta";

export interface Trade {
  trade_id: string; symbol: string; action: "BUY" | "SELL";
  quantity: number; price: number; timestamp: string;
  pnl: number | null; is_loss: boolean;
}

export interface MarginData {
  available: number; used: number; total: number;
}

export interface BehavioralAnalysis {
  behavioral_score: number;
  risk_level: RiskLevel;
  detected_pattern: string;
  nudge_message: string;
  nudge_message_local: string;
  vows_violated: string[];
  crisis_score: number;
  crisis_detected: boolean;
  sebi_disclosure: string | null;
  sebi_source: string | null;
  thinking_log: string | null;
  chart_insight: string | null;
  inference_seconds: number | null;   // Real local-CPU Gemma latency
}

export interface DNASession {
  date: string; score: number; pattern: string;
}

export interface BehavioralDNA {
  total_sessions: number;
  dominant_pattern: string;
  avg_score: number;
  high_risk_rate: number;
  worst_score: number;
  streak_days: number;
  sessions: DNASession[];
}

// Live NSE quote feed (Yahoo Finance via /market-quotes)
export interface Quote {
  symbol: string;
  yahoo_symbol: string;
  price: number;
  previous_close: number;
  change_percent: number;
  currency: string;
}

export type MarketState = "open" | "pre-open" | "closed" | "weekend";

export interface MarketSnapshot {
  quotes: Quote[];
  fetched_at: string;          // ISO 8601 UTC
  source: "yahoo" | "fallback" | "stale-cache";
  market_open: boolean;
  market_state: MarketState;
}

// Paper trading engine (backend/paper_trading.py)
export interface PaperTrade {
  order_id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;            // ISO 8601 UTC
  quantity_remaining: number;
  realized_pnl: number | null;
  is_loss: boolean | null;
}

export interface SessionPnL {
  since: string;
  total_trades: number;
  closed_trades: number;
  realized_pnl: number;
  loss_count: number;
}

export interface TradeHistoryResponse {
  trades: PaperTrade[];
  session_pnl: SessionPnL;
}

export interface OpenPosition {
  symbol: string;
  side: "BUY" | "SELL";          // BUY = long, SELL = short
  quantity: number;
  avg_price: number;
}

export interface PortfolioResponse {
  positions: OpenPosition[];
  session_pnl: SessionPnL;
}
