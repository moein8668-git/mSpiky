**Status:** ready-for-agent

# mSpiky v1

## Problem Statement

People who type all day want to speak instead, in any app, without paying for Wispr Flow. Users in places where Google is blocked still need that, using their own Gemini Key through a Pipe. A browser page cannot register a system hotkey or put text at the caret.

## Solution

mSpiky sits in the tray. A tap hotkey starts Dictation. An Overlay shows Drafts while the user speaks. Pause or Stop Flushes every Commit into the app that had the caret. Studio holds the Key, Pipe, language, mic, and file transcription. Audio is never stored. The UI is English. Spoken language is a setting.

## User Stories

1. As a writer, I want to press a hotkey and speak, so that words appear where I was already typing.
2. As a writer, I want Drafts on the Overlay while I talk, so that I can see mSpiky heard me before anything is inserted.
3. As a writer, I want Pause to Flush what I have said so far without ending Dictation, so that I can keep the Session and continue.
4. As a writer, I want Resume after Pause, so that later Commits join the same Dictation until the next Flush.
5. As a writer, I want Stop to Flush and hide the Overlay, so that I am done in one gesture.
6. As a writer, I want a second tap of the Dictation hotkey to Stop, so that I do not hunt for a button.
7. As a writer, I want Pause on the Overlay without the Overlay taking focus, so that the caret stays in my document.
8. As a writer, I want an optional Pause hotkey, so that I can Pause without moving the mouse.
9. As a writer, I do not want a Cancel that throws away speech, so that Stop is the only way out and I am not confused.
10. As a writer, I want push-to-talk as an option, so that hold-to-talk matches how I use other dictation tools.
11. As a Linux user whose desktop cannot do push-to-talk, I want Settings to say so, so that I do not think mSpiky is broken.
12. As a writer, I want to change the Dictation hotkey, so that it does not collide with my editor.
13. As a writer, I want mSpiky to refuse reserved OS chords, so that I do not bind a hotkey the system swallows.
14. As a writer, I want a default chord of Control+Shift+Space, so that I can Dictation on first run without designing a shortcut.
15. As a writer, I want Smart formatting by default, so that fillers are cleaned without extra settings.
16. As a writer, I want Verbatim as a setting, so that I can keep ums when I need them.
17. As a writer, I want to pick or detect spoken language, so that Persian, English, and other Gemini languages work.
18. As a writer, I want RTL Commits to Flush correctly, so that Persian and Arabic are usable.
19. As a new user, I want first-run to ask for a Key, so that I never think mSpiky ships Google access.
20. As a new user, I want Dictation to refuse to start without a Key, so that I get a clear error instead of silence.
21. As a new user, I want the Key stored in the OS secret store, so that it is not a plain file.
22. As a Linux user without a keyring, I want a platform backup for the Key, so that Settings still works.
23. As a user in a banned country, I want to turn on a Pipe, so that Gemini traffic does not go direct.
24. As that user, I want remote DNS through the Pipe by default, so that lookups do not leak.
25. As that user, I want a Test button, so that I know the Pipe works before I Dictation.
26. As that user, I want a failed Pipe to error, not fall back to direct, so that I am not exposed.
27. As that user, I want the Pipe password stored like the Key, so that it is not in settings.json.
28. As a writer, I want mSpiky in the tray after I close Studio, so that Dictation still works.
29. As a writer, I want tray items for Show Studio, Start Dictation, and Quit, so that I can drive the product without a window.
30. As a writer, I want optional launch at login, default off, so that mSpiky is there when I start work if I choose.
31. As a writer, I want a mic picker, so that I am not stuck on a webcam mic.
32. As a writer, I want a level meter on the Overlay, so that I know the mic is live.
33. As a writer, I want headphones-friendly capture, so that Overlay playback is not the job of Dictation.
34. As a writer, I want Session reconnect when Gemini drops after several minutes, so that a long sitting does not die silently.
35. As a writer, I want a short Overlay note after reconnect, so that I know why a phrase split.
36. As a macOS user, I want first-run to send me to Accessibility settings, so that Flush can paste.
37. As a macOS user without Accessibility, I want Overlay Drafts still, so that I can copy by hand if Flush cannot run.
38. As a macOS user without Accessibility, I want a clear error that Flush copied to the clipboard, so that I can paste myself.
39. As a Linux Wayland user, I want clipboard fallback when Caret inject cannot run, so that I still get the text.
40. As a Windows user, I want Flush in Notepad, Chrome, VS Code, Telegram, and Word, so that daily apps work.
41. As a Windows user in an elevated app, I want mSpiky not to demand admin, so that I am not forced to elevate.
42. As a developer using a terminal, I want Flush not to execute raw newlines as commands, so that a Commit cannot run a shell.
43. As a developer in VS Code, I want Flush not to treat an empty caret as a full-line selection, so that my current line is not overwritten.
44. As a writer, I want the clipboard restored after Flush, so that I do not lose what I had copied.
45. As a Linux user, I want the primary selection handled across Flush, so that middle-click paste is not corrupted.
46. As a writer, I want Flush to skip password fields when they can be detected, so that secrets are not dictated into a password box.
47. As a writer, I want Studio file transcription with live captions, so that a saved voice file becomes text as it plays.
48. As a writer, I want Studio captions never Flush into another app, so that Overlay stays the only Dictation surface.
49. As a writer, I want to copy or save a Studio transcript, so that I can keep file text without audio.
50. As a writer, I want history off or text-only if added later, so that no recording sits on disk.
51. As a writer, I do not want spoken commands in v1, so that Flush stays one-shot and simple.
52. As an English-speaking user, I want Studio and Overlay chrome in English, so that settings are unambiguous.
53. As a first-run user, I want mic permission asked before Dictation, so that the OS prompt is expected.
54. As a first-run user, I want Pipe to be optional, so that people on open networks are not blocked.
55. As a writer, I want an error on the Overlay when the Key is invalid, so that I can fix Settings.
56. As a writer, I want an error when the mic is missing, so that I am not staring at an idle Overlay.
57. As a writer, I want Dictation to no-op if a Session is already live, or to Stop the current one on a second tap, so that two Overlays never fight.
58. As a writer, I want smart/verbatim and language applied at Session start, so that changing them mid-Dictation waits until the next start.
59. As a packager, I want installers for Windows, macOS, and Linux, so that users never install Node.
60. As a packager, I want GitHub Releases on moein8668-git/mSpiky, so that downloads have one home.
61. As a user of an unsigned build, I want README steps for SmartScreen and Gatekeeper, so that I can still open mSpiky.
62. As an open-source user, I want MIT and an OpenWhispr acknowledgment, so that reuse is honest.
63. As a writer, I want Overlay always on top and off the taskbar, so that it feels like a caption, not another app.
64. As a writer, I want Overlay not to throttle in the background, so that Drafts stay smooth.
65. As a writer, I want chimes off by default if they exist, so that meetings are not interrupted.
66. As an agent implementing this, I want tests at the Dictation seam, so that OS paste and Gemini are faked.

## Implementation Decisions

- Desktop shell is Electron. Renderer is React for Overlay and Studio. Native work stays in the main process.
- One Dictation module is the product brain: commands (start, pause, resume, stop, pcm) in; Overlay snapshot (status, Draft, accumulated Commits, errors, meter) and Flush events out. Session and Caret inject are adapters behind it.
- Session adapter talks to Gemini Live using the user's Key. When Pipe is on, that adapter's network is only the Pipe, including DNS.
- From the Vite prototype, Gemini events map as: `interim` or `finished === false` becomes a Draft; `finished !== false` becomes a Commit. Pause and Stop send end-of-audio so the last Commit can arrive before Flush.
- Dictation does not Flush while Drafts are still moving. Pause Flushes then keeps the Session. Stop Flushes then ends Dictation and hides Overlay. Resume after Pause starts sending audio again on the same Session when possible.
- Tap is the default activation. Push-to-talk is a setting. Default Dictation chord is Control+Shift+Space. Electron global shortcuts are not enough for push-to-talk or modifier-only chords; those use native listeners. Some Linux desktops cannot do push-to-talk; Settings must say so.
- Overlay is created non-activating, skip-taskbar, always-on-top, with compositor-specific window types on Linux. Pause may be clicked only if that click does not activate Overlay. If a platform cannot do that, Pause hotkey is the fallback there.
- Caret inject uses a paste-first ladder (clipboard save, paste chord, restore; Linux primary selection; macOS Accessibility; Windows sendinput-style helper; Linux Shift+Insert for terminals, Electron apps, Konsole, unclassified Wayland). Serialise Flushes. Capture target window before Overlay work; refuse Flush if the target changed. Do not inject raw newlines into shells. Clipboard-only fallback when inject is impossible.
- Studio never emits Flush. File playback sends PCM into the same Session shape for captions only.
- Key and Pipe password live in the OS secret store, with platform encrypted backup when the keyring is missing. Other settings live in user config: hotkeys, tap vs push, language, smart vs verbatim, Pipe host/port/user/enabled/remote DNS, mic id, launch at login, Overlay position.
- Changing smart/verbatim or language takes effect on the next Session, not mid-Dictation.
- Renderer never holds the Key. No disabled web security on Studio for cloud calls.
- Audio is discarded after the Session. History, if built later, is text only.
- License is MIT. README credits OpenWhispr for Overlay, hotkey, and inject prior art. Do not vendor that tree.
- Install with electron-builder: Windows nsis, macOS dmg, Linux AppImage and deb. CI publishes to GitHub Releases. Signing is later; document OS warnings.
- v1 UI chrome is English. Spoken language remains a setting.

## Testing Decisions

A good test asserts what a user would notice: Overlay snapshot, whether Flush fired, Flush text, errors, and refusals (no Key, Pipe fail-closed, Studio never Flushes). Tests do not assert Electron window flags, clipboard internals, or Gemini JSON field names except inside the Session adapter.

**Primary seam: Dictation.** Tests drive start/pause/resume/stop and PCM (or fake Session events) and read Overlay state plus Flush. Fake the Session adapter and the Caret inject adapter.

Session adapter tests (narrow): map prototype-shaped Gemini payloads to Draft vs Commit; Pipe enabled plus connection failure does not call a direct transport.

Caret inject adapter tests (narrow): given Flush text and a fake OS, paste-first is attempted; clipboard restore is requested; fallback flagged when paste cannot run; terminal newline policy.

Prior art: the current Node prototype maps Live messages to interim vs final and has no Overlay tests. New tests live next to Dictation, not in the UI tree. Live Gemini is not in default CI; an optional conformance run may use a real Key.

## Out of Scope

Meetings, notes, agents, local Whisper or Parakeet, live translation, spoken edit commands, Cancel/discard, Studio Flush, storing audio, auto-update, code signing, notarization, browser extension, Wayland-native inject beyond clipboard fallback, GPL, Tauri, a hosted Key, silent direct network when Pipe is on.

## Further Notes

Code remote is moein8668-git/mSpiky. Agent tickets stay under `.scratch/mspiky/`. Glossary is root CONTEXT.md. ADRs 0001–0010 are in force, especially Flush at Pause or Stop (0007) and Studio never Caret injects (0010).

Next step is `/to-tickets`: vertical slices that each demo through Dictation, with Session and Caret inject faked until those adapters land.
