import type { Profile } from "./schemas.ts";

/** Resume body sections in reading order (header fields are rendered separately). */
export const RESUME_SECTIONS: [string, keyof Profile][] = [
  ["About me", "summary"],
  ["Career interests", "goals"],
  ["Work experience", "experience"],
  ["Education", "education"],
  ["Skills", "skills"],
  ["Projects", "projects"],
];

/** "Frontend developer · Almaty, Kazakhstan · anna@mail.kz" */
export function resumeSubtitle(profile: Profile) {
  const place = [profile.city, profile.country]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(", ");
  return [profile.occupation.trim(), place, profile.contact.trim()]
    .filter(Boolean)
    .join(" · ");
}
