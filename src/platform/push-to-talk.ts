export function pushToTalkSupportedOnLinux(): boolean {
  if (process.platform !== "linux") return true;
  const session = (process.env.XDG_SESSION_TYPE ?? "").toLowerCase();
  const desktop = (process.env.XDG_CURRENT_DESKTOP ?? "").toLowerCase();
  if (session === "wayland" && !desktop.includes("sway")) {
    return false;
  }
  return true;
}

export function pushToTalkUnavailableMessage() {
  return "Push-to-talk is not available on this Linux desktop. Use tap activation instead.";
}
