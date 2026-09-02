import { expect, test } from "vitest";
import { buildSocksProxyUrl } from "./pipe-url";

test("buildSocksProxyUrl includes credentials when provided", () => {
  expect(
    buildSocksProxyUrl(
      { host: "127.0.0.1", port: 1080, user: "me" },
      "secret",
    ),
  ).toBe("socks5://me:secret@127.0.0.1:1080");
});
