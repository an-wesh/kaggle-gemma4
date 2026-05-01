# Live demo deployment

The Kaggle Writeup requires a public live demo URL. This document covers the
recommended deployment: **Vercel** (frontend) + **Modal** (backend with GPU
Gemma) + **Cloudflare Tunnel** as a free fallback if you don't want to
spend on Modal.

The choice of stack is driven by:
- **Free tier where possible** — Vercel hobby is free, Modal $30 free credit
- **Real Gemma inference** — Modal A10G runs Gemma 4 E2B in ~5 s, vs.
  CPU-only on a free tier's Render/Railway which would always hit demo
  fallback
- **Scale-to-zero** — pay only when judges actually hit the URL
- **No bot login required** — judges click the URL and the demo works

Total budget for the May submission window: **under $5**.

---

## Frontend: Vercel (free)

The Next.js 14 app deploys cleanly to Vercel's free tier.

```bash
cd frontend
npm install -g vercel
vercel
```

When prompted:
- **Setup and deploy**: Yes
- **Scope**: your personal account
- **Link to existing project**: No
- **Project name**: `finsight-os`
- **Directory**: `./` (the frontend dir)
- **Framework**: Next.js (auto-detected)
- **Override settings?** No

After the first deploy, set the backend URL env var:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://finsight-os-backend--your-modal-username.modal.run
vercel --prod
```

You'll get a URL like `https://finsight-os.vercel.app`. Paste this into the
Kaggle Writeup's "Live Demo" section.

---

## Backend: Modal (serverless GPU, ~$0.50/day idle)

Modal runs the FastAPI + Ollama stack on an A10G with the Gemma model
pre-loaded. Scales to zero when nobody's hitting it.

### One-time setup

```bash
pip install modal
modal token new                # opens browser for auth
```

Free tier gives you $30 credit, enough for ~30 hours of A10G time. For the
May submission window (judging runs over 1-2 weeks), this is plenty.

### The deploy file

Save this as `modal_app.py` in the repo root:

```python
import modal

app = modal.App("finsight-os")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl")
    .run_commands(
        "curl -fsSL https://ollama.com/install.sh | sh",
        # Pre-pull the model into the image so cold starts only re-load,
        # not re-download. Saves ~3 GB transfer per cold start.
        "ollama serve & sleep 5 && ollama pull gemma4:e2b",
    )
    .pip_install(
        "fastapi[standard]", "uvicorn", "ollama", "yfinance", "chromadb",
        "pydantic", "python-dotenv", "python-multipart", "kiteconnect",
        "httpx",
    )
    .add_local_dir("backend", "/root/backend")
)

@app.function(
    image=image,
    gpu="A10G",                            # 24 GB VRAM, plenty for Gemma E2B
    timeout=600,                           # individual request timeout
    container_idle_timeout=300,            # scale to zero after 5 min idle
    allow_concurrent_inputs=10,            # one container handles up to 10 reqs
    min_containers=0,                      # zero idle cost when nobody's there
    secrets=[modal.Secret.from_name("finsight-secrets")],   # KITE_API_KEY etc
)
@modal.asgi_app()
def fastapi_app():
    import os, subprocess, time, sys
    sys.path.insert(0, "/root")

    # Boot Ollama in the background
    subprocess.Popen(["ollama", "serve"])
    time.sleep(3)

    # GPU env vars — see docs/gpu-setup.md
    os.environ["OLLAMA_NUM_GPU"]   = "99"
    os.environ["OLLAMA_NUM_CTX"]   = "2048"
    os.environ["OLLAMA_NUM_PREDICT"] = "400"
    os.environ["OLLAMA_KEEP_ALIVE"]  = "30m"
    os.environ["OLLAMA_TIMEOUT_S"]   = "30"
    os.environ["DEMO_MODE"]          = "true"
    os.environ["FRONTEND_URL"]       = "https://finsight-os.vercel.app"

    os.chdir("/root/backend")
    from backend.main import app as fastapi_app
    return fastapi_app
```

### Deploy

```bash
# One-time: store secrets (Kite credentials etc.) so they don't live in code
modal secret create finsight-secrets \
    KITE_API_KEY=your_key_or_blank \
    KITE_API_SECRET=your_secret_or_blank \
    KITE_REDIRECT_URL=https://finsight-os-backend.modal.run/kite/callback

# Deploy
modal deploy modal_app.py
```

Modal prints a URL like `https://anweshmohanty69--finsight-os-fastapi-app.modal.run`.

Update Vercel's `NEXT_PUBLIC_API_URL` env var to this URL and redeploy the
frontend (`vercel --prod`).

### Verify

```bash
curl https://anweshmohanty69--finsight-os-fastapi-app.modal.run/health
# expected:
# {"status":"ok","demo_mode":true,"model":"gemma4:e2b","edge_ai":true}
```

First request triggers a ~30-60 s cold start (download model into GPU,
pre-warm). Subsequent requests within 5 minutes return in ~5-8 s.

### Cost monitoring

```bash
modal app stats finsight-os
```

Shows total compute hours and credit consumed. Set a billing alert via
modal.com dashboard if you want a notification at $5.

---

## Backend: free fallback (Cloudflare Tunnel from your laptop)

If you don't want to spend on Modal, you can expose your local backend via
Cloudflare's free tunnel. Caveat: your laptop needs to stay on for the
demo URL to work, and Gemma will fall back to demo mode (no GPU).

```bash
# Install cloudflared
winget install --id Cloudflare.cloudflared

# Run the tunnel (one-shot, gives you a *.trycloudflare.com URL)
cloudflared tunnel --url http://localhost:8000
```

You'll get a URL like `https://random-words-1234.trycloudflare.com`. Paste
into Vercel's `NEXT_PUBLIC_API_URL`. Restart your laptop's backend before
each judge demo. Free, no signup.

Use this **only if Modal credit is exhausted** — the Modal path gives real
Gemma inference which is what judges should see.

---

## Custom domain (optional)

If you want `finsight.app` instead of the `vercel.app` subdomain:

1. Buy `finsight.app` (or whatever) from any registrar — ~₹1,000/year
2. In Vercel project settings → Domains → Add → `finsight.app`
3. Vercel shows the DNS records to add (CNAME / A)
4. Add them at your registrar
5. Wait ~5-30 min for DNS propagation
6. Vercel auto-provisions a Let's Encrypt cert

Update `FRONTEND_URL` env var in Modal secrets so CORS allows the new domain.

This is **optional**. `finsight-os.vercel.app` is just as valid for
submission and judges don't care about the domain.

---

## Public-mode considerations

The deployed live demo is shared by every judge who clicks the URL. Two
risks to mitigate:

1. **State pollution** — one judge's seeded paper trades shouldn't show up
   for the next judge. The current implementation uses a single SQLite
   file. For the demo, this is fine (everyone sees the seeded high-risk
   session); but if you want per-judge isolation, set
   `PAPER_DB_PATH=/tmp/paper-{request_id}.db` in the Modal app to make
   each container start fresh.

2. **Rate limit abuse** — Yahoo Finance and Ollama could be hammered. Add
   per-IP rate limit middleware:

   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=lambda request: request.client.host)
   app.state.limiter = limiter
   # Decorate /analyze-behavior with @limiter.limit("10/minute")
   ```

3. **Live Kite mode**: leave KITE_API_KEY blank in production secrets.
   Judges can clone the repo and run locally to test the OAuth flow per
   `docs/kite-setup.md` — they shouldn't (and can't) log into their
   Zerodha account through your hosted demo URL because the redirect URL
   is registered to `localhost:8000`, not your Modal URL.

---

## Submission checklist for the live demo

- [ ] Vercel URL responds with the mode selector when opened in incognito
- [ ] Picking Demo Mode loads the dashboard with seeded data
- [ ] Picking Paper Mode and placing a BUY adds a row in Today's Trades
- [ ] Speed Bump fires on a high-risk trade and the cooldown counts down
- [ ] Streaming Thinking Log shows live tokens during analysis
- [ ] Kite mode is visible but disabled with the "REQUIRES SETUP" badge
- [ ] `/health` returns `{model: "gemma4:e2b", edge_ai: true}`
- [ ] Vercel URL pasted into Kaggle Writeup's Live Demo field
- [ ] Modal app credit alert set to $5
