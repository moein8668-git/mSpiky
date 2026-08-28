# 06: Live Session on Studio mic

**What to build:** Studio mic capture talks to a real Gemini Session. The user sees Drafts and Commits as captions in Studio. Studio never Flushes into another app. Smart formatting is the default. Spoken language is chosen at Session start.

**Blocked by:** 01 Dictation core with fakes; 05 Key in secret store.

**Status:** ready-for-agent

- [ ] With a valid Key, Studio mic start shows live Drafts then Commits from Gemini. Invalid Key or missing mic is a visible error, not an idle caption area.
- [ ] Studio never emits Flush and never Caret injects. Captions stay in Studio.
- [ ] Smart formatting is default; Verbatim is a setting. Language can be picked or detected. Smart/verbatim and language apply at Session start, not mid-Session.
- [ ] Mic picker is available so the user is not stuck on a webcam mic. Capture is headphones-friendly (Overlay/Studio playback is not the job of this Session).
- [ ] Audio is discarded after the Session. Nothing writes mic audio to disk.
- [ ] Session lives in the main process. Narrow Session adapter tests map prototype-shaped Gemini payloads to Draft vs Commit (`interim` / `finished === false` → Draft; `finished !== false` → Commit). Live Gemini is not in default CI.
