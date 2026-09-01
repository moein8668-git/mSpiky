import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import type { FallbackCryptoPort } from "../../src/secrets/key-store";

export function createFallbackCrypto(userDataPath: string): FallbackCryptoPort {
  const key = scryptSync(userDataPath, "mspiky-key-fallback", 32);

  return {
    encrypt(plain) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([
        cipher.update(plain, "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, encrypted]);
    },
    decrypt(blob) {
      const iv = blob.subarray(0, 12);
      const tag = blob.subarray(12, 28);
      const encrypted = blob.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}
