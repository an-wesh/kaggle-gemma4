"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function useTradeAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeChart = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      return await api.analyzeChart(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to analyze chart";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeChart, loading, error };
}
