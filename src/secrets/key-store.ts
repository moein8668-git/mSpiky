export type SafeStoragePort = {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
};

export type FilePort = {
  exists(path: string): boolean;
  read(path: string): Buffer | null;
  write(path: string, data: Buffer): void;
};

export type FallbackCryptoPort = {
  encrypt(plain: string): Buffer;
  decrypt(encrypted: Buffer): string;
};

const SAFE_STORAGE_MARKER = 1;
const FALLBACK_MARKER = 2;

export function createKeyStore(deps: {
  keyPath: string;
  safeStorage: SafeStoragePort;
  files: FilePort;
  fallback?: FallbackCryptoPort;
}) {
  function readKey(): string | null {
    if (!deps.files.exists(deps.keyPath)) return null;
    const blob = deps.files.read(deps.keyPath);
    if (!blob || blob.length < 2) return null;

    const marker = blob[0];
    const payload = blob.subarray(1);
    if (marker === SAFE_STORAGE_MARKER) {
      return deps.safeStorage.decryptString(payload);
    }
    if (marker === FALLBACK_MARKER && deps.fallback) {
      return deps.fallback.decrypt(payload);
    }
    return null;
  }

  return {
    hasKey() {
      const key = readKey();
      return Boolean(key?.trim());
    },
    saveKey(key: string) {
      const trimmed = key.trim();
      if (!trimmed) {
        throw new Error("Key cannot be empty");
      }

      let blob: Buffer;
      if (deps.safeStorage.isEncryptionAvailable()) {
        blob = Buffer.concat([
          Buffer.from([SAFE_STORAGE_MARKER]),
          deps.safeStorage.encryptString(trimmed),
        ]);
      } else if (deps.fallback) {
        blob = Buffer.concat([
          Buffer.from([FALLBACK_MARKER]),
          deps.fallback.encrypt(trimmed),
        ]);
      } else {
        throw new Error("Secret storage is unavailable on this system");
      }

      deps.files.write(deps.keyPath, blob);
    },
    getKey() {
      return readKey();
    },
  };
}
