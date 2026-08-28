# Overlay must not activate

If Overlay takes focus, Caret inject hits mSpiky instead of the user's app. The Overlay stays non-activating. Pause exists both as an Overlay control and as an optional hotkey; a Pause click is allowed only if it does not activate Overlay (OpenWhispr-style `acceptsFirstMouse` / no-activate). If a platform cannot click without stealing focus, Pause hotkey is the fallback on that platform.
