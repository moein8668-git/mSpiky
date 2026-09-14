# mSpiky

Desktop dictation for Windows, macOS, and Linux. Press a hotkey, speak, and mSpiky Flushes text into whatever app already has the caret. You bring your own Gemini Key from [Google AI Studio](https://aistudio.google.com/apikey).

Studio handles settings, optional file transcription with live captions, and text-only history. The Overlay stays on top, does not steal focus, and never stores audio.

## Download

Prebuilt installers are published on [GitHub Releases](https://github.com/moein8668-git/mSpiky/releases) for:

- Windows (`.msi` and NSIS `.exe`)
- macOS Apple Silicon (`.dmg` and `.zip`)
- Linux (AppImage and `.deb`)

Current series: **v0.1.x** (not 1.0). Latest installer tag: **v0.1.1**.

You do not need Node.js to run mSpiky.

### Unsigned builds

These releases are not code-signed yet.

- **Windows:** SmartScreen may warn on first launch. Choose **More info → Run anyway** if you trust the download.
- **macOS:** Gatekeeper may block the app. Open **System Settings → Privacy & Security** and allow mSpiky, or right-click the app and choose **Open**.

## First run

1. Paste your Gemini Key in Studio.
2. Allow microphone access when prompted.
3. On macOS, enable **Accessibility** so Flush can paste into other apps.
4. Optional: configure a SOCKS5 **Pipe** if direct Gemini access is blocked on your network.

Default Dictation hotkey: **Control+Shift+Space** (tap to start/stop). Push-to-talk is available where the native key listener is supported; some Linux desktops show a notice in Settings instead.

## Build from source (developers)

```bash
npm install
npm run dev:desktop
```

Package installers locally:

```bash
npm run dist
```

Artifacts land in `release/`.

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Overlay window behavior, global hotkey handling, and caret-inject patterns are informed by [OpenWhispr](https://github.com/OpenWhispr/openwhispr) (MIT). That project is not vendored here; mSpiky reimplements the ideas in this tree.
