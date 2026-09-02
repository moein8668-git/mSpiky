import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { OverlayPoint } from "../../src/settings/overlay-position";

export function createElectronOverlayPositionStore() {
  const filePath = path.join(app.getPath("userData"), "overlay-position.json");

  return {
    get(): OverlayPoint | null {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<OverlayPoint>;
        if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
        return { x: parsed.x, y: parsed.y };
      } catch {
        return null;
      }
    },
    save(position: OverlayPoint) {
      fs.writeFileSync(filePath, JSON.stringify(position));
    },
  };
}
