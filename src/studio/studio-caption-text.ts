export function studioCaptionText(snapshot: {
  commits: string[];
  draft: string;
}) {
  const parts = [...snapshot.commits];
  if (snapshot.draft) parts.push(snapshot.draft);
  return parts.join(" ").trim();
}
