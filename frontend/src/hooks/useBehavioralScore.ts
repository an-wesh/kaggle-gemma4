"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { BehavioralAnalysis } from "@/types";

export function useBehavioralScore(pollInterval: number = 30000) {
  const [analysis, setAnalysis] = useState<BehavioralAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await api.analyze();
      setAnalysis(result);
    } catch (e) {
      console.error("Failed to fetch behavioral analysis:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval]);

  return { analysis, loading, refresh };
}
