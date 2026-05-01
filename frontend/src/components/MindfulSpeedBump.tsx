"use client";
/**
 * MindfulSpeedBump — Speed Bump logic has been moved into TradePanel.tsx.
 * It now fires as a modal only when the user clicks BUY or SELL,
 * rather than blocking the entire page automatically.
 *
 * This file is kept as a no-op export to avoid import errors.
 */
import type { BehavioralAnalysis } from "@/types";

interface Props {
  analysis: BehavioralAnalysis | null;
}

export function MindfulSpeedBump({ analysis: _ }: Props) {
  return null;
}