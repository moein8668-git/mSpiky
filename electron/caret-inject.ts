import { clipboard } from "electron";
import { execSync } from "node:child_process";
import { createPasteFirstCaretInject } from "../src/caret-inject/paste-first";

function foregroundTargetId(): string {
  if (process.platform === "win32") {
    return execSync(
      'powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.UTF8Encoding]::UTF8; Add-Type @\'\\nusing System;\\nusing System.Runtime.InteropServices;\\npublic class MspikyWin {\\n  [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow();\\n}\\n\'@; [MspikyWin]::GetForegroundWindow().ToString()"',
      { encoding: "utf8" },
    ).trim();
  }
  if (process.platform === "darwin") {
    return execSync(
      'osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"',
      { encoding: "utf8" },
    ).trim();
  }
  try {
    return execSync("xdotool getactivewindow", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function pasteChord() {
  if (process.platform === "win32") {
    execSync(
      'powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^v\\")"',
      { stdio: "ignore" },
    );
    return;
  }
  if (process.platform === "darwin") {
    execSync(
      'osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"',
      { stdio: "ignore" },
    );
    return;
  }
  execSync("xdotool key ctrl+v", { stdio: "ignore" });
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
