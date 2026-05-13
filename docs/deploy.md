# Deployment: GitHub + Vercel + Railway

This is the public hackathon deployment path for Finsight OS:

- GitHub hosts the full source repo.
- Vercel hosts the Next.js frontend from `frontend/`.
- Railway hosts the FastAPI backend from `backend/`.
- Kite credentials are backend secrets, so set them on Railway, not Vercel.

Important honesty note for judging: the app never invents Gemma insights. If
Railway is running on CPU without an Ollama/Gemma runtime, behavioral analysis
returns an explicit "Gemma unavailable" state. To show real Gemma 4 reasoning in
the hosted demo, point `OLLAMA_HOST` at a reachable Ollama/GPU service or use a
GPU backend. The local clone path below runs real Gemma through Ollama.

---

## 1. Push to GitHub

```bash
git remote set-url origin https://github.com/an-wesh/kaggle-gemma4.git
git add .
git commit -m "Prepare Finsight OS for Vercel and Railway"
git push -u origin main
```

Before pushing, confirm these files are not tracked:

```bash
git ls-files .env backend/.env frontend/.env.local backend/data/kite_access_token.encrypted backend/data/kite_secret.key
```

The command should print nothing.

---

## 2. Deploy Backend to Railway

Create a Railway service from the GitHub repo.

Project settings:

- Root directory: `backend`
- Build: Railpack/Nixpacks Python build from `backend/requirements.txt`
- Start command: provided by root `railway.json`
- Health check path: `/health`

Set Railway environment variables:

```bash
DEMO_MODE=false
FRONTEND_URL=https://your-vercel-app.vercel.app
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
OLLAMA_MODEL=gemma4:e2b
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT_S=120
```

Optional Kite variables, only when the judge has a Kite Connect app:

```bash
KITE_API_KEY=your_kite_key
KITE_API_SECRET=your_kite_secret
KITE_REDIRECT_URL=https://your-railway-service.up.railway.app/kite/callback
```

After deployment, verify:

```bash
curl https://your-railway-service.up.railway.app/health
```

Expected shape:

```json
{"status":"ok","demo_mode":false,"model":"gemma4:e2b","edge_ai":true}
```

For persistent Kite sessions or paper trades across Railway redeploys, attach a
Railway volume to the backend data directory. Without a volume, SQLite and Kite
token state can reset on redeploy.

---

## 3. Deploy Frontend to Vercel

Import the same GitHub repo into Vercel.

Project settings:

- Framework preset: Next.js
- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output: Next.js default

Set Vercel environment variables:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-service.up.railway.app
```

Do not put Kite secrets in Vercel. `NEXT_PUBLIC_*` variables are exposed to the
browser bundle, and Kite secrets must remain server-side on Railway.

After the first Vercel URL is live, update Railway:

```bash
FRONTEND_URL=https://your-vercel-app.vercel.app
FRONTEND_ORIGINS=https://your-vercel-app.vercel.app
```

Redeploy Railway or restart the service so CORS picks up the final domain.

---

## 4. Enable Live Kite for a Judge

The judge needs their own Zerodha/Kite Connect API key and secret.

1. In the Kite developer console, set Redirect URL exactly to:
   `https://your-railway-service.up.railway.app/kite/callback`
2. In Railway, set `KITE_API_KEY`, `KITE_API_SECRET`, and `KITE_REDIRECT_URL`.
3. Open the Vercel app and choose Live Kite mode.
4. The frontend calls the Railway backend, Railway handles OAuth, and the
   browser receives an HTTP-only session cookie.

If the judge only has the public Vercel URL and no Kite key, Demo and Paper
modes still work.

---

## 5. Local Judge Path for Real Gemma

This is the strongest path for judging "real, functional Gemma 4" behavior.

```powershell
# Terminal 1: Gemma
ollama serve
ollama pull gemma4:e2b

# Terminal 2: Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python main.py

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`, choose Paper or Live Kite, place trades, and watch
the Gemma Thinking Log say how many trades and vows were sent to the model.

---

## Submission Checklist

- GitHub repo is public and contains no `.env`, token, venv, `.next`, or SQLite
  database files.
- Vercel frontend loads from `frontend/`.
- Railway backend `/health` returns 200.
- Vercel `NEXT_PUBLIC_API_URL` points to Railway.
- Railway CORS env includes the final Vercel domain.
- Paper trading search works, placing a paper trade updates Today's Trades, and
  the Thinking Log reports real trade counts sent to Gemma.
- Live Kite shows "configured" only after Railway has Kite secrets.
- Hosted CPU deployment never shows fake AI insight; it either reaches Gemma or
  displays the explicit unavailable state.
