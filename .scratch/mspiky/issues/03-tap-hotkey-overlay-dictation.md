# 03: Tap hotkey runs Overlay Dictation

**What to build:** A tap of the default Dictation hotkey shows the Overlay and runs Dictation. Drafts and Commits appear on the Overlay (a fake Session is enough). A second tap Stops. Pause on the Overlay does not steal the caret. Still no live Gemini and still no Caret inject.

**Blocked by:** 01 Dictation core with fakes; 02 Tray and non-activating Overlay.

**Status:** claimed

- [x] Default Dictation chord is Control+Shift+Space. First tap starts Dictation and shows Overlay with status, Draft, accumulated Commits, and a mic level meter.
- [x] Second tap of the same hotkey Stops that Dictation and hides Overlay. Two Overlays never run at once.
- [x] Pause is available on the Overlay. Clicking it (or using an optional Pause hotkey) does not activate Overlay; the caret stays in the other app. If a platform cannot click without activating, Pause hotkey is the fallback there and Settings says so.
- [x] Tray Start Dictation starts the same Overlay Dictation as the hotkey.
- [x] Session may still be faked. Flush / Caret inject is not required yet; Pause and Stop must still go through Dictation so later Flush wiring has a place to hang.

## Comments

Shell toggles Dictation on Control+Shift+Space and tray Start Dictation. Overlay shows Dictation snapshot via IPC. Demo fake Session emits sample Draft/Commit. Linux Studio note for Pause hotkey fallback. Optional Pause hotkey itself is ticket 09.
