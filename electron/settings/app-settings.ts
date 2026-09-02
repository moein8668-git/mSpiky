import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { createAppSettings } from "../../src/settings/app-settings";

export function createElectronAppSettings() {
  const filePath = path.join(app.getPath("userData"), "settings.json");

  return createAppSettings({
    read() {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        return null;
      }
    },
    write(settings) {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    },
  });
}
