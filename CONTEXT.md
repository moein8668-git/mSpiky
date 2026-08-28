# mSpiky

Desktop dictation: speech becomes text at the caret of another app. Studio is the companion for settings and files, not a second product.

## Language

**mSpiky**:
The desktop dictation product.
_Avoid_: Live Transcribe, OpenWhispr, Booth, the transcribe app

**Overlay**:
The non-activating window shown during Dictation.
_Avoid_: popup, pill, toast, HUD

**Studio**:
The main window for settings, file transcription, and history.
_Avoid_: Control Panel, full app, app form, dashboard

**Dictation**:
Overlay-driven speech that becomes Commits at the caret of the focused app.
_Avoid_: captioning, live transcribe (as the Overlay job)

**Draft**:
The current unconfirmed hypothesis of what was just said. Overlay-only.
_Avoid_: preview, partial, interim

**Commit**:
A confirmed transcript segment, eligible for Caret inject.
_Avoid_: final, lock-in, sentence

**Caret inject**:
Insertion of a Commit at the insertion point of the focused app. Only Overlay Dictation does this.
_Avoid_: typing, paste, SendInput

**Pause**:
Dictation still visible, microphone not sending, Session kept, last Commit allowed to finish.
_Avoid_: mute, stop

**Stop**:
End of this Dictation: Flush, hide Overlay. There is no discard action in v1.
_Avoid_: pause, cancel

**Flush**:
Caret inject of every Commit gathered since the last Flush. Happens at Pause and at Stop, not while Drafts are still moving.
_Avoid_: live typing

**Session**:
One live Gemini conversation that carries audio in and Drafts/Commits out.
_Avoid_: call, stream, connection

**Key**:
The user's own Gemini credential. mSpiky never ships one.
_Avoid_: API key in UI copy if Key will do, .env, localStorage

**Pipe**:
The user-configured tunnel all Gemini traffic uses when enabled. Direct internet is not a Pipe.
_Avoid_: system proxy, VPN
