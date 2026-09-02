import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { createStudioHistory } from "../../src/history/studio-history";

export function createElectronStudioHistory() {
  const filePath = path.join(app.getPath("userData"), "history.json");

  return createStudioHistory({
    read() {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const record = item as Record<string, unknown>;
          if (typeof record.id !== "string") return [];
          if (typeof record.text !== "string") return [];
          if (typeof record.createdAt !== "string") return [];
          const mode = record.mode === "verbatim" ? "verbatim" : "smart";
          const source = record.source === "overlay" ? "overlay" : "studio";
          return [{ id: record.id, text: record.text, mode, source, createdAt: record.createdAt }];
        });
      } catch {
        return [];
      }
    },
    write(entries) {
      fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
    },
  });
}
