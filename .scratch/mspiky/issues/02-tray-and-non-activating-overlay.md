# 02: Tray and non-activating Overlay

**What to build:** mSpiky lives in the tray. Studio opens and closes without quitting the app. An Overlay can sit on screen like a caption without stealing the caret from another app. No Gemini and no Flush in this slice.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] After Studio is closed, mSpiky stays in the tray. Quit from the tray actually exits.
- [ ] Tray items include Show Studio, Start Dictation, and Quit. Start Dictation may only show the Overlay until later tickets wire Dictation.
- [ ] Overlay is always on top, off the taskbar, and does not activate: with Overlay visible, the caret stays in another app (for example Notepad) and typing still goes there.
- [ ] Overlay and Studio chrome are English.
- [ ] Overlay does not throttle while it is not the focused window.
- [ ] No Session, no Key prompt, and no Flush in this slice.
