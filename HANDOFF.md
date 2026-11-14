# Handoff: Benefeed Night Shift (for the next Claude session)

**Owner:** Arushi (solo). Do Not Disturb Hackathon × PhoneUse, San Francisco, Nov 13 2026, finals at 6:00 PM.
**Repo:** https://github.com/arushiSH5-cyber/benefeed-nightshift (public). **Live app:** https://arushish5-cyber.github.io/benefeed-nightshift/?demo
**Local folder:** `~/Downloads/benefeed-nightshift`. `design/` holds the mockup: git-ignored, never push it.

## Rules the user set
- **No Claude co-author lines** in commits or PRs. Plain commit messages, authored by Arushi. Normal commits only; no history rewrites.
- Keys live only in `.env` (git-ignored): ANTHROPIC, TAVILY, PHONEUSE_API_KEY, VAPID x2, RUNNER_SECRET, OWNER_TOKEN, PHONEUSE_MODE=hosted. Never print them or paste them in chat. To add one, read it from the clipboard with `pbpaste` straight into `.env`.
- She's very short on usage: be brief, do only important work, and verify in the browser before you say "done".

## What exists (all pushed)
- `web/`: React + Vite PWA ported from the mockup. Features: onboarding quiz, TikTok feed, swipe yes/no cards, countries US/FR/UK with Federal/State/Local badges, EN⇄FR switch (`src/i18n.ts`, text-node translation + 400 ms re-walk), Crew live view with a 3D-tilted phone, sunrise + push banner, Review filmstrip + hold-to-approve, replay mode, `?demo` (resets to the quiz) and `?demo&fr`.
- `server/`: FastAPI + SQLite. Public API, runner API (`X-Runner-Secret`), `/practice` portal (4 screens, NOT A REAL AGENCY), `/practice/evil` injection page, Web Push, Tavily (`extras.py`), ElevenLabs TTS (`voice.py`). Anyone can watch a run; only `OWNER_TOKEN` can start or approve one.
- `runner/`: the LangGraph crew (`crew.py`): fern_check → plan → phone_tasks → await_yes (`interrupt()`) ⇄ do_final → finish. Guard: `safety.py check_final()`. Phone drivers behind one interface:
  - `hosted.py`: PhoneUse cloud phone over MCP (`https://mcp.phoneuse.com/mcp`, Bearer key). Tools: list_devices, acquire_device, ui_snapshot, tap, type_text, open_app, press_key, screenshot. Grid is 0–1000. **Untested on a device: her account still lists 0 phones (Pixel 7 Pro stuck at "Delivery needs attention" on PhoneUse's side).**
  - `browserphone.py`: Playwright 390x844 "phone". **Tested end to end:** fills the portal in about 11 steps, 🔒 stops at Submit, then submits after approval and stores the application. `BROWSER_VIDEO=<dir>` records the run.
  - `phoneuse.py`: PhoneUse Local (USB iPhone + Xcode). Unused; she removed Xcode.
- Decisions are JSON validated by pydantic (Sonnet 5.5 rejects forced tool_choice). Model: `CREW_MODEL` (default claude-sonnet-5-5).
- `demo.sh [browser|hosted]`: builds the web app, starts the server and runner, opens a cloudflared tunnel and prints the public + owner links. She must run it herself; a tunnel started by Claude was blocked by the safety check.
- `tests/`: 25 passing (`uv run pytest -q`).
- `docs/`: screenshots, demo GIFs, demo-en/fr.mp4, live-automation.mp4 (real run), the explainer video(s), qr.png.

## Deploying the PWA (GitHub Pages, gh-pages branch)
```bash
cd web && BASE=/benefeed-nightshift/ npm run build && cd dist && cp index.html 404.html && touch .nojekyll \
 && git init -q -b gh-pages && git add -A && git commit -qm "Deploy PWA" \
 && git push -qf git@github.com:arushiSH5-cyber/benefeed-nightshift.git gh-pages; rm -rf .git
```
Then rebuild `npm run build` (base `/`) for the local server. Pages caches for about 10 minutes: hard reload with ⌘⇧R.

## Known gaps / next steps
1. When `list_devices` returns her Pixel: run `./demo.sh hosted` and fix Android specifics in `hosted.py` (Chrome address bar search, `_flat()` parsing of the ui_snapshot format).
2. Live mode runs only task A (CalFresh). Calendar and Messages tasks have no browser-phone equivalent; they show in the replay only.
3. A few strings stay English in FR mode (the banner text split across nodes, the mock phone form labels).
4. Optional keys not set: ElevenLabs (the voice falls back to the device voice), LangSmith.

## 🔴 IN PROGRESS (Nov 13, ~4:40 PM): live run on the friend's PhoneUse cloud Pixel
- `.env` PHONEUSE_API_KEY = the **friend's** key (her own key is saved as PHONEUSE_API_KEY_MINE). His device: `APP6968R8KWDFK0D` (Pixel 7 Pro, Android 13, backend `adb_cloud`). Lease/screenshot/release tested OK.
- **This backend has NO ui_snapshot** (uiTree:false). Capabilities: tap, swipe, type_text, press_key (enter/back/home…), open_app (intent), screenshot. Grid 0–1000.
- DONE: `runner/ocr.py` (Apple Vision OCR → labels + boxes in the 0–1000 grid). Tested: reads "Chrome" etc. from the Pixel screenshot.
- TODO, in order:
  1. In `runner/hosted.py`: `source_fast`/`find_elements`/`element_click`/`element_fill` must use `ocr.read(self.screenshot(dev))` instead of `ui_snapshot`. Fill = tap the label box (or the field below it), sleep 0.4, `type_text`. `open_url` = open_app Chrome → tap the address bar (OCR "Search or type" / the URL bar near the top) → type_text url → press_key enter. The guard keeps working: labels come from OCR pixels, and `_check_tap_point` uses OCR rects (`window_size` = 1000x1000).
  2. The cloud phone can't reach localhost, so put a **static practice portal on GitHub Pages**: `web/public/practice/` (index → income → contact → review with Submit below the fold + confirm → done), values passed in the query string, banner "PRACTICE PORTAL · NOT A REAL AGENCY". Prefer radio buttons over `<select>` (easier on Android). The SW already denylists `/practice`. Then set env `PORTAL_URL=https://arushish5-cyber.github.io/benefeed-nightshift` and make `Phone(...)` in `runner/main.py` use `os.environ.get("PORTAL_URL", SERVER)` as the portal base (crew goal uses `{portal}/practice`).
  3. Test: `CREW_TASKS=calfresh ./demo.sh hosted` (or run server + `PHONEUSE_MODE=hosted uv run python -m runner.main`), POST /api/runs, watch for "Hard stop", approve via /api/runs/<id>/approve.
- Demo script for judges is in the chat: friend's PhoneUse console shows the phone live; her phone (owner link) approves.
