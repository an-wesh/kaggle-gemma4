# Finsight OS v2 — Claude Code Prompts (Copy-Paste Ready)

---

## MESSAGE 1 — Full Backend

```
Read WINNING_PLAYBOOK.md completely.

Implement the ENTIRE BACKEND (Phase 1 through Phase 8):

1. Create this directory structure:
   backend/
   data/sebi_circulars/
   data/chroma_db/

2. Create EXACTLY these files with the FULL code from the playbook (do not shorten):
   - backend/models.py         (Phase 2)
   - backend/behavioral_dna.py (Phase 3)
   - backend/ai_engine.py      (Phase 4)
   - backend/multimodal_engine.py (Phase 5)
   - backend/rag_engine.py     (Phase 6)
   - backend/crisis_protocol.py (Phase 7)
   - backend/main.py           (Phase 8)
   - backend/broker_client.py  (same as Phase 3 from first playbook)
   - backend/.env              (DEMO_MODE=true, Ollama settings)

3. Create Python venv and install ALL dependencies:
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn "pydantic>=2.0" "ollama>=0.2" python-dotenv \
     kiteconnect httpx "chromadb>=0.4" pillow sqlalchemy aiofiles langdetect

4. Start the backend: DEMO_MODE=true python main.py &
   Wait 3 seconds, then run:
   curl http://localhost:8000/health
   curl -X POST http://localhost:8000/analyze-behavior -H "Content-Type: application/json" -d "{}"
   
5. Confirm the /analyze-behavior response contains:
   - behavioral_score >= 800 (from demo data)
   - risk_level: "high"
   - nudge_message: exactly 15 words
   - thinking_log: contains "STEP 1" and "STEP 2"
   - crisis_score: present
   - sebi_disclosure: present

Print the full JSON response. Then confirm "✅ Backend complete."
```

---

## MESSAGE 2 — Full Frontend

```
Now implement the ENTIRE FRONTEND (Phase 9 through Phase 12 of WINNING_PLAYBOOK.md):

1. Initialize Next.js:
   cd frontend
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir \
     --import-alias "@/*" --yes
   npx shadcn@latest init --defaults --yes
   npx shadcn@latest add button input badge card toast dialog progress tabs
   npm install recharts lucide-react

2. Create EXACTLY these files with FULL code from the playbook:
   - src/types/index.ts
   - src/lib/api.ts
   - src/hooks/useBehavioralScore.ts
   - src/hooks/useTradeAnalysis.ts
   - src/components/FinsightIntelligence.tsx
   - src/components/MindfulSpeedBump.tsx      ← CRITICAL: exact phrase typing
   - src/components/BehavioralDNA.tsx          ← bar chart of sessions
   - src/components/ThinkingLog.tsx            ← collapsible thinking panel
   - src/components/ChartAnalyzer.tsx          ← file upload → Gemma vision
   - src/components/CrisisSupport.tsx          ← mental health overlay
   - src/components/LanguageSelector.tsx       ← EN/HI/TE/TA
   - src/components/NudgeEngine.tsx
   - src/components/TradePanel.tsx
   - src/components/TradingVows.tsx
   - src/components/Dashboard.tsx              ← master layout
   - src/app/layout.tsx
   - src/app/page.tsx
   - src/app/globals.css
   - next.config.ts
   - .env.local

3. Run: npm run build
   Must complete with ZERO TypeScript errors.
   Fix any type errors that appear — do not skip.

4. Run: npm run dev &
   Wait 5 seconds, then confirm the dev server is running at http://localhost:3000

Confirm "✅ Frontend complete. Build passed. Dev server running."
```

---

## MESSAGE 3 — End-to-End Validation

```
Run the complete end-to-end validation for the Kaggle demo:

1. BACKEND TESTS:
   # Health check
   curl http://localhost:8000/health
   Expected: {"status":"ok","demo_mode":true,"model":"gemma4:e4b","edge_ai":true}

   # Full behavioral analysis
   curl -X POST http://localhost:8000/analyze-behavior \
     -H "Content-Type: application/json" -d "{}"
   Expected: score ~850, risk_level "high", nudge_message 15 words

   # Behavioral DNA
   curl http://localhost:8000/behavioral-dna
   Expected: JSON with session history

   # SEBI RAG
   curl http://localhost:8000/health
   (check startup logs show "SEBI circulars indexed")

   # Crisis resources
   curl "http://localhost:8000/crisis-resources?lang=hi"
   Expected: Hindi helpline info

   # Vows
   curl http://localhost:8000/trading-vows
   curl -X POST http://localhost:8000/trading-vows \
     -H "Content-Type: application/json" \
     -d '{"vows":["I will stop after 2 losses"],"preferred_language":"hi"}'

2. DEMO SCENARIO VALIDATION:
   Confirm the demo shows:
   - Behavioral score >= 800 (high risk)
   - nudge_message is present and exactly 15 words
   - nudge_message_local is present in Hindi
   - vows_violated contains at least one vow
   - thinking_log is present and contains STEP reasoning
   - sebi_disclosure is present
   - sebi_source is present

3. FRONTEND VALIDATION:
   With both servers running, check http://localhost:3000
   - Header shows "FINSIGHT OS" with "DEMO · gemma-4-e4b · edge-ai"
   - FinsightIntelligence widget shows score and risk level
   - TradePanel shows the MindfulSpeedBump (red, with phrase input)
   - ThinkingLog panel is present at bottom of left column
   - Language selector shows EN/HI/TE/TA

4. If Ollama is running with gemma4:e4b:
   - Run actual inference and confirm <3s latency
   - Check console for [Finsight AI] inference time log
   - Check console for [🧠 GEMMA THINKING LOG] output

5. Create start.sh with the content from Phase 14, make it executable:
   chmod +x start.sh

Print a final summary:
"✅ FINSIGHT OS V2 — KAGGLE DEMO READY"
- Backend endpoints: [list all 8]
- Frontend components: [count]
- Gemma inference: [working/demo-fallback]
- Latency: [Xs if tested]
- Demo score: [X/1000]
```

---

## QUICK REFERENCE — File Count

### Backend (8 files)
1. `models.py` — Pydantic schemas
2. `ai_engine.py` — Gemma 4 + Thinking Mode
3. `multimodal_engine.py` — Chart vision
4. `behavioral_dna.py` — SQLite history
5. `rag_engine.py` — ChromaDB SEBI RAG
6. `crisis_protocol.py` — Distress detection
7. `broker_client.py` — Mock + Zerodha
8. `main.py` — FastAPI server

### Frontend (14 files)
1. `Dashboard.tsx` — Master layout
2. `FinsightIntelligence.tsx` — Score widget
3. `MindfulSpeedBump.tsx` — Core feature
4. `BehavioralDNA.tsx` — History chart
5. `ThinkingLog.tsx` — Reasoning display
6. `ChartAnalyzer.tsx` — Vision upload
7. `CrisisSupport.tsx` — Mental health
8. `LanguageSelector.tsx` — EN/HI/TE/TA
9. `NudgeEngine.tsx` — Toast/Modal
10. `TradePanel.tsx` — Order form
11. `TradingVows.tsx` — Identity contract
12. `useBehavioralScore.ts` — Main hook
13. `useTradeAnalysis.ts` — Trade hook
14. `api.ts` — All API calls

### Gemma 4 Features Demonstrated
1. ✅ Thinking Mode (`<|think|>`) — transparent 6-step reasoning
2. ✅ Multimodal Vision — chart screenshot analysis
3. ✅ Multi-language — Hindi/Telugu/Tamil nudge generation
4. ✅ Structured JSON output — strict schema enforcement
5. ✅ RAG integration — grounded SEBI disclosures
6. ✅ Longitudinal context — behavioral DNA history enrichment

### Prize Eligibility
- Main Track 1st Prize ($50,000): ✅ Impact + Technical
- Ollama Special Track ($10,000): ✅ Best Ollama app
- Safety & Trust Impact ($10,000): ✅ Transparent AI, local
- Digital Equity Impact ($10,000): ✅ B30 cities, Hindi, low-income
- Total potential: $80,000
