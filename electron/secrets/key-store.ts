import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { createKeyStore } from "../../src/secrets/key-store";
import { createFallbackCrypto } from "./fallback-crypto";

export function createElectronKeyStore() {
  const userDataPath = app.getPath("userData");
  const keyPath = path.join(userDataPath, "secrets", "gemini-key.bin");
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });

  return createKeyStore({
    keyPath,
    safeStorage: {
      isEncryptionAvailable() {
        return safeStorage.isEncryptionAvailable();
      },
      encryptString(plain) {
        return safeStorage.encryptString(plain);
      },
      decryptString(encrypted) {
        return safeStorage.decryptString(encrypted);
      },
    },
    files: {
      exists(filePath) {
        return fs.existsSync(filePath);
      },
      read(filePath) {
        return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
      },
      write(filePath, data) {
        fs.writeFileSync(filePath, data);
      },
    },
    fallback: createFallbackCrypto(userDataPath),
  });
}
