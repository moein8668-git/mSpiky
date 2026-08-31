# 04: Flush at Pause or Stop

**What to build:** Pause or Stop puts every accumulated Commit into the app that had the caret. Clipboard is restored. If Caret inject cannot run, the text is on the clipboard and Overlay says so. Drafts never Flush. This is the first product demo of “speak, then words appear where I was typing.”

**Blocked by:** 03 Tap hotkey runs Overlay Dictation.

**Status:** resolved

- [x] Pause Flushes Commits gathered since the last Flush, then leaves Overlay and Session up. Stop Flushes, then hides Overlay and ends Dictation. Flush does not run while Drafts are still moving.
- [x] After Flush, the previous clipboard contents are restored. On Linux, primary selection is handled so middle-click paste is not corrupted.
- [x] Caret inject is paste-first (save clipboard, paste, restore). Serialise Flushes. Capture the target window before Overlay work; refuse Flush if the target changed.
- [x] When Caret inject cannot run (missing macOS Accessibility, Wayland, elevated target, undetected password field policy), Overlay still shows Drafts/Commits, Flush copies to the clipboard, and a clear error tells the user to paste by hand. mSpiky does not demand admin on Windows.
- [x] Flush does not inject raw newlines into shells (no accidental command execute). Flush does not treat an empty VS Code caret as a full-line selection.
- [ ] Skip password fields when they can be detected. RTL Commits Flush correctly. Windows happy path includes Notepad, Chrome, VS Code, Telegram, and Word.
- [x] Narrow Caret inject tests (fake OS): paste-first is attempted, clipboard restore is requested, fallback is flagged when paste cannot run, terminal newline policy holds. Tests do not assert real clipboard internals.
