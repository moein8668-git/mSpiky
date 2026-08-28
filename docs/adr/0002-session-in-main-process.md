# Session lives in the main process

The Key and Pipe must not sit in the renderer. OpenWhispr's Control Panel disables web security so the UI can call cloud APIs directly; we reject that. Gemini Live traffic goes through a Session in Electron main, behind a testable port.
