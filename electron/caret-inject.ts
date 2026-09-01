import { clipboard } from "electron";
import { spawnSync } from "node:child_process";
import { createPasteFirstCaretInject } from "../src/caret-inject/paste-first";

function runPowerShell(command: string): string | null {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", command],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || result.error) return null;
  return result.stdout.trim() || null;
}

function foregroundTargetId(): string {
  try {
    if (process.platform === "win32") {
      const hwnd = runPowerShell(
        'Add-Type -MemberDefinition \'[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();\' -Name MspikyWin -Namespace Mspiky; [Mspiky.MspikyWin]::GetForegroundWindow().ToString()',
      );
      return hwnd ?? "unknown";
    }
    if (process.platform === "darwin") {
      const result = spawnSync(
        "osascript",
        [
          "-e",
          'tell application "System Events" to get name of first application process whose frontmost is true',
        ],
        { encoding: "utf8" },
      );
      if (result.status === 0 && result.stdout) return result.stdout.trim();
      return "unknown";
    }
    const result = spawnSync("xdotool", ["getactivewindow"], {
      encoding: "utf8",
    });
    if (result.status === 0 && result.stdout) return result.stdout.trim();
    return "unknown";
  } catch {
    return "unknown";
  }
}

function pasteChord() {
  try {
    if (process.platform === "win32") {
      runPowerShell(
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")',
      );
      return;
    }
    if (process.platform === "darwin") {
      spawnSync(
        "osascript",
        [
          "-e",
          'tell application "System Events" to keystroke "v" using command down',
        ],
        { stdio: "ignore" },
      );
      return;
    }
    spawnSync("xdotool", ["key", "ctrl+v"], { stdio: "ignore" });
  } catch {
    // Paste failure is handled by paste-first fallback.
  }
}

function canPasteAtCaret(): boolean {
  return true;
}

export function createElectronCaretInject() {
  return createPasteFirstCaretInject({
    clipboard: {
      read() {
        return clipboard.readText();
      },
      write(text) {
        clipboard.writeText(text);
      },
      restore(text) {
        clipboard.writeText(text);
      },
    },
    primarySelection: {
      read() {
        return "";
      },
      write() {},
      restore() {},
    },
    target: {
      capture() {
        return foregroundTargetId();
      },
      current() {
        return foregroundTargetId();
      },
    },
    paste: {
      canPaste() {
        return canPasteAtCaret();
      },
      paste() {
        pasteChord();
      },
    },
    context: {
      isPasswordField() {
        return false;
      },
      isTerminal() {
        return false;
      },
    },
  });
}
