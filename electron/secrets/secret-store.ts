import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";
import { createKeyStore } from "../../src/secrets/key-store";
import { createFallbackCrypto } from "./fallback-crypto";

export function createElectronSecretStore(secretName: string) {
  const userDataPath = app.getPath("userData");
  const keyPath = path.join(userDataPath, "secrets", `${secretName}.bin`);
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });

  return createKeyStore({
    keyPath,
    safeStorage: {
      isEncryptionAvailable() {
        return safeStorage.isEncryptionAvailable();
      },
      encryptString(plain: string) {
        return safeStorage.encryptString(plain);
      },
      decryptString(encrypted: Buffer) {
        return safeStorage.decryptString(encrypted);
      },
    },
    files: {
      exists(filePath: string) {
        return fs.existsSync(filePath);
      },
      read(filePath: string) {
        return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
      },
      write(filePath: string, data: Buffer) {
        fs.writeFileSync(filePath, data);
      },
    },
    fallback: createFallbackCrypto(userDataPath),
  });
}
