import type { Job, Match, Message, Profile } from "../../shared/schemas.ts";
import { PROFILE_FIELDS, type ProfileField } from "../../shared/schemas.ts";
import { translate } from "../../shared/i18n.ts";
import { resolveLocation, countryName } from "../../shared/geo.ts";

/**
 * Deterministic, transparent fallbacks used when the AI provider is missing,
 * over quota or failing. They never invent facts: they only reuse what the
 * student typed and what the job listing states, and every result is flagged
 * as `fallback` so the UI can say so.
 */
export { PROFILE_FIELDS };
type Field = ProfileField;

const question = (language: string, field: Field) =>
  translate(language, `fallback.ask.${field}`);
const firstMissing = (profile: Profile) =>
  PROFILE_FIELDS.find((field) => !profile[field].trim());

/** Which field did the previous assistant turn ask about, if it was a fallback question? */
function askedField(messages: Message[]): Field | undefined {
  const previous = messages.at(-1);
  // An empty conversation starts with the UI's fixed "what's your full name?" prompt.
  if (!previous) return "name";
  if (previous.role !== "assistant") return undefined;
  return PROFILE_FIELDS.find((field) =>
    ["ru", "en"].some((language) =>
      previous.text.trimEnd().endsWith(question(language, field)),
    ),
  );
}

/**
 * Guided-interview fallback for the resume chat. `history` excludes the new
 * user message. The answer is stored only when we know which question it
 * answers, so a free-form reply is never filed under the wrong heading.
 */
export function fallbackChat(
  profile: Profile,
  history: Message[],
  answer: string,
  language: string,
) {
  const field = askedField(history);
  const declined =
    field &&
    ["projects", "goals", "contact"].includes(field) &&
    /^(нет|не |пропуст|не хочу|no\b|skip|none|-)/i.test(answer.trim());
  const text = declined ? "-" : answer.trim().slice(0, 5000);
  let updated: Profile = field && text ? { ...profile, [field]: text } : profile;
  if (field === "city" && text) {
    // "Алматы" or "Алматы, Казахстан" → city + inferred country.
    const place = resolveLocation(text, profile.country);
    updated = {
      ...updated,
      city: place.city || text.split(",")[0].trim(),
      country: profile.country || (place.country ? countryName(place.country, language) : ""),
    };
  }
  const next = firstMissing(updated);
  // Acknowledge a recorded answer; otherwise explain once why the tone changed.
  const lead = translate(language, field ? "fallback.saved" : "fallback.intro");
  const ask = next
    ? question(language, next)
    : translate(language, "fallback.complete");
  return { reply: `${lead} ${ask}`, profile: updated };
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-term match that also works for terms like "C++", "C#", "Node.js". */
export function containsTerm(haystack: string, term: string) {
  const needle = term.trim().toLocaleLowerCase();
  if (needle.length < 1) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  ).test(haystack.toLocaleLowerCase());
}
export const splitSkills = (skills: string) => [
  ...new Set(
    skills
      .split(/[,;\n•|]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 1 && s.length <= 60),
  ),
].slice(0, 40);

/** Keyword-overlap estimate. Honest about being a rough heuristic. */
export function heuristicMatch(
  profile: Profile,
  job: Pick<Job, "skills" | "description" | "title">,
  language: string,
): Match {
  const resumeText = PROFILE_FIELDS.map((f) => profile[f]).join("\n");
  const jobText = `${job.title}\n${job.description}\n${job.skills.join(", ")}`;
  const ownSkills = splitSkills(profile.skills);
  const requirements = [...new Set(job.skills.map((s) => s.trim()).filter(Boolean))].slice(0, 20);
  let matched: string[], missing: string[], total: number;
  if (requirements.length) {
    matched = requirements.filter((req) => containsTerm(resumeText, req));
    missing = requirements.filter((req) => !matched.includes(req));
    total = requirements.length;
  } else {
    matched = ownSkills.filter((skill) => containsTerm(jobText, skill));
    missing = [];
    total = Math.max(3, ownSkills.length);
  }
  if (!ownSkills.length && !matched.length)
    return {
      score: 0,
      matched: [],
      missing: missing.slice(0, 20),
      explanation: translate(language, "fallback.matchNoSkills"),
    };
  const score = Math.max(0, Math.min(100, Math.round((100 * matched.length) / total)));
  return {
    score,
    matched: matched.slice(0, 20).map((s) => s.slice(0, 120)),
    missing: missing.slice(0, 20).map((s) => s.slice(0, 120)),
    explanation: translate(language, "fallback.matchExplanation", {
      matched: matched.length,
      total: requirements.length || ownSkills.length,
    }),
  };
}

/** Plain, fact-only cover letter assembled from the student's own resume text. */
export function templateLetter(
  profile: Profile,
  job: Pick<Job, "title" | "company">,
  language: string,
) {
  const t = (key: string, params?: Record<string, string>) =>
    translate(language, key, params);
  const clean = (value: string) => value.trim().replace(/[.\s]+$/, "");
  const company = job.company.trim() || (language === "ru" ? "компании" : "the company");
  const paragraphs = [
    t("letter.greeting", { company }),
    t("letter.application", { title: job.title }),
    profile.education.trim()
      ? t("letter.education", { education: clean(profile.education) })
      : t("letter.educationFallback"),
    ...(profile.experience.trim()
      ? [t("letter.experience", { experience: clean(profile.experience) })]
      : []),
    profile.skills.trim()
      ? t("letter.skills", { skills: clean(profile.skills) })
      : t("letter.skillsFallback"),
    profile.projects.trim()
      ? t("letter.projects", { projects: profile.projects.trim() })
      : t("letter.projectsFallback"),
    ...(profile.goals.trim() ? [t("letter.goals", { goals: clean(profile.goals) })] : []),
    t("letter.interest", { title: job.title }),
    t("letter.thanks"),
    `${t("letter.signoff")}\n${profile.name.trim() || t("letter.nameFallback")}${
      profile.contact.trim() ? "\n" + profile.contact.trim() : ""
    }`,
  ];
  return paragraphs.join("\n\n").slice(0, 15000);
}

/** Offline intent detection for the chat (the AI parse does this when available). */
export function guessAction(message: string, hasDraft: boolean): "answer" | "compose" | "revise" | "publish" {
  const text = message.toLowerCase();
  if (hasDraft && /опубликуй|опубликовать|публикуй|publish/.test(text)) return "publish";
  if (/состав(ь|ить)|собери|сделай резюме|напиши резюме|compose|build (my )?resume|write (my )?resume/.test(text))
    return "compose";
  if (hasDraft && /измени|поменяй|поправь|исправь|замени|убери|добавь|сократи|change|fix|edit|remove|shorten/.test(text))
    return "revise";
  return "answer";
}

/** Offline resume: the student's facts laid out as resume sections, nothing invented. */
export function composeFallback(profile: Profile, language: string) {
  const t = (key: string, params?: Record<string, string>) => translate(language, key, params);
  const clean = (value: string) => (value.trim() === "-" ? "" : value);
  const bullets = (value: string) =>
    clean(value)
      .split(/\n|;\s*/)
      .map((line) => line.replace(/^[•\-–\s]+/, "").trim())
      .filter(Boolean)
      .map((line) => `• ${line[0].toUpperCase()}${line.slice(1)}`)
      .join("\n");
  const place = [profile.city, profile.country].filter((v) => v.trim()).join(", ");
  const summary = [
    profile.occupation.trim() ? t("draft.summary.role", { role: profile.occupation.trim() }) : "",
    place ? t("draft.summary.place", { place }) : "",
    profile.skills.trim() ? t("draft.summary.skills", { skills: profile.skills.trim() }) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const draft: Profile = {
    ...profile,
    summary,
    experience: bullets(profile.experience),
    education: bullets(profile.education),
    projects: bullets(profile.projects),
    goals: clean(profile.goals),
    contact: clean(profile.contact),
  };
  return { message: t("draft.readyOffline"), draft };
}
