import type { PipeSettings } from "../settings/app-settings";

export function buildSocksProxyUrl(
  pipe: Pick<PipeSettings, "host" | "port" | "user" | "remoteDns">,
  password: string | null,
) {
  const host = pipe.host.trim();
  const port = pipe.port;
  if (!host || !port) {
    throw new Error("Pipe host and port are required.");
  }
  const scheme = pipe.remoteDns !== false ? "socks5h" : "socks5";
  const auth =
    pipe.user.trim() && password
      ? `${encodeURIComponent(pipe.user.trim())}:${encodeURIComponent(password)}@`
      : pipe.user.trim()
        ? `${encodeURIComponent(pipe.user.trim())}@`
        : "";
  return `${scheme}://${auth}${host}:${port}`;
}
