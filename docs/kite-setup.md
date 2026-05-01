# Live Kite Connect setup — 5-minute walkthrough for judges

Finsight OS ships with three deployment modes: **Demo**, **Paper Trading**,
and **Live Kite Connect**. The first two need no setup. This guide enables
the third, which connects the app to a real Zerodha trading account so
holdings, positions, and orders go through the actual broker API.

The integration is **fully implemented in the public repo**. This guide is
for reviewers who want to verify the broker plumbing end-to-end. The
recorded video uses Demo + Paper modes to avoid leaking authenticated
account data publicly (per Zerodha's API Terms of Service).

## Cost

**Zero.** Zerodha's "Personal" tier of Kite Connect is **₹0 / month** and
covers everything Finsight OS uses (orders, holdings, positions, profile,
margin, quotes). The ₹500/month "Connect" tier is only required for
WebSocket live ticks and historical candle data — neither of which Finsight
needs (we use Yahoo Finance for prices).

You do need an existing Zerodha trading account to log in. Opening one is
free but requires Indian KYC.

## Step 1 — Register a Kite Connect app (one-time, ~3 min)

1. Go to https://kite.trade/connect/
2. Sign in with your Zerodha credentials
3. Click **Create new app**
4. Fill the form:
   - **App name**: `Finsight OS Local`
   - **App type**: `Connect`
   - **Redirect URL**: `http://localhost:8000/kite/callback` (exactly this)
   - **Description**: `Behavioral guardian for retail F&O traders`
5. Submit. You'll see your **API key** and **API secret** on the next page.
   Copy both — the secret is shown only once.

## Step 2 — Configure the backend (1 min)

Open `backend/.env` (copy from `backend/.env.example` if it doesn't exist
yet) and set:

```bash
KITE_API_KEY=your_api_key_from_step_1
KITE_API_SECRET=your_api_secret_from_step_1
KITE_REDIRECT_URL=http://localhost:8000/kite/callback
```

Make sure the `kiteconnect` package is installed in the backend venv:

```powershell
cd C:\Users\anwes\OneDrive\Desktop\kaggle\backend
venv\Scripts\activate
pip install kiteconnect
```

## Step 3 — Start the backend (30 sec)

```powershell
$env:DEMO_MODE="true"
python main.py
```

In the startup logs you'll see:

```
Finsight OS - Behavioral Guardian for India's Retail Traders
   Mode: DEMO (High-Risk Mock)
   AI:   gemma4:e4b via Ollama (local, private, CPU)
   RAG:  SEBI circulars indexed
```

Verify Kite is recognized:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/kite/status"
```

Expected:

```
configured     : True
authenticated  : False
```

## Step 4 — Pick the mode in the UI (10 sec)

1. Open http://localhost:3000 in your browser
2. The mode selector appears as the first screen
3. The **Live Kite Connect** card now shows "REAL BROKER" badge (green)
   instead of "REQUIRES SETUP"
4. Click **Login with Zerodha**

## Step 5 — Log in via Zerodha's OAuth (30 sec)

1. The browser redirects to `https://kite.zerodha.com/connect/login?…`
2. Enter your Zerodha credentials + complete 2FA
3. Zerodha redirects back to `http://localhost:8000/kite/callback?...`
4. Finsight's backend exchanges the request_token for an access_token,
   sets an HTTP-only session cookie, redirects you to the dashboard
5. Header now shows the **LIVE** badge instead of DEMO; the Live Kite Connect
   pill is green; your Zerodha user name appears in the corner

## Step 6 — Verify the integration (30 sec)

In the dashboard, with mode = Live Kite:

- **Today's Trades** panel pulls from Kite's `/trades` endpoint (real fills
  from your account)
- **Margin Usage** panel pulls from Kite's `/margins`
- **Place Order** uses Kite's `/orders` API — actually submits a real order
  on Zerodha. **The Mindful Speed Bump still gates this** — the order is
  only sent after the commitment phrase is typed AND the cooldown elapses.

To verify without placing a real trade, click the API docs:
`http://localhost:8000/docs` → `/portfolio` → Try it out → Execute. You
should see your actual Zerodha holdings and positions in the response.

## Daily token expiry

Kite Connect access tokens expire at **6:00 AM IST** every day. After that,
the next API call returns 401, the session cookie is cleared automatically,
and the UI prompts re-login. This is Zerodha's design, not ours.

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `503 Kite Connect is not configured` | `.env` values missing | Step 2 |
| `Invalid `redirect_url`` from Zerodha | Mismatch between the redirect on kite.trade and `KITE_REDIRECT_URL` | Make them identical, no trailing slash |
| `kiteconnect package not installed` | venv missing the lib | `pip install kiteconnect` in backend venv |
| `401 Kite access_token expired` | Daily 6 AM IST expiry | Click logout → login again |
| Login redirects to a 404 | Backend not running on `:8000` | Start backend before clicking login |

## What this proves to a judge

The Live Kite Connect path demonstrates that Finsight OS isn't just a
sandbox — the Mindful Speed Bump can sit between any of Zerodha's 16 million
existing users and the Place Order button, with no broker partnership
required, no monthly subscription, and full SEBI compliance.

Source code:
- `backend/kite_client.py` — SDK wrapper, rate limiter, session map
- `backend/main.py` — `/kite/login-url`, `/kite/callback`, `/kite/logout`,
  `/kite/status`, plus mode-aware dispatch on `/portfolio`,
  `/trade-history`, `/confirm-trade`
- `frontend/src/components/ModeSelector.tsx` — first-screen picker
- `frontend/src/contexts/ModeContext.tsx` — mode persistence + provider
- `frontend/src/lib/mode.ts` — shared types and the `X-Finsight-Mode` header
- `frontend/src/lib/api.ts` — credentialed fetch with mode header threaded
