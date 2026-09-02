export function overlayText(commits: string[], draft: string) {
  return [commits.join(" "), draft].filter(Boolean).join(" ");
}

export function overlayTextTail(text: string, maxChars = 96) {
  if (text.length <= maxChars) return text;
  return `\u2026${text.slice(-maxChars)}`;
}

export function scrollOverlayTextToLatest(el: {
  clientWidth: number;
  scrollWidth: number;
  scrollLeft: number;
  dir?: string;
}) {
  const overflow = Math.max(0, el.scrollWidth - el.clientWidth);
  el.scrollLeft = overlayTextIsRtl(el) ? -overflow : overflow;
}

function overlayTextIsRtl(el: { dir?: string }) {
  if (el.dir === "rtl") return true;
  if (el.dir === "ltr") return false;
  if (typeof getComputedStyle === "function" && "tagName" in el) {
    return getComputedStyle(el as unknown as Element).direction === "rtl";
  }
  return false;
}
