# 02: Tray and non-activating Overlay

**What to build:** mSpiky lives in the tray. Studio opens and closes without quitting the app. An Overlay can sit on screen like a caption without stealing the caret from another app. No Gemini and no Flush in this slice.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [x] After Studio is closed, mSpiky stays in the tray. Quit from the tray actually exits.
- [x] Tray items include Show Studio, Start Dictation, and Quit. Start Dictation may only show the Overlay until later tickets wire Dictation.
- [x] Overlay is always on top, off the taskbar, and does not activate: with Overlay visible, the caret stays in another app (for example Notepad) and typing still goes there.
- [x] Overlay and Studio chrome are English.
- [x] Overlay does not throttle while it is not the focused window.
- [x] No Session, no Key prompt, and no Flush in this slice.

## Comments

Electron tray + Studio + Overlay. Start Dictation only shows Overlay (Dictation not wired yet). Overlay uses `focusable: false`, `showInactive()`, and `backgroundThrottling: false`. Caret-stay is flags, not a unit test (spec: do not assert Electron window flags).

