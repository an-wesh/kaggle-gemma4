"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BehavioralAnalysis } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "token";  text: string }
  | { type: "result"; analysis: BehavioralAnalysis };

interface State {
  analysis: BehavioralAnalysis | null;
  streamingText: string;
  status: string;          // most recent status message
  streaming: boolean;      // true while a stream is active
  loading: boolean;        // alias for streaming, kept for hook compat
}

const INITIAL: State = {
  analysis: null,
  streamingText: "",
  status: "",
  streaming: false,
  loading: false,
};

/**
 * Streams /analyze-behavior-stream from the backend, parsing SSE events
 * and exposing live token-by-token text to the UI plus the final
 * BehavioralAnalysis when the stream completes.
 *
 * The hook keeps a manual ReadableStream reader (not EventSource) because
 * SSE on the spec only supports GET. Our endpoint is POST so we drive the
 * decode loop ourselves.
 */
export function useStreamingAnalysis(autoStartIntervalMs?: number) {
  const [s, setS] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    // Cancel any in-flight stream first.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setS(prev => ({ ...prev, streamingText: "", status: "", streaming: true, loading: true }));

    try {
      const r = await fetch(`${BASE}/analyze-behavior-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: ac.signal,
      });
      if (!r.ok || !r.body) throw new Error(`stream HTTP ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line.
        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          // Only the data: line carries our payload.
          const dataLine = rawEvent.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          const json = dataLine.slice(6).trim();
          if (!json || json === "{}") continue;

          let ev: StreamEvent;
          try {
            ev = JSON.parse(json) as StreamEvent;
          } catch {
            console.error("malformed SSE payload:", json);
            continue;
          }

          if (ev.type === "token") {
            setS(prev => ({ ...prev, streamingText: prev.streamingText + ev.text }));
          } else if (ev.type === "status") {
            setS(prev => ({ ...prev, status: ev.message }));
          } else if (ev.type === "result") {
            setS(prev => ({
              ...prev,
              analysis: ev.analysis,
              // If the demo path streamed a fallback log, prefer the result's
              // thinking_log because it includes the synthesized 7-step trace
              // formatted consistently with the e4b real-inference path.
              streamingText: ev.analysis.thinking_log ?? prev.streamingText,
            }));
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;       // user-cancelled, fine
      console.error("stream failed:", e);
      setS(prev => ({ ...prev, status: "Stream error" }));
    } finally {
      setS(prev => ({ ...prev, streaming: false, loading: false }));
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, []);

  // Auto-start on mount + optional polling interval.
  useEffect(() => {
    start();
    if (!autoStartIntervalMs) return;
    const id = setInterval(start, autoStartIntervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [start, autoStartIntervalMs]);

  return {
    analysis:      s.analysis,
    streamingText: s.streamingText,
    status:        s.status,
    streaming:     s.streaming,
    loading:       s.loading,
    refresh:       start,
  };
}
