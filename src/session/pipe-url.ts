import type { PipeSettings } from "../settings/app-settings";

export function buildSocksProxyUrl(
  pipe: Pick<PipeSettings, "host" | "port" | "user">,
  password: string | null,
) {
  const host = pipe.host.trim();
  const port = pipe.port;
  if (!host || !port) {
    throw new Error("Pipe host and port are required.");
  }
  const auth =
    pipe.user.trim() && password
      ? `${encodeURIComponent(pipe.user.trim())}:${encodeURIComponent(password)}@`
      : pipe.user.trim()
        ? `${encodeURIComponent(pipe.user.trim())}@`
        : "";
  return `socks5://${auth}${host}:${port}`;
}
