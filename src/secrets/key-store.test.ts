import { expect, test } from "vitest";
import { createKeyStore } from "./key-store";

function createHarness(options?: { encryptionAvailable?: boolean }) {
  const files = new Map<string, Buffer>();
  const safeStorage = {
    available: options?.encryptionAvailable ?? true,
    encrypt(plain: string) {
      return Buffer.from(`safe:${plain}`, "utf8");
    },
    decrypt(encrypted: Buffer) {
      const text = encrypted.toString("utf8");
      return text.startsWith("safe:") ? text.slice(5) : "";
    },
  };

  const store = createKeyStore({
    keyPath: "gemini-key",
    safeStorage: {
      isEncryptionAvailable() {
        return safeStorage.available;
      },
      encryptString(plain) {
        return safeStorage.encrypt(plain);
      },
      decryptString(encrypted) {
        return safeStorage.decrypt(encrypted);
      },
    },
    files: {
      exists(path) {
        return files.has(path);
      },
      read(path) {
        return files.get(path) ?? null;
      },
      write(path, data) {
        files.set(path, data);
      },
    },
    fallback: {
      encrypt(plain) {
        return Buffer.from(`fallback:${plain}`, "utf8");
      },
      decrypt(encrypted) {
        const text = encrypted.toString("utf8");
        return text.startsWith("fallback:") ? text.slice(9) : "";
      },
    },
  });

  return { store, files, safeStorage };
}

test("hasKey is false before a Key is saved", () => {
  const { store } = createHarness();
  expect(store.hasKey()).toBe(false);
});

test("saveKey stores and replaces the Key without plaintext on disk", () => {
  const { store, files } = createHarness();

  store.saveKey("first-key");
  expect(store.hasKey()).toBe(true);
  expect(store.getKey()).toBe("first-key");
  expect(files.get("gemini-key")?.[0]).toBe(1);
  expect(files.get("gemini-key")).not.toEqual(Buffer.from("first-key", "utf8"));

  store.saveKey("second-key");
  expect(store.getKey()).toBe("second-key");
});

test("saveKey rejects an empty Key", () => {
  const { store } = createHarness();
  expect(() => store.saveKey("   ")).toThrow("Key cannot be empty");
});

test("fallback storage works when OS encryption is unavailable", () => {
  const { store, files } = createHarness({ encryptionAvailable: false });

  store.saveKey("linux-key");

  expect(store.getKey()).toBe("linux-key");
  expect(files.get("gemini-key")?.[0]).toBe(2);
  expect(files.get("gemini-key")).not.toEqual(Buffer.from("linux-key", "utf8"));
});
