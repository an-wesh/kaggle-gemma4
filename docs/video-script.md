# Finsight OS · 3-minute submission video

**Deadline:** May 18, 2026
**Length:** 180 seconds, hard cap (Kaggle rule)
**Aspect ratio:** 16:9 · 1920×1080 · 30 fps export
**Distribution:** Public YouTube, embedded in Kaggle Writeup

This is a step-by-step plan you can execute solo on a Windows laptop with DaVinci Resolve (free), Windows Game Bar / OBS for screen capture, and the Fiverr voiceover when it lands. You can record everything except the final voiceover layer *now* and slot the audio in last.

---

## The three acts at a glance

| Act | Time | Purpose | Score impact |
|---|---|---|---|
| 1 — Problem | 0:00 – 1:00 | Establish the 9.6M crisis, three composite voices, lead into demo | Impact (40) |
| 2 — Demo | 1:00 – 2:30 | Show the Speed Bump fire on real local Gemma → SEBI → SQLite stack | Tech Depth (30) |
| 3 — Vision | 2:30 – 3:00 | The Indian retail F&O scale, B30 reach, edge-AI promise | Impact + Storytelling |

---

## ACT 1 · Problem setup (0:00 – 1:00)

The voiceover from `docs/voiceover-brief.md` carries this entire act. Visually, this is montage + on-screen statistics — slow, restrained, documentary register. **Do not show the app yet.** The reveal is in Act 2.

### 0:00 – 0:08 · Open

> **VO:** "Last year, in India, **nine point six million people** lost money trading derivatives. *(pause)* That's not a market correction. That's a public health crisis."

**Visual:**
- 0:00 – 0:04: black frame, white centered text appears one line at a time:
  ```
  India · FY 2024-25
  9,600,000 retail F&O traders
  ₹1,05,603 crore in losses
  ```
  Use DM Sans Bold 64pt. Animation: each line fades in over 0.4s, 0.6s gap.
- 0:04 – 0:08: cut to a slow zoom-in on a single phrase from the SEBI study (screenshot of the actual SEBI PDF, page 3 or wherever the headline stat appears). Highlight the line "91% of individual traders incurred losses" in orange.

**Music:** Start "documentary ambient" bed at -18 dBFS. Pixabay search: "documentary minimal piano". Pick something restrained — solo piano with sustained pad. Avoid anything with build/drop.

### 0:08 – 0:25 · Rohan, Bangalore

> **VO:** "Rohan is a software engineer in Bangalore. Twenty-eight years old, makes eleven lakh a year. Six months ago, after seeing a YouTube influencer turn ten thousand into a lakh, he started trading Nifty options. By April, he had lost three lakh sixty thousand rupees — most of it in the four hours after each losing trade, when he was *trying to win it back.*"

**Visual:**
- B-roll only. No app footage. Stock or screen-recorded clips:
  - Pixabay: "bangalore office", "indian software engineer working", "laptop night code"
  - Screen-recording of YouTube search results for "nifty options strategy" (use a private/incognito tab, anonymize any visible channel logos with a 6px gaussian blur in DaVinci)
  - A single zoomed-in shot of a Zerodha-style red P&L number rolling down (you can mock this in 5 seconds — record yourself typing into a calculator app, then do the rolling animation in DaVinci with a Number Generator)
- On-screen text overlay at 0:18: small caption bottom-left, DM Sans Regular 18pt, white-on-translucent-black:
  > Composite character. Anonymized accounts based on SEBI investor-protection records and public retail-trader forums.
  Keep this caption visible for the full 30 seconds across all three accounts.

### 0:25 – 0:40 · Anjali, Hyderabad

> **VO:** "Anjali is twenty-one. A B.Com student at a college in Hyderabad. Her father sends seven thousand rupees a month for tuition. She spent two months of that on Bank Nifty puts. *Just to see if she could be one of the nine percent.* She wasn't."

**Visual:**
- Pixabay: "indian college student studying", "indian girl phone night", "library students india"
- A second shot: hand on phone, notification of a margin call (you can fake this — open WhatsApp on your phone, screen-record yourself sending a message that says "Margin Shortfall - ₹7,432" to a friend, then crop and slow-motion the receive moment)

### 0:40 – 0:54 · Vikram, Indore

> **VO:** "Vikram runs a small electronics shop in Indore. After his second margin call last June, he took a personal loan from his cousin to top up his trading account. He told no one. Not his wife. Not his accountant. Just kept clicking *Place Order.*"

**Visual:**
- Pixabay: "indian small shop", "indian shopkeeper laptop", "tier 2 city india street"
- A close-up of a hand hovering over a "Place Order" button (you can record this on your own machine — open Zerodha Kite or any broker's order form on your laptop, screen-record the cursor hovering over the green button. Don't actually place an order.)

### 0:54 – 1:00 · Bridge

> **VO:** "Every trading app in India is built to make Rohan, Anjali, and Vikram trade *more.* Finsight OS is built to give them — *one moment* — to think."

**Visual:**
- 0:54 – 0:57: hard cut from B-roll to black for 0.3s
- 0:57 – 1:00: Finsight OS logo (the orange shield) animates in on white background. Below it, the wordmark "Finsight OS" in DM Sans Bold 80pt. Subtitle "Behavioral Guardian" in 24pt Regular below. Hold for 1 second.

**Music:** Crossfade at 0:55 from documentary bed to a slightly warmer second cue. Pixabay search: "ambient hopeful piano". Same low volume.

---

## ACT 2 · Live demo (1:00 – 2:30)

This is your technical-depth proof. Record this in **one continuous screen capture** if you can — judges trust uncut footage more than a montage. If you must edit, keep cuts under 5 frames.

**Pre-recording setup:**
1. Move project out of OneDrive to `C:\finsight-os\` to avoid `.next` lock errors mid-recording. Or accept the risk.
2. Wipe `backend/data/paper_trading.db` so the demo seeder fires fresh.
3. Start backend: `python main.py`. Wait for `Pre-warm complete in X.Xs` before recording.
4. Open Chrome in a fresh incognito window. Set zoom to 100%, window to 1600×900 (slightly smaller than your screen — leaves room for cursor highlights in DaVinci).
5. Load `http://localhost:3000`. Verify:
   - Watchlist shows real prices with "NSE live" or "Market closed" badge
   - Today's Trades shows the seeded 5 closed + 2 open with footer "real paper trades · SQLite"
   - Margin Usage reads 85% red
   - Behavioral score in Intelligence card reads 892 with risk LOW/HIGH dot
6. **Recording tool:** OBS Studio (free), 1080p60, NVENC if available, MP4 container. Or Windows Game Bar (Win+G) at 1080p30. OBS gives cleaner cursor.

### 1:00 – 1:10 · The dashboard reveal

**On screen:** Slow scroll from top of dashboard down to the Place Order panel. Pause briefly at each card so judges can read.

**VO (recorded by you, in DaVinci, simple Indian-English voice or carry the Fiverr narrator if budget allows):**
> "This is Finsight OS. Live NSE prices on the left. Real paper trades persisted in SQLite. Behavioral score from a Gemma 4 model running locally at one hundred and twenty-seven point zero point zero point one, port eleven thousand four hundred and thirty-four. No cloud."

**Annotations to add in DaVinci** (small callout boxes appearing for 2 seconds each):
- "Yahoo Finance via yfinance" → Watchlist header
- "FIFO lot matching · SQLite" → Today's Trades footer
- "Gemma 4 · CPU-local" → the inference badge in the Intelligence card

### 1:10 – 1:25 · Setting up the trade

**On screen:**
1. Click the Instrument dropdown, select `NIFTY24DEC23000CE`.
2. Set quantity to 100 and price to ₹250.
3. Hover over the green BUY button.

**VO:**
> "I've already lost on four trades today. Margin used: eighty-five percent. The model just classified me as Revenge Trading. Watch what happens when I try to place another order."

### 1:25 – 1:50 · The Speed Bump fires

**On screen:**
1. Click BUY.
2. The Speed Bump modal appears. **Hold for 3-4 seconds without moving the cursor** so the audience can read the:
   - Red triangle icon
   - "Mindful Speed Bump" headline
   - "Gemma 4 detected Revenge Trading — behavioral score 892/1000" subtitle
   - The 15-word commitment phrase in red italic
3. Click into the input field. **Slowly type** the commitment phrase: *"I am trading to recover losses, not following my plan today."* Type at human speed — about 4-5 words per second. The progress bar will fill orange→green as you type.
4. When the bar turns green and the button reads "✓ Confirm BUY", **pause for 1 full second**, then click.
5. The modal closes. The "Order placed" green confirmation appears in the trade panel.

**VO over this segment** (the dramatic core of the video — you may want to record this carefully):
> "The button is enabled. Nothing's stopping me. But I have to type — *literally type, with my own fingers* — what I'm about to do. Fifteen words, generated in real time, naming the specific pattern."
>
> *(let typing fill ~5 seconds of audio)*
>
> "Twelve seconds. That's all it takes for the prefrontal cortex to come back online. For System 2 thinking to overrule System 1. The order still goes through. The user remains in control. But the impulse path now has a speed bump in it."

**Pacing note:** This is the emotional and technical climax. Don't rush. If the typing takes 8 seconds and the modal+VO takes 25, that's fine. The whole act has 90 seconds.

### 1:50 – 2:10 · Show the technical guts

**On screen — quick montage with text overlays:**

1. **1:50 – 1:55** — Swap to the **Thinking Log** panel below the Intelligence card. Click to expand. Show the 7-step reasoning trace.
   - **VO:** "The model's full reasoning chain, exposed."

2. **1:55 – 2:00** — Swap to **/api/docs** (FastAPI's auto-generated Swagger). Show the endpoint list, expand `/analyze-behavior`.
   - **VO:** "Eight FastAPI endpoints. Real schema."

3. **2:00 – 2:05** — Swap to a terminal showing `python paper_trading.py` output: 3 trades, FIFO match, P&L of -350.
   - **VO:** "FIFO lot matching against persistent SQLite."

4. **2:05 – 2:10** — Swap to the **Architecture diagram** (`docs/architecture.html`). Slow zoom from full-frame down into the green local-engines layer.
   - **VO:** "Six engines, all local. Zero financial data leaves the device."

**Annotations during this 20s:** small captions naming each Gemma 4 feature as it appears on screen — Thinking Mode, Multimodal, Multi-language, Structured JSON, RAG-grounded, Longitudinal Context.

### 2:10 – 2:30 · Multilingual + crisis

**On screen:**
1. Click the language selector in the top header. Select Hindi.
2. The Speed Bump modal (re-trigger by clicking BUY again) now shows the commitment phrase in **Devanagari** below the English line.
3. Cut to the **Crisis Support** modal (you can dismiss-then-re-trigger by raising the crisis score in seed data, or trigger it directly via clicking a "Show Crisis" debug button if you've added one).

**VO:**
> "It speaks Hindi. Tamil. Telugu. The same edge AI that protects an English-speaking engineer in Bangalore protects a Telugu-speaking shopkeeper in Warangal. And when the model detects financial distress severity above seventy out of one hundred, it suspends the Speed Bump and shows verified iCALL helpline numbers — in the user's language."

---

## ACT 3 · Vision close (2:30 – 3:00)

Documentary register again. This is where you state the scale and end on the future.

### 2:30 – 2:45 · The numbers

**On screen:** Animated text statistics, one line every 2 seconds:
```
9,600,000 traders affected
72% from B30 cities
75% earn under ₹5 lakh/year
4 languages supported
0 servers required
```
Use DM Sans Bold, growing in size as the line appears. Background: white-to-light-orange gradient.

**VO** (Fiverr narrator — closing voice):
> "Nine point six million people. Seventy-two percent in small towns. Edge AI that runs on a four-year-old laptop, in four languages, with no internet."

### 2:45 – 2:58 · The vision

**On screen:** Single shot. The Finsight OS logo on the orange shield, centered. Below it, in small DM Sans Regular: *"Finsight OS · open source · MIT licensed"*. Above it: *"Built on Gemma 4 · Privacy-first edge AI"*. Hold this static for 13 seconds.

**VO:**
> "Gemma 4 made the technology accessible. Finsight OS makes the protection inevitable. Open source. MIT licensed. Free. Forever. Because behavioral guardianship shouldn't be a premium feature — it should be the default."

### 2:58 – 3:00 · Outro

**On screen:** 2-second card with three logos side by side: Kaggle, Gemma, Finsight OS. Below: "Submitted to the Gemma 4 Good Hackathon · May 2026"

**Music:** Final note holds and tails out at 2:58.

---

## Production checklist

### Pre-shoot (do this Day 1)

- [ ] Order Fiverr voiceover with the script in `docs/voiceover-brief.md`
- [ ] Move project out of OneDrive (optional — see handoff)
- [ ] Wipe `backend/data/paper_trading.db` so seeder fires fresh
- [ ] Install OBS Studio and configure for 1080p60 NVENC, MP4 container
- [ ] Install DaVinci Resolve Free
- [ ] Pull Pixabay B-roll (search list above) — download 4K versions
- [ ] Pull music: 2 tracks from Pixabay/Epidemic Sound trial
- [ ] Test screen recording for 30 seconds; confirm cursor visible, fps stable, audio clean

### Shoot (Day 2-3, ~2-3 hours)

- [ ] Record Act 1 B-roll narration scratch (your voice, will replace with Fiverr)
- [ ] Record Act 2 demo, **single continuous take**. Re-take until clean.
- [ ] Record Act 3 voiceover scratch
- [ ] Save all takes to `assets/raw/` with date-prefixed names

### Edit (Day 4-5, ~4-6 hours in DaVinci)

- [ ] Build the timeline at 1920×1080 30fps
- [ ] Drop Fiverr WAV onto the audio bus when it arrives
- [ ] Cut Act 1 montage to voiceover beats
- [ ] Place Act 2 demo screen-cap and add callout annotations
- [ ] Build Act 3 stat animations (Text+ animator, fade in over 0.6s)
- [ ] Add background music bus, sidechain duck under voiceover (-18 dBFS bed → -28 dBFS under VO)
- [ ] Add captions: Files → Auto Subtitle, then proof "lakh"/"crore"/"Nifty"
- [ ] Color grade pass: warm the highlights slightly, lift the shadows. Don't over-grade.
- [ ] Master loudness: -16 LUFS (YouTube standard), -1 dBTP ceiling
- [ ] Export H.264, 1080p, ~12 Mbps, AAC audio 192 kbps

### Upload + verify (Day 6)

- [ ] Upload to YouTube as **Public** (NOT Unlisted — judges need no-login access)
- [ ] Title: `Finsight OS · Behavioral Guardian for India's Retail F&O Traders · Built on Gemma 4`
- [ ] Description: 2-paragraph summary, GitHub link, live demo link, attribution to Fiverr narrator and Pixabay B-roll
- [ ] Auto-generate captions, then **manually correct** "lakh", "crore", "Nifty", "Gemma", "FIFO", and the three character names
- [ ] Add chapter markers at 0:00, 1:00, 2:30
- [ ] Click Save, then **open the URL in an incognito window** to confirm it plays without login
- [ ] Paste the YouTube URL into the Kaggle Writeup

---

## Five things that will go wrong (mitigations)

1. **OneDrive locks `.next` mid-shoot.** → Move project out. Or save script before each take.
2. **OBS records audio out of sync.** → Set audio bitrate to 192 kbps, sample rate 48 kHz. Test 30s before the real shoot.
3. **The Fiverr voiceover ends up sounding wrong.** → You have 4 backup options in `docs/voiceover-brief.md`. ElevenLabs Indian voice is the fastest fallback.
4. **DaVinci runs out of memory on a 16 GB machine.** → Use Optimized Media (right-click in media pool). Cuts memory pressure ~70%.
5. **Auto-captions mangle "lakh" → "lock" and "crore" → "core".** → Manual fix in YouTube Studio. Budget 30 minutes for caption proofing.

---

## What "good" looks like for each scoring dimension

The judges will rate you on three axes:

**Impact & Vision (40 pts)** — owned by Acts 1 and 3. The composite testimonies and the "edge AI made the protection inevitable" close are the points-getters. If Act 1 makes a judge feel something, you've already moved the score.

**Video & Storytelling (30 pts)** — owned by production polish. Music + captions + smooth pacing matter as much as the content. A janky cut in Act 2 will cost you more than a missing technical detail.

**Technical Depth (30 pts)** — owned by Act 2. The continuous-take Speed Bump demo plus the 20-second tech guts montage (Thinking Log, Swagger, terminal, architecture) is what makes the "real, not faked" judgment in the rubric clear. Do not skip the architecture-diagram zoom.

---

## Final tip

Watch three Gemma 3n Impact Challenge winners on YouTube before you start editing. Match their *pacing*, not their content. Your edges should be a beat slower than feels natural — documentary, not commercial.
