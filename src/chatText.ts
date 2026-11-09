/**
 * The model is asked for plain text but sometimes answers with light Markdown
 * (**bold**, "### heading", "- item"). Turn it into safe segments for React:
 * bold becomes <strong>, other markers are removed. No HTML is ever produced.
 */
export type ChatSegment = { text: string; bold: boolean };

export function chatSegments(text: string): ChatSegment[] {
  const cleaned = text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "") // headings
        .replace(/^(\s*)[-*]\s+/, "$1• "), // bullet markers
    )
    .join("\n");
  const segments: ChatSegment[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/gs;
  let last = 0;
  for (const match of cleaned.matchAll(pattern)) {
    if (match.index > last) segments.push({ text: cleaned.slice(last, match.index), bold: false });
    segments.push({ text: match[1] ?? match[2], bold: true });
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) segments.push({ text: cleaned.slice(last), bold: false });
  // Unpaired markers (e.g. mid-stream) are hidden rather than shown as "**".
  return segments
    .map((s) => (s.bold ? s : { ...s, text: s.text.replace(/\*\*|__/g, "") }))
    .filter((s) => s.text);
}
