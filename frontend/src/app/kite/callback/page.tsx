"use client";

/**
 * /kite/callback - browser landing page after the backend OAuth callback.
 *
 * Zerodha redirects to the backend at:
 *     http://localhost:8000/kite/callback
 *
 * The backend exchanges the token, sets the HTTP-only session cookie, and
 * then redirects the browser here with a small success marker. This page
 * only verifies the live session, persists `mode="kite"`, and routes the
 * user back to the dashboard.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useMode } from "@/contexts/ModeContext";

function KiteCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setMode } = useMode();
  const [stage, setStage] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Finishing your Zerodha login...");

  useEffect(() => {
    const status = params.get("status");
    if (status && status !== "connected") {
      setStage("error");
      setMessage(`Unexpected callback status: ${status}. Please try logging in again.`);
      return;
    }

    api.kiteStatus()
      .then((s) => {
        if (!s.authenticated) {
          throw new Error(
            s.warning ||
            "Kite login did not finish cleanly. Check the registered redirect URL and try again.",
          );
        }
        setStage("ok");
        setMessage(`Welcome back, ${s.user_name || "trader"}. Loading your live dashboard...`);
        setMode("kite");
        // Prime sessionStorage so Dashboard's first render already sees the
        // authenticated kiteStatus — avoids the "Reconnect your Kite session"
        // flash while /health is in flight after the redirect.
        try {
          sessionStorage.setItem("finsight.kiteStatus.primed.v1", JSON.stringify(s));
        } catch {/* quota: ignore */}
        setTimeout(() => router.replace("/"), 700);
      })
      .catch((err) => {
        setStage("error");
        setMessage(err?.message || "Could not verify the Kite session.");
      });
  }, [params, router, setMode]);

  const accent =
    stage === "ok"    ? "#16A34A" :
    stage === "error" ? "#DC2626" :
                        "#2563EB";

  return (
    <CallbackShell
      stage={stage}
      message={message}
      accent={accent}
      showBack={stage === "error"}
      onBack={() => router.replace("/")}
    />
  );
}

export default function KiteCallbackPage() {
  return (
    <Suspense
      fallback={(
        <CallbackShell
          stage="working"
          message="Finishing your Zerodha login..."
          accent="#2563EB"
          showBack={false}
        />
      )}
    >
      <KiteCallbackInner />
    </Suspense>
  );
}

function CallbackShell({
  stage,
  message,
  accent,
  showBack,
  onBack,
}: {
  stage: "working" | "ok" | "error";
  message: string;
  accent: string;
  showBack: boolean;
  onBack?: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FFFBF5 0%, #F5F4F0 60%, #FFF7ED 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: "460px", width: "100%",
        background: "#fff",
        border: `1.5px solid ${accent}33`,
        borderRadius: "16px",
        padding: "32px 28px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `${accent}15`,
          margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {stage === "working" && (
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${accent}33`, borderTopColor: accent,
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          {stage === "ok" && (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {stage === "error" && (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          )}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", color: "#1A1814" }}>
          {stage === "working" && "Connecting to Zerodha"}
          {stage === "ok" && "Connected"}
          {stage === "error" && "Login could not be completed"}
        </h1>
        <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.55, margin: 0 }}>
          {message}
        </p>

        {showBack && onBack && (
          <button
            onClick={onBack}
            style={{
              marginTop: 18,
              background: "#1A1814", color: "#fff",
              border: "none", borderRadius: 8,
              padding: "10px 18px", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back to mode selector
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
