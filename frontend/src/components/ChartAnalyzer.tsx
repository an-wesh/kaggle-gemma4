"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";

interface Props {
  onInsight: (insight: string) => void;
}

export function ChartAnalyzer({ onInsight }: Props) {
  const [analyzing, setAnalyzing]   = useState(false);
  const [insight,   setInsight]     = useState<string | null>(null);
  const [dragging,  setDragging]    = useState(false);
  const [fileName,  setFileName]    = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setAnalyzing(true);
    setInsight(null);
    try {
      const result = await api.analyzeChart(file);
      setInsight(result.insight);
      onInsight(result.insight);
    } catch {
      const fallback = "Chart analysis unavailable — Gemma vision requires Ollama to be running.";
      setInsight(fallback);
      onInsight(fallback);
    } finally {
      setAnalyzing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div style={{
      background: "#ffffff", borderRadius: "12px",
      border: "1px solid #E8E5DF", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px", borderBottom: "1px solid #E8E5DF",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
          background: "#EFF6FF", border: "1px solid #BFDBFE",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Eye icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>

        <span style={{
          fontSize: "11px", fontWeight: "700", color: "#1A1814",
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          Chart Analyzer
        </span>

        <span style={{
          marginLeft: "auto", fontSize: "10px", color: "#9B9890",
          background: "#F9F8F6", border: "1px solid #E8E5DF",
          borderRadius: "99px", padding: "2px 7px",
        }}>
          Gemma 4 Vision · local
        </span>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Drop zone */}
        <div
          onClick={() => !analyzing && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            padding: "20px 16px",
            borderRadius: "10px",
            border: `2px dashed ${dragging ? "#2563EB" : analyzing ? "#FED7AA" : "#D0CCC4"}`,
            background: dragging ? "#EFF6FF" : analyzing ? "#FFF7ED" : "#F9F8F6",
            cursor: analyzing ? "not-allowed" : "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px", textAlign: "center",
            transition: "all 0.2s ease",
          }}
        >
          {analyzing ? (
            <>
              {/* Spinner */}
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                border: "3px solid #FED7AA",
                borderTopColor: "#F97316",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#C2410C" }}>
                Gemma 4 analyzing chart…
              </p>
              {fileName && (
                <p style={{ fontSize: "11px", color: "#9B9890" }}>{fileName}</p>
              )}
            </>
          ) : (
            <>
              {/* Upload icon */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "#EFF6FF", border: "1px solid #BFDBFE",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: "600", color: "#2563EB" }}>
                  Upload chart screenshot
                </p>
                <p style={{ fontSize: "11px", color: "#9B9890", marginTop: "2px" }}>
                  Click or drag & drop · PNG, JPG supported
                </p>
              </div>
            </>
          )}
        </div>

        {/* Insight result */}
        {insight && !analyzing && (
          <div style={{
            padding: "11px 13px", borderRadius: "10px",
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            animation: "fadeIn 0.3s ease",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{
                fontSize: "10px", fontWeight: "700", color: "#1E40AF",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Gemma 4 Vision Insight
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "#1D4ED8", lineHeight: "1.6" }}>
              {insight}
            </p>
            {fileName && (
              <p style={{ fontSize: "10px", color: "#93C5FD", marginTop: "6px" }}>
                Source: {fileName}
              </p>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}