# 07: Overlay uses live Session

**What to build:** Overlay Dictation is real speech. The same Session that Studio already proved now feeds Overlay Drafts and Commits. If Gemini drops, Session reconnects and Overlay shows a short note. Bad Key or missing mic errors on the Overlay. Flush behaviour from ticket 04 still applies.

**Blocked by:** 03 Tap hotkey runs Overlay Dictation; 05 Key in secret store; 06 Live Session on Studio mic.

**Status:** ready-for-agent

- [ ] Hotkey (or tray Start Dictation) opens Overlay, captures the chosen mic, and shows live Drafts/Commits from Gemini. Pause and Stop still Flush through the existing Caret inject path.
- [ ] If Session drops after several minutes, it reconnects instead of dying silently. Overlay shows a short note so a split phrase is explained.
- [ ] Invalid Key and missing mic produce Overlay errors. Dictation still refuses to start without a Key.
- [ ] Two Overlays never fight: a Session already live means a second start Stops (tap) rather than stacking.
- [ ] Audio is still never stored. Renderer still never holds the Key.
