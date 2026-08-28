# Pipe never falls back to direct

When Pipe is enabled, every Gemini byte goes through it, including DNS. A failed handshake must error. Silent direct would leak in a banned network, which is the reason Pipe exists.
