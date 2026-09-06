import { expect, test } from "vitest";
import { buildSocksProxyUrl } from "./pipe-url";

test("buildSocksProxyUrl includes credentials when provided", () => {
  expect(
    buildSocksProxyUrl(
      { host: "127.0.0.1", port: 1080, user: "me", remoteDns: true },
      "secret",
    ),
  ).toBe("socks5h://me:secret@127.0.0.1:1080");
});

test("buildSocksProxyUrl uses socks5 when remote DNS is off", () => {
  expect(
    buildSocksProxyUrl(
      { host: "127.0.0.1", port: 3067, user: "", remoteDns: false },
      null,
    ),
  ).toBe("socks5://127.0.0.1:3067");
});
