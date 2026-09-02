# 08: Pipe fail-closed

**What to build:** A user in a banned network can turn on a Pipe in Studio. All Gemini traffic, including DNS, goes through that Pipe. A Test button proves it before Dictation. If the Pipe fails, mSpiky errors. It never falls back to a direct connection.

**Blocked by:** 06 Live Session on Studio mic.

**Status:** resolved

- [x] Settings can enable a Pipe (host, port, user, optional password, remote DNS on by default). Pipe is optional; users on open networks are not blocked by it.
- [x] When Pipe is enabled, every Gemini byte uses it, including DNS. A failed handshake or connection shows an error and does not start or continue a silent direct Session.
- [x] A Test button reports success or failure before the user Dictation.
- [x] Pipe password is stored like the Key (OS secret store / encrypted backup), not in settings.json.
- [ ] Narrow Session adapter test: Pipe enabled plus connection failure does not call a direct transport.
