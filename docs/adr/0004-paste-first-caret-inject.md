# Paste-first Caret inject

Unicode, RTL, and CJK fail as raw key events. We copy OpenWhispr's paste ladder (save clipboard, paste chord, restore; Linux primary selection; compositor-specific fallbacks) and rewrite it in our tree. Clipboard-only is the fallback when inject is impossible, not the happy path.
