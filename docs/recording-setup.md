# Recording setup — face-on-camera + screen capture at home

A practical guide to getting professional-looking face-cam and screen
recordings using consumer equipment in a normal room. Total spend if you
have a laptop already: **₹0 to ₹2,500**. Most failure modes here are
audio, not video — invest there first.

---

## What you need

### Tier 1 — minimum viable (₹0, what you probably already have)

- **Camera:** your laptop's built-in webcam OR your smartphone clamped to a stack of books at eye level
- **Mic:** your laptop's built-in mic, recorded in a small closet draped with blankets
- **Lighting:** a sunny window in the morning or late afternoon, with you facing the window
- **Background:** a plain wall or a slightly out-of-focus bookshelf

This produces "competent YouTube creator" quality. Adequate for the
submission. Roughly +2 on Storytelling vs. dark-room low-quality.

### Tier 2 — clear upgrade (₹1,000 – ₹2,500)

- **Mic:** ₹800-1500 USB lavalier or ₹1,500-2,500 Boya BY-M1 lavalier with smartphone adapter — the single biggest upgrade you can make
- Everything else from Tier 1

This produces "real podcast" audio quality, which the audience
unconsciously reads as "this person is professional." Roughly +3 on
Storytelling vs. Tier 1.

### Tier 3 — overkill, skip unless you already own it

External webcam (Logitech C920 / Brio), softbox lights, etc. The marginal
return is small relative to the time spent setting them up.

---

## Lighting — the single most important visual decision

**Best free option:** Sit facing a window between 09:00-11:00 IST or
15:00-17:00 IST. The sun should be coming over your laptop's screen onto
your face. Don't sit with the window behind you — that makes you a
silhouette.

**If no window or wrong time of day:** Place your laptop near a desk
lamp with a white-paper diffuser. The lamp should be in front of you,
slightly above eye line, angled down 15°. Test with a quick selfie before
recording.

**What to avoid:**
- Overhead fluorescent tube lighting (gives you raccoon-eye shadows)
- Coloured LED strip lights (camera color-balances badly)
- Mixed light sources (window + lamp + screen — your skin tone will look weird)

**Quick test:** Open Photo Booth / Camera app, look at yourself. Can you
clearly see both your eyes and the catchlight in them? If yes, lighting
is fine. If your eyes are dark voids, add or move light.

---

## Audio — the other most important decision

**Best free option:** Record voice in a small closet (the smaller the
better). Stand up, drape blankets and clothes around you to absorb echo.
Hold your phone up about a fist's distance from your mouth (off to the
side, not directly in front — that's where pop sounds come from). Use
the Voice Memos app on iPhone, or any voice recorder on Android.

**Why a closet:** echo is the #1 thing that makes home recordings sound
"home recording." Soft surfaces (blankets, clothes, mattresses) absorb
echo. Hard surfaces (walls, desks, floors) bounce it.

**What NOT to do:**
- Don't record voice in a kitchen, bathroom, or any tiled room
- Don't sit at your desk with the mic 18" away from your face
- Don't use AirPods or any Bluetooth earbuds — the mic on those compresses voice and makes you sound like you're on a phone call from 2008

**If you spend ₹1,500 on a Boya BY-M1:** Plug it into your phone via the
adapter. Clip it on your shirt collar about 8" from your mouth, slightly
off-center. Record. Done. This sounds nearly studio-quality.

---

## Camera framing for face-on-camera (Acts 1 & 3)

**Headroom:** Top of your head should be ~10% of frame height from the
top edge. Not touching the top, not floating in the middle.

**Eye-line:** Your eyes should sit on the upper third of the frame
(rule of thirds — the imaginary horizontal line at 1/3 from the top).

**Distance:** Your shoulders fill the bottom third. Don't be too far
back ("interview subject") and don't be too close ("vlogger reaction
shot"). Head and shoulders is the sweet spot.

**Background:** A plain wall, a bookshelf at distance with the books
slightly out of focus, or an architectural feature (window with curtain,
brick wall). NOT your unmade bed, NOT your kitchen, NOT a busy room.

**Eye contact:** Look at the LENS, not at your own face on the screen.
Most people instinctively look at the screen — viewers on the other end
read this as "you're not talking to me, you're checking yourself out."
Tape a sticky note next to the lens that says LOOK HERE.

---

## Screen recording for Act 2

**Software:** OBS Studio (free, all platforms). Default settings are fine
for 1080p30. If your machine handles it, switch to 1080p60 — gives you
the option to do a slow-motion zoom later.

**Pre-recording checklist:**
- [ ] Browser at 100% zoom (Ctrl+0 to reset)
- [ ] Browser window sized to 1600×900 (smaller than your screen — gives you margin in editing)
- [ ] Hide bookmarks bar (Ctrl+Shift+B in Chrome)
- [ ] Use incognito to avoid showing autocomplete history or other personal sites
- [ ] Close all other tabs
- [ ] Hide the OBS window itself or put it on a second monitor
- [ ] Mute system notifications (Windows Focus Assist on, Mac Do Not Disturb on)
- [ ] Disconnect Slack, WhatsApp Desktop, Telegram, Discord
- [ ] Plug in your laptop — fan noise spikes when on battery + heavy CPU
- [ ] Pre-warm the backend so the first analyze-behavior call doesn't hit cold start

**OBS settings:**
- Video → Output Resolution: 1920×1080
- Video → Common FPS: 30 (or 60 if your CPU handles it)
- Output → Recording Format: MP4
- Output → Encoder: NVENC (if you have NVIDIA GPU) or x264 with "veryfast" preset
- Audio → Sample Rate: 48 kHz
- Audio → Desktop Audio: Disabled (we want clean visual, no system sound)

**Cursor visibility:** OBS captures cursor by default. To make it more
visible in editing, install "Cursor Highlight" software (free) or just
make the cursor temporarily larger in your OS accessibility settings.

---

## Picture-in-picture (face during the Speed Bump)

For the 35-second segment where you're typing the commitment phrase,
the audience should see your face reacting in a small overlay (top-right
of frame, ~20% of frame width).

**Easiest path:** Record face-cam separately during your screen
recording session. Just leave your phone propped up beside the laptop
recording your face the whole time. In DaVinci, drop both onto the
timeline and align by a clap or by the exact moment you click BUY.

**Alternative:** OBS supports multiple sources in one recording. Add a
Video Capture Device source for your webcam, position it as a small
inset in the OBS preview. Now your single recording has both. Cleaner
in post-production but trickier to set up the first time.

---

## Voiceover recording (Act 2 narration, recorded after the screen cap)

Record voiceover SEPARATELY from face-cam. The setup is identical to
face-cam audio — closet, blankets, phone or USB lavalier — but you
also need a way to watch the screen-recording back while you talk.

**Easiest:** Open the screen-recording on a laptop, mute it, and watch
it as you record voice on your phone. Speak at the pace your cursor is
moving. Re-record any line that drifts more than half a second.

**Tip:** Speak about 10% slower than feels natural. Anxiety makes you
talk faster on camera — counter-act it.

**Tip:** If a line goes wrong, don't stop and re-roll the whole take.
Pause for 2 seconds, repeat the line, keep going. You'll cut out the
bad take in editing. This avoids the re-recording fatigue spiral where
your voice gets progressively more tired.

---

## Color grading face-cam in DaVinci

Skin on a webcam tends to look cool and slightly green. A 30-second
correction makes it look warm and healthy.

1. Right-click the face-cam clip → Color
2. In the Color page, lift the highlight wheel slightly toward
   yellow-orange (about 1/8th of a turn)
3. Drop the shadow wheel slightly toward blue (about 1/16th of a turn)
4. Bump the saturation by +10
5. Done. Don't over-grade — you want "natural with slightly warmer skin"
   not "Instagram filter".

For the screen recording: NO color grading. Leave it pixel-perfect.
Subjects unconsciously trust UI screenshots that look clinical.

---

## Common mistakes to avoid

| Mistake | Fix |
|---|---|
| Recording in landscape on phone but holding it portrait | Always rotate to landscape. Lock orientation. |
| Face-cam at desk height (you're looking down at the lens) | Raise the camera to eye level. Stack books or use a tripod. |
| Echoey room | Closet + blankets. Re-record. |
| Background is a messy room | Move. A plain wall is always better than clutter. |
| You blink rapidly when reading lines | You're reading. Memorize the beats and improvise instead. |
| Voiceover doesn't match cursor pace | Record voice WHILE watching the screen-recording silently. |
| Music drowns out voice in mid-tempo sections | Sidechain duck. -28 dBFS music under voice, -18 dBFS solo. |
| Caption mangled "lakh" → "lock" | Manual caption pass on YouTube Studio for these specific words. |
| Final video is 3:14 long | Shave the music tail and tighten Act 2 cuts to under 3:00. |

---

## Final equipment shopping list (if you want to upgrade)

In order of marginal return:

1. **Boya BY-M1 lavalier mic** — ₹800-1500 on Amazon India. Plug into your phone. Audio quality jumps from "competent" to "professional." This single item is worth ~3 points on Storytelling.

2. **Cheap LED panel light** — ₹1,200-2,000 ("Godox SL-60", "Neewer 660", etc.) plus a translucent diffuser sheet. Eliminates lighting variability.

3. **Gimbal or phone tripod** — ₹500-1500. Keeps the face-cam framing perfectly steady across multiple takes.

4. **External webcam (Logitech C920)** — ₹4,000-7,000. Only worth it if your laptop's built-in webcam is from 2018 or earlier.

Don't buy anything else. The ₹2,000 spend on items 1 and 2 has the same
marginal return as ₹20,000 on professional gear at this scale.
