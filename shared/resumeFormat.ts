import type { Profile } from "./schemas.ts";
import { sectionText } from "./schemas.ts";

/** Resume body sections in reading order (header fields are rendered separately). */
export const RESUME_SECTIONS: [string, keyof Profile][] = [
  ["About me", "summary"],
  ["Career interests", "goals"],
  ["Work experience", "experience"],
  ["Education", "education"],
  ["Courses and certificates", "courses"],
  ["Projects", "projects"],
  ["Skills", "skills"],
  ["Personal qualities", "strengths"],
  ["Languages", "languages"],
  ["Achievements", "achievements"],
];

/** Sections that have content (skipped "-" and empty ones are left out). */
export const filledSections = (profile: Profile) =>
  RESUME_SECTIONS.map(([label, key]) => [label, key, sectionText(profile[key])] as const).filter(
    ([, , text]) => text,
  );

/** "Frontend developer · Almaty, Kazakhstan · anna@mail.kz" */
export function resumeSubtitle(profile: Profile) {
  const place = [profile.city, profile.country]
    .map((v) => sectionText(v))
    .filter(Boolean)
    .join(", ");
  return [sectionText(profile.occupation), place, sectionText(profile.contact)]
    .filter(Boolean)
    .join(" · ");
}

/**
 * A section's text as structured blocks. The composer writes
 * "Header line" + "• bullet" lines, items separated by an empty line.
 */
export type Block = { title?: string; lines: string[]; bullets: string[] };
export function sectionBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      current = null;
      continue;
    }
    current ??= blocks[blocks.push({ lines: [], bullets: [] }) - 1];
    const bullet = line.match(/^[•\-–*]\s*(.+)$/);
    if (bullet) current.bullets.push(bullet[1]);
    else if (!current.title && !current.lines.length && !current.bullets.length) current.title = line;
    else current.lines.push(line);
  }
  // A lone line without bullets is a paragraph, not a heading.
  return blocks.map((b) => (b.title && !b.bullets.length && !b.lines.length ? { lines: [b.title], bullets: [] } : b));
}

export const splitList = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((s) => s.replace(/^[•\-–*]\s*/, "").trim())
    .filter(Boolean);

