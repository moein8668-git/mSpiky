# 05: Key in secret store

**What to build:** Studio Settings is where the user puts their Gemini Key. The Key is stored in the OS secret store, not a plain file. Dictation refuses to start without a Key and says so. The renderer never holds the Key.

**Blocked by:** 02 Tray and non-activating Overlay.

**Status:** resolved

- [x] Studio Settings can save and replace a Key. The Key is not written to user config as plaintext. On Linux without a keyring, a platform encrypted backup still works.
- [x] Starting Dictation without a stored Key is a no-op on the Session and shows a clear error (Studio or Overlay, whichever is in front). The user is not left with a silent Overlay.
- [x] Renderer never reads or caches the Key. Studio does not disable web security to reach Gemini.
- [x] mSpiky never ships a Key. UI copy talks about the user's Key, not a bundled credential.
