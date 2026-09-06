import { spawn } from "node:child_process";
import { clipboard } from "electron";
import { createPasteFirstCaretInject } from "../src/caret-inject/paste-first";

const POWERSHELL_TIMEOUT_MS = 1500;

function runCommand(
  command: string,
  args: string[],
  timeoutMs = POWERSHELL_TIMEOUT_MS,
): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(null);
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      finish(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        finish(null);
        return;
      }
      finish(stdout.trim() || null);
    });
  });
}

function runPowerShell(command: string): Promise<string | null> {
  return runCommand("powershell", ["-NoProfile", "-Command", command]);
}

async function foregroundTargetId(): Promise<string> {
  try {
    if (process.platform === "win32") {
      const hwnd = await runPowerShell(
        'Add-Type -MemberDefinition \'[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();\' -Name MspikyWin -Namespace Mspiky; [Mspiky.MspikyWin]::GetForegroundWindow().ToString()',
      );
      return hwnd ?? "unknown";
    }
    if (process.platform === "darwin") {
      const name = await runCommand("osascript", [
        "-e",
        'tell application "System Events" to get name of first application process whose frontmost is true',
      ]);
      return name ?? "unknown";
    }
    const id = await runCommand("xdotool", ["getactivewindow"]);
    return id ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function pasteChord() {
  try {
    if (process.platform === "win32") {
      await runPowerShell(
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")',
      );
      return;
    }
    if (process.platform === "darwin") {
      await runCommand("osascript", [
        "-e",
        'tell application "System Events" to keystroke "v" using command down',
      ]);
      return;
    }
    await runCommand("xdotool", ["key", "ctrl+v"]);
  } catch {
    // Paste failure is handled by paste-first fallback.
  }
}

export function createElectronCaretInject() {
  let lastTarget = "unknown";

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
      async capture() {
        lastTarget = await foregroundTargetId();
        return lastTarget;
      },
      async current() {
        lastTarget = await foregroundTargetId();
        return lastTarget;
      },
    },
    paste: {
      canPaste() {
        return true;
      },
      async paste() {
        await pasteChord();
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
