# Finsight OS · 3-minute submission video — FOUNDER-DEMO FORMAT

**Deadline:** May 18, 2026
**Length:** 180 seconds, hard cap (Kaggle rule)
**Aspect ratio:** 16:9 · 1920×1080 · 30 fps export
**Distribution:** Public YouTube, embedded in Kaggle Writeup
**Format:** YOU on camera as the developer-founder + screen recording of you using the product

> This is a more authentic and higher-scoring format than the previous
> "voiceover narrating composite characters" approach. A real Indian
> developer showing a real Indian retail-trader problem they built a
> real edge-AI tool for is exactly the rubric judges optimize against.

---

## The three acts

| Act | Time | What's on screen | Score weight |
|---|---|---|---|
| 1 — Hook | 0:00 – 0:35 | YOU on camera in front of laptop, with SEBI numbers overlay | Impact (40) |
| 2 — Demo | 0:35 – 2:20 | Screen recording of you using the product, your voice narrating | Tech Depth (30) |
| 3 — Close | 2:20 – 3:00 | YOU on camera again, no laptop visible, vision close | Storytelling (30) |

Act 1 and Act 3 are the same setup — record them back-to-back in one
sitting to keep your lighting / wardrobe / mic level identical.

---

## ACT 1 · The hook (0:00 – 0:35)

**You on camera. Front-on framing, head-and-shoulders. Eye-line to lens.**

Open with three seconds of silence then look at the camera and start.

### What to say (loose — improvise around these beats)

> "Last year, in my country, **9.6 million people** lost money trading
> on the stock market. Not investing — *trading*. Day-trading options.
> SEBI — that's our market regulator — published the numbers two months
> ago: ninety-one percent of retail F&O traders lost money. Average loss:
> one point one lakh rupees. Total: one lakh five thousand crore."
>
> *(brief pause, quieter)*
>
> "I'm a developer in India. I know people who lost their tuition money
> chasing options. I built Finsight OS — a privacy-first AI guardian
> that runs on the same kind of laptop they use, in their language, and
> puts a 12-second speed bump between them and the next bad trade."

### What's on screen

- **0:00 – 0:08** — wide shot of you looking down/typing, then look up to camera as the music kicks in subtly. Lower-third caption: *"Anwesh Mohanty · Developer, India"*
- **0:08 – 0:15** — when you say "9.6 million", a clean number animation overlays the bottom-right of the frame: `9,600,000` ticks up from 0 in 1.5 seconds. Hold for 2 sec.
- **0:15 – 0:22** — when you say "91% lost money", overlay `91%` in red. When you say "₹1.1 lakh", overlay that. When you say "₹1,05,603 crore", overlay that. Each ~1 second, stacking in the bottom-third.
- **0:22 – 0:29** — pause overlays. Just you on camera saying the personal "I know people who…" beat. This is the emotional anchor.
- **0:29 – 0:35** — when you say "Finsight OS", cut to a quick 1-second logo bumper (the orange shield from the brand assets), then back to you for "and puts a 12-second speed bump between them and the next bad trade."

### Tone

Documentary, not commercial. Don't smile. Don't gesture much. Speak
slowly. The numbers carry the weight; you're the witness.

---

## ACT 2 · The demo (0:35 – 2:20)

**Screen recording of the actual app. Your voice over.** No face-cam in
this section — your face appears as a small picture-in-picture only
during the Speed Bump moment (0:55 – 1:30), so the viewer sees your
reaction to the friction.

### What's on screen, beat by beat

**0:35 – 0:50 · The dashboard reveal**

Open `http://localhost:3000` in incognito Chrome at 100% zoom. The mode
selector appears.

- **0:35 – 0:40** — slow zoom on the mode-selector — three cards side by side. Cursor hovers over each in turn. Captions appear on screen for each: *"Demo · zero setup"*, *"Paper Trading · real prices"*, *"Live Kite · real broker"*.
- **0:40 – 0:42** — cursor clicks **Demo Mode**.
- **0:42 – 0:50** — page transitions to dashboard. Slow cursor scroll from top (Watchlist with NSE prices) → Today's Trades (12 trades, footer says "real paper trades · SQLite") → Behavioral Intelligence card (892 score, red HIGH RISK pill).

**Voiceover** (your actual voice, recorded after the fact while you watch the screen recording):

> "This is the dashboard. Real Nifty and Bank Nifty prices from Yahoo.
> Real paper trades persisted to a local SQLite database. The behavioral
> score on the right — eight ninety-two out of a thousand — comes from
> Gemma 4 running locally on my machine. There's no cloud."

**0:50 – 0:55 · Setting up the trade**

Cursor moves to the Place Order panel. Selects `NIFTY24DEC23000CE` from the dropdown. Sets quantity to 100, price to ₹250. Hovers over the green BUY button.

**Voiceover:**

> "I've already lost on four trades today. The model says I'm in Revenge Trading. Watch what happens when I try to place another one."

**0:55 – 1:30 · The Speed Bump fires (THE EMOTIONAL CORE)**

This is the moment the video sells. Hold it.

- **0:55** — cursor clicks BUY. The Speed Bump modal fades in over the dashboard.
- **0:55 – 1:05** — modal stays static for 10 full seconds. The countdown ring depletes from 14 → 13 → 12 around the warning icon. Picture-in-picture overlay (top-right corner) of YOUR FACE appears — you're looking at the screen, slightly furrowed, reading the phrase. Don't act. Just be present.
- **1:05 – 1:25** — you start typing the commitment phrase into the input field. Type slowly — about 4 words per second. The progress bar fills from orange to green. The countdown finishes (ring goes green). Picture-in-picture stays visible.
- **1:25 – 1:30** — you click "✓ Confirm BUY". Modal closes. Order placed.

**Voiceover** during this segment:

> "The button was enabled. Nothing was stopping me. But I had to type — letter by letter — what I was about to do. Fifteen words. Generated by Gemma in real time. Naming the specific pattern: Revenge Trading. Twelve seconds. That's all it takes for the rational part of the brain to come back online. The order still went through. I'm still in control. But the impulse path now has a speed bump in it."

The line "twelve seconds" should land EXACTLY when the on-screen countdown is at 12. Practice this until it syncs.

**1:30 – 1:50 · The technical guts (montage)**

Quick cuts showing the engineering depth. No voiceover for the first 5 seconds — just a music swell. Then speak in time with each cut.

- **1:30 – 1:35** — cursor expands the Thinking Log panel below the dashboard. Streaming reasoning text fills in — STEP 1 in purple, STEP 2 in amber, STEP 3 in blue. Caption: *"Streaming Gemma 4 reasoning · Server-Sent Events"*
- **1:35 – 1:40** — cut to a terminal showing `python paper_trading.py` output: 3 trades, FIFO match, P&L of -350. Caption: *"Real FIFO lot matching · SQLite"*
- **1:40 – 1:45** — cut to `localhost:8000/docs` showing FastAPI Swagger with the 12 endpoints. Caption: *"12 FastAPI endpoints · 3 deployment modes"*
- **1:45 – 1:50** — cut to architecture diagram (`docs/architecture.html`) zoomed slowly from full frame down into the green local-engines layer. Caption: *"Seven local engines · zero financial data leaves the device"*

**Voiceover** during 1:35–1:50:

> "Real FIFO trade matching. Twelve API endpoints. Seven local engines — Gemma, ChromaDB SEBI grounding, paper trading, behavioral history, crisis protocol, multimodal vision, live broker integration. Everything runs on the user's machine."

**1:50 – 2:20 · Multilingual + crisis cutaway**

- **1:50 – 1:55** — cursor clicks the language selector in the header. Hindi / Telugu / Tamil options appear. Click Hindi.
- **1:55 – 2:05** — re-trigger the Speed Bump (place another BUY). The modal now shows the commitment phrase in **Devanagari** below the English line. Hold the dual-language frame for 3 seconds.
- **2:05 – 2:15** — cut to the Crisis Support modal (trigger by raising crisis score to 75+ in seed data, OR have a debug "Show Crisis" link you click in passing). It shows iCALL helpline + "Talk to someone in your language" in 4 scripts.
- **2:15 – 2:20** — back to dashboard, Live Kite Connect mode pill visible in header. Quick caption: *"Live Kite Connect · Free tier · ₹0/month"*

**Voiceover:**

> "It speaks four Indian languages. The same edge AI that protects an English-speaking engineer in Bangalore protects a Telugu-speaking shopkeeper in Warangal. When the model detects severe financial distress — above seventy out of a hundred — it suspends the Speed Bump and shows verified iCALL helpline numbers in the user's own language. And anyone with a Zerodha account can plug it into their real broker today, free, via the Live Kite Connect mode."

---

## ACT 3 · The vision close (2:20 – 3:00)

**You back on camera. Same setup as Act 1 — same lighting, same framing,
same wardrobe. No laptop visible.**

### What to say

> "Nine point six million people. Seventy-two percent of them in small
> towns and rural India. Seventy-five percent earning under five lakh
> rupees a year. They run laptops just like this one"
> *(briefly hold up the laptop or gesture toward it off-screen)*
> "with patchy internet, in three or four languages."
>
> "Gemma 4 made the technology accessible. Finsight OS makes the
> protection inevitable. Open source. MIT licensed. Free. Forever."
>
> *(short pause, look directly into the lens)*
>
> "Because behavioral guardianship shouldn't be a premium feature. It
> should be the default."

### What's on screen

- **2:20 – 2:40** — full face-cam, you delivering the lines. Lower-third caption: *"9.6M traders · 72% B30 cities · 75% under ₹5L/year · 4 languages · 0 cloud · ₹0 cost"*
- **2:40 – 2:55** — when you say "Open source. MIT licensed. Free. Forever." each phrase appears as a clean white-on-orange caption animating in over your shoulder.
- **2:55 – 3:00** — cut to a 5-second card with three logos: Kaggle, Gemma, Finsight OS. Below: *"Submitted to the Gemma 4 Good Hackathon · May 2026"*. Music tails out.

---

## Recording order (most efficient sequence)

You don't have to shoot in the order the audience will see it. Optimize
for setup time, not story order.

**Day 1 — face-cam day (1.5 hours total)**
1. Set up lighting + camera + mic per `docs/recording-setup.md` (30 min)
2. Do 5-8 takes of Act 1 (the 30-second hook). Pick best one in editing. (30 min)
3. Do 5-8 takes of Act 3 (the 40-second close). Same setup. (20 min)
4. Tear down, save raw files (10 min)

**Day 2 — screen-cap day (1 hour total, separate from face-cam)**
1. Wipe `backend/data/paper_trading.db`, restart backend, wait for pre-warm (5 min)
2. Open Chrome incognito, set window size, hide bookmarks bar (2 min)
3. Start OBS recording at 1080p60. Run through Act 2 in one continuous take. Pick best take of 3-5 attempts. (40 min)
4. Record any insert shots you need (terminal, Swagger, architecture diagram) (15 min)

**Day 3 — voiceover day (45 min)**
1. Recreate the same audio setup from face-cam day so timbre matches (10 min)
2. Watch the Act 2 screen recording on a second monitor; record voiceover on the first (30 min)
3. Re-do any line that doesn't sync to the on-screen action (5 min)

**Day 4-5 — edit (4-6 hours in DaVinci Resolve)**

See the edit checklist below.

---

## DaVinci edit checklist

- [ ] Timeline at 1920×1080, 30 fps
- [ ] Three video tracks: face-cam, screen-cap, picture-in-picture (face during Speed Bump)
- [ ] Two audio tracks: voiceover + music bus
- [ ] Music sidechain ducked at -28 dBFS under voiceover, full -18 dBFS otherwise
- [ ] Captions auto-generated then proofread for "lakh", "crore", "Nifty", "Gemma", "Devanagari"
- [ ] Color grade: subtle warm tint on face-cam (skin looks healthier on camera), screen-cap untouched
- [ ] Title cards animated in over 0.4s with fade-in
- [ ] Master loudness at -16 LUFS, -1 dBTP ceiling (YouTube standard)
- [ ] Export H.264, 1080p, ~12 Mbps, AAC 192 kbps stereo

---

## What this format is worth

The previous Fiverr-narrator approach scored projection: 22-26 / 30 on
Storytelling. **Founder-on-camera demo scores projection: 25-28 / 30**
because it solves the "no real human face" gap that caps the previous
plan at ~85.

The lower bound on this format is: you read the lines stiffly and the
camera is bad and the audio is muffled. That still scores ~24 on
Storytelling because the *content* is right.

The upper bound is: you deliver the personal "I know people who lost
their tuition money" beat with real conviction, and the Speed Bump
demo flows naturally because you've used it 50 times. That scores 28
or higher because no other submission will have a real Indian developer
showing a real Indian problem they built a real solution for.

---

## What kills this format

The two failure modes worth pre-empting:

1. **You read the script word-for-word and it sounds robotic.** Solution: see `docs/talking-points.md` — that's a beats-only sheet, NOT a script. Glance at it, then look at the lens and improvise. Most takes will sound natural by the third or fourth attempt.

2. **Audio is muffled / room echo / refrigerator hum.** Solution: see `docs/recording-setup.md` — the mic-in-a-closet trick. Audio is 70% of perceived production quality.

If both of those land, the rest of the production is forgiving.
