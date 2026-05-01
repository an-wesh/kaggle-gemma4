"use client";

interface Props {
  crisisScore: number;
  crisisDetected: boolean;
  language?: string;
  onDismiss: () => void;
}

const CONTENT: Record<string, { message: string; action: string; helpline: string; hours: string }> = {
  hi: {
    message: "व्यापारिक नुकसान वास्तविक भावनात्मक दर्द का कारण बन सकता है। आप अकेले नहीं हैं।",
    action:  "आज ट्रेडिंग से दूरी बनाएं। आपका जीवन और परिवार किसी भी ट्रेड से ज़्यादा महत्वपूर्ण है।",
    helpline: "iCall: 9152987821",
    hours:    "सोम–शनि, सुबह 8 – रात 10",
  },
  te: {
    message: "వ్యాపార నష్టాలు నిజమైన భావోద్వేగ నొప్పిని కలిగిస్తాయి. మీరు ఒంటరిగా లేరు.",
    action:  "ఈ రోజు ట్రేడింగ్ నుండి విరామం తీసుకోండి. మీ జీవితం ఏ ట్రేడ్ కంటే విలువైనది.",
    helpline: "iCall: 9152987821",
    hours:    "Mon–Sat, 8am–10pm",
  },
  ta: {
    message: "வர்த்தக இழப்புகள் உண்மையான உணர்வு வலியை ஏற்படுத்தும். நீங்கள் தனியாக இல்லை.",
    action:  "இன்று வர்த்தகத்திலிருந்து ஓய்வு எடுங்கள். உங்கள் வாழ்க்கை எந்த வர்த்தகத்தையும் விட முக்கியமானது.",
    helpline: "iCall: 9152987821",
    hours:    "Mon–Sat, 8am–10pm",
  },
  en: {
    message: "Trading losses cause real emotional pain. You are not alone.",
    action:  "Step away from trading today. Your life and family matter more than any trade.",
    helpline: "iCall: 9152987821",
    hours:    "Mon–Sat, 8am–10pm",
  },
};

export function CrisisSupport({ crisisScore, crisisDetected, language = "en", onDismiss }: Props) {
  if (!crisisDetected) return null;

  const r = CONTENT[language] ?? CONTENT.en;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(26,24,20,0.55)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
      animation: "fadeIn 0.25s ease",
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "28px 26px",
        maxWidth: "420px",
        width: "100%",
        border: "1px solid #FECACA",
        boxShadow: "0 32px 80px rgba(220,38,38,0.12), 0 4px 16px rgba(0,0,0,0.08)",
        position: "relative",
        animation: "slideUp 0.3s ease",
      }}>
        {/* Dismiss × */}
        <button
          onClick={onDismiss}
          style={{
            position: "absolute", top: "16px", right: "16px",
            width: "28px", height: "28px", borderRadius: "8px",
            border: "1px solid #E8E5DF", background: "#F9F8F6",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#9B9890", fontSize: "16px", lineHeight: "1",
          }}
        >
          ×
        </button>

        {/* Heart icon */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "#FEF2F2", border: "2px solid #FECACA",
            margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#DC2626"
              stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>

          <h2 style={{
            fontSize: "20px", fontWeight: "800", color: "#1A1814",
            marginBottom: "8px", letterSpacing: "-0.02em",
          }}>
            Finsight Cares
          </h2>

          <p style={{
            fontSize: "14px", color: "#6B6860", lineHeight: "1.6",
            maxWidth: "320px", margin: "0 auto",
          }}>
            {r.message}
          </p>
        </div>

        {/* Crisis score indicator */}
        <div style={{
          padding: "10px 14px", borderRadius: "10px",
          background: "#FFF7ED", border: "1px solid #FED7AA",
          marginBottom: "14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "12px", color: "#92400E", fontWeight: "600" }}>
            Financial Distress Score
          </span>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#C2410C" }}>
            {crisisScore}/100
          </span>
        </div>

        {/* Action message */}
        <div style={{
          padding: "14px", borderRadius: "12px",
          background: "#FEF2F2", border: "1px solid #FECACA",
          marginBottom: "14px",
        }}>
          <p style={{ fontSize: "13px", color: "#991B1B", lineHeight: "1.7", fontWeight: "500" }}>
            {r.action}
          </p>
        </div>

        {/* Helpline */}
        <div style={{
          padding: "14px", borderRadius: "12px",
          background: "#F0FDF4", border: "1px solid #BBF7D0",
          display: "flex", alignItems: "center", gap: "12px",
          marginBottom: "18px",
        }}>
          {/* Phone icon */}
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
            background: "#DCFCE7", border: "1px solid #BBF7D0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#6B6860", marginBottom: "2px" }}>
              Free mental health support
            </p>
            <p style={{ fontSize: "15px", fontWeight: "800", color: "#15803D" }}>
              {r.helpline}
            </p>
            <p style={{ fontSize: "11px", color: "#6B6860", marginTop: "1px" }}>
              {r.hours}
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          fontSize: "11px", color: "#9B9890", textAlign: "center",
          lineHeight: "1.5", marginBottom: "14px",
        }}>
          Finsight OS detected distress signals in your trading pattern.
          This message was generated locally — no data was sent anywhere.
        </p>

        {/* CTA */}
        <button
          onClick={onDismiss}
          style={{
            width: "100%", padding: "13px",
            borderRadius: "12px", border: "none",
            background: "#DC2626", color: "#ffffff",
            fontSize: "14px", fontWeight: "700",
            cursor: "pointer", transition: "opacity 0.15s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          I'll take a break today
        </button>
      </div>
    </div>
  );
}