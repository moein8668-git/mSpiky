import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import {
  createSessionSettings,
  type SessionSettings,
} from "../../src/settings/session-settings";

export function createElectronSessionSettings() {
  const filePath = path.join(app.getPath("userData"), "settings.json");

  return createSessionSettings({
    read() {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<SessionSettings>;
        return {
          micId: typeof parsed.micId === "string" ? parsed.micId : "",
          mode: parsed.mode === "verbatim" ? "verbatim" : "smart",
        };
      } catch {
        return null;
      }
    },
    write(settings) {
      fs.writeFileSync(filePath, JSON.stringify(settings));
    },
  });
}
