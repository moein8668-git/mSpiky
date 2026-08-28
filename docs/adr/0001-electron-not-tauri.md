# Electron, not Tauri

mSpiky needs a non-activating Overlay, Caret inject into other apps, and global hotkeys on Windows, macOS, and Linux. OpenWhispr already paid for those edge cases in Electron. Tauri would be a smaller binary but would re-fight Konsole, Wayland, VS Code empty-selection, and push-to-talk. We use Electron and rewrite the mechanics; we do not vendor OpenWhispr.
