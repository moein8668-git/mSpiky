# 01: Dictation core with fakes

**What to build:** Dictation can be driven without Gemini, Overlay chrome, or a real caret. A test starts, Pauses, Resumes, and Stops, and can see Overlay snapshots plus whether Flush fired. Drafts stay Overlay-only. Commits pile up until Pause or Stop. There is no Cancel. Session and Caret inject are faked.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [x] Tests at the Dictation seam send start / pause / resume / stop (and PCM or fake Session events) and read Overlay snapshot, Flush yes/no, Flush text, and errors.
- [x] While fake speech is in progress, Overlay snapshot shows a Draft; when the fake Session confirms, that text becomes a Commit. Drafts never appear in Flush text.
- [x] Flush does not fire while Drafts are still moving. Pause Flushes every Commit gathered since the last Flush, keeps Dictation alive, and keeps the Session. Resume continues the same Dictation.
- [x] Stop Flushes, then ends Dictation (Overlay would hide). A second start while a Dictation is already live Stops that Dictation instead of opening a second one.
- [x] There is no Cancel or discard path.
- [x] From the Vite prototype, keep this Gemini-shaped mapping inside the (fake or real) Session adapter: `interim` or `finished === false` becomes a Draft; `finished !== false` becomes a Commit. Pause and Stop send end-of-audio so the last Commit can arrive before Flush.

## Comments

Implemented at the Dictation seam with a fake Session and fake Caret inject. Overlay `error` is present on the snapshot and stays null in this slice (no error paths until later tickets).

