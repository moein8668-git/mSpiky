# 09: Files, push-to-talk, first-run, installers

**What to build:** The rest of v1 around the working Overlay Dictation: Studio file captions, tap vs push-to-talk and custom hotkeys, first-run (Key, mic, Accessibility, optional Pipe), and installers plus README so users never install Node.

**Blocked by:** 04 Flush at Pause or Stop; 07 Overlay uses live Session; 08 Pipe fail-closed.

**Status:** resolved

- [x] Studio can play a saved voice file and show live captions from the same Session shape. Those captions never Flush. The user can copy or save the transcript. Audio from the file is not kept on disk after the Session.
- [x] Tap is the default activation. Push-to-talk is a setting. Custom Dictation (and Pause) hotkeys can be bound; reserved OS chords are refused. Settings says when this Linux desktop cannot do push-to-talk. Electron global shortcuts alone are not enough for push-to-talk or modifier-only chords.
- [x] First-run asks for a Key, mic permission, and (on macOS) sends the user to Accessibility. Pipe is optional. Launch at login exists and defaults off. Chimes are off by default if they exist.
- [x] Installers exist for Windows, macOS, and Linux (nsis, dmg, AppImage and deb) and publish to GitHub Releases on moein8668-git/mSpiky. README covers unsigned-build warnings (SmartScreen, Gatekeeper), MIT license, and an acknowledgment of OpenWhispr for Overlay, hotkey, and inject prior art. Do not vendor that tree. Signing and auto-update stay out of scope.
