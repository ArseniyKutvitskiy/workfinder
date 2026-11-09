import { z } from "zod";
/** Every job provider WorkFinder can query (see server/services/providers.ts). */
export const JOB_SOURCES = [
  "hh",
  "trudvsem",
  "jooble",
  "careerjet",
  "adzuna",
  "remotive",
  "remoteok",
  "himalayas",
  "jobicy",
  "arbeitnow",
] as const;
export type JobSource = (typeof JOB_SOURCES)[number];
export const SOURCE_LABELS: Record<JobSource, string> = {
  hh: "HeadHunter",
  trudvsem: "Работа России",
  jooble: "Jooble",
  careerjet: "Careerjet",
  adzuna: "Adzuna",
  remotive: "Remotive",
  remoteok: "RemoteOK",
  himalayas: "Himalayas",
  jobicy: "Jobicy",
  arbeitnow: "Arbeitnow",
};
export const languageSchema = z.enum(["ru", "en"]).default("ru");
/**
 * Resume fields, in the order the interview collects them. New fields default
 * to "" so resumes saved before they existed still parse.
 */
export const PROFILE_FIELDS = [
  "name",
  "city",
  "country",
  "occupation",
  "education",
  "experience",
  "skills",
  "projects",
  "goals",
  "contact",
  "summary",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
const field = z.string().max(5000);
export const profileSchema = z
  .object({
    name: field,
    contact: field,
    education: field,
    skills: field,
    projects: field,
    goals: field,
    city: field.max(120).default(""),
    country: field.max(120).default(""),
    occupation: field.max(300).default(""),
    experience: field.default(""),
    /** "About me": 2–4 sentences composed from the interview. */
    summary: field.default(""),
  })
  .strict();
/**
 * What OpenAI structured output must return: every field required and NO
 * maxLength/minLength (strict JSON-schema mode rejects them for strings).
 * Lengths are enforced afterwards by clampProfile().
 */
export const aiProfileSchema = z
  .object(Object.fromEntries(PROFILE_FIELDS.map((f) => [f, z.string()])) as Record<ProfileField, z.ZodString>)
  .strict();
/** Fact extraction also reports what the latest message asks for. */
export const CHAT_ACTIONS = ["answer", "compose", "revise", "publish"] as const;
export type ChatAction = (typeof CHAT_ACTIONS)[number];
export const aiParseSchema = aiProfileSchema.extend({ action: z.enum(CHAT_ACTIONS) });
/** A composed resume plus the short chat message that introduces it. */
export const aiComposeSchema = aiProfileSchema.extend({ message: z.string() });
const PROFILE_LIMITS: Partial<Record<ProfileField, number>> = { city: 120, country: 120, occupation: 300 };
export function clampProfile(value: Record<ProfileField, string>) {
  return profileSchema.parse(
    Object.fromEntries(
      PROFILE_FIELDS.map((f) => [f, String(value[f] ?? "").trim().slice(0, PROFILE_LIMITS[f] ?? 5000)]),
    ),
  );
}
export const emptyProfile = Object.freeze(
  Object.fromEntries(PROFILE_FIELDS.map((f) => [f, ""])) as Record<ProfileField, string>,
);
/** Interview order; country is asked only when it could not be inferred from the city. */
export const INTERVIEW_STEPS: ProfileField[] = [
  "name",
  "city",
  "country",
  "occupation",
  "education",
  "experience",
  "skills",
  "projects",
  "goals",
  "contact",
];
export function interviewStep(profile: Partial<Record<ProfileField, string>>): ProfileField | null {
  return INTERVIEW_STEPS.find((f) => !profile[f]?.trim()) ?? null;
}
/** Marker for an optional interview step the student chose to skip. */
export const SKIPPED = "-";
export const isSkipped = (value?: string) => value?.trim() === SKIPPED;
/** A resume can be exported once it has a name and at least one real section. */
export function resumeExportable(profile: Partial<Record<ProfileField, string>>) {
  const has = (f: ProfileField) => !!profile[f]?.trim() && !isSkipped(profile[f]);
  return has("name") && (["skills", "experience", "education", "projects"] as ProfileField[]).some(has);
}
/** "Арсений Кутвицкий" → "Арсений_Кутвицкий_резюме" (safe file name in any language). */
export function resumeFileName(name: string, language: string) {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").slice(0, 60);
  const suffix = language === "en" ? "resume" : "резюме";
  return base ? `${base}_${suffix}` : `workfinder_${suffix}`;
}
/**
 * What the job matcher needs before it can recommend jobs well.
 * Education OR experience is enough: "I haven't worked yet" is a valid answer.
 */
export function profileReadiness(profile: Partial<Record<ProfileField, string>>) {
  const has = (f: ProfileField) => !!profile[f]?.trim();
  const required: ProfileField[] = ["name", "city", "occupation", "skills"];
  const missing = required.filter((f) => !has(f));
  if (!has("education") && !has("experience")) missing.push("education");
  // Progress follows the interview; "-" (skipped optional step) counts as answered.
  const answered = INTERVIEW_STEPS.filter(has).length;
  return {
    ready: missing.length === 0,
    missing,
    filled: answered,
    total: INTERVIEW_STEPS.length,
    percent: Math.round((answered / INTERVIEW_STEPS.length) * 100),
    /** Every interview question answered: time to compose the full resume. */
    complete: answered === INTERVIEW_STEPS.length,
  };
}
export const resumeSchema = z
  .object({
    profile: profileSchema,
    version: z.number().int().nonnegative(),
    language: z.enum(["ru", "en"]).optional(),
  })
  .strict();
export const chatSchema = resumeSchema.extend({
  message: z.string().trim().min(1).max(5000),
  language: languageSchema,
  /** Set by buttons: compose the full resume, or publish the latest draft. */
  action: z.enum(["compose", "publish"]).optional(),
});
export const searchSchema = z
  .object({
    source: z.enum(["all", ...JOB_SOURCES]).default("all"),
    keyword: z.string().max(200).default(""),
    /** Free-text city (any language); resolved server-side via shared/geo.ts. */
    city: z.string().max(120).default(""),
    /** ISO country code, or "" for anywhere. */
    country: z.string().regex(/^([A-Z]{2})?$/).default(""),
    level: z
      .enum(["", "No experience", "Entry level", "Experienced"])
      .default(""),
    remote: z.enum(["", "remote", "onsite"]).default(""),
    roleType: z.enum(["", "full", "part", "project", "probation"]).default(""),
    salary: z.coerce.number().int().min(0).max(10000000).default(0),
    currency: z
      .enum(["KZT", "RUR", "UZS", "KGS", "BYR", "AZN", "GEL", "USD", "EUR"])
      .default("KZT"),
    page: z.number().int().min(0).max(99).default(0),
  })
  .strict();
export const jobIdSchema = z
  .string()
  .regex(/^(hh-\d{1,16}|[a-z]{3,12}-[a-f0-9]{32})$/);
export const jobRequestSchema = z
  .object({ jobId: jobIdSchema, language: languageSchema })
  .strict();
export const letterSchema = jobRequestSchema.extend({
  letter: z.string().max(15000),
});
/** OpenAI-facing match shape: only keywords strict mode supports (no string lengths). */
export const aiMatchSchema = z
  .object({
    score: z.number().int(),
    matched: z.array(z.string()),
    missing: z.array(z.string()),
    explanation: z.string(),
  })
  .strict();
export const matchSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    matched: z.array(z.string().max(120)).max(20),
    missing: z.array(z.string().max(120)).max(20),
    explanation: z.string().max(2000),
  })
  .strict();

export type Language = z.infer<typeof languageSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SearchFilters = z.infer<typeof searchSchema>;
export type Match = z.infer<typeof matchSchema>;
export function clampMatch(value: z.infer<typeof aiMatchSchema>): Match {
  const list = (items: string[]) =>
    items.map((x) => x.trim().slice(0, 120)).filter(Boolean).slice(0, 20);
  return matchSchema.parse({
    score: Math.max(0, Math.min(100, Math.round(value.score))),
    matched: list(value.matched),
    missing: list(value.missing),
    explanation: value.explanation.trim().slice(0, 2000),
  });
}
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(15000),
  /** A complete resume the assistant composed in this message. */
  draft: profileSchema.optional(),
  /** This message published a draft to "My resume". */
  published: z.boolean().optional(),
});
export const latestDraft = (messages: { draft?: z.infer<typeof profileSchema> }[]) =>
  [...messages].reverse().find((m) => m.draft)?.draft;
export const isPublished = (messages: { published?: boolean }[]) =>
  messages.some((m) => m.published);
export type Message = z.infer<typeof messageSchema>;
export const jobSchema = z.object({
  id: jobIdSchema,
  title: z.string(),
  company: z.string(),
  initials: z.string(),
  color: z.string(),
  location: z.string(),
  level: z.string(),
  type: z.string(),
  salary: z.string(),
  source: z.string(),
  url: z.url().refine((v) => new URL(v).protocol === "https:"),
  description: z.string(),
  skills: z.array(z.string()),
  score: z.number().nullable(),
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  publishedAt: z.string().nullable(),
  remote: z.boolean().optional(),
  explanation: z.string().optional(),
});
export type Job = z.infer<typeof jobSchema>;
export const sourceSchema = z.object({
  source: z.enum(JOB_SOURCES),
  status: z.enum(["ok", "notConfigured", "unsupportedFilters", "unavailable"]),
  count: z.number().int().nonnegative().optional(),
});
export const jobsResponseSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
  sampled: z.boolean().optional(),
  sources: z.array(sourceSchema).optional(),
  /** Location the results were matched to, so the UI can say "in Almaty, Kazakhstan". */
  matchedLocation: z
    .object({ city: z.string(), country: z.string() })
    .optional(),
  /** Set when new-source jobs could not be stored (DB migration pending). */
  notice: z.string().optional(),
});
export type JobsResponse = z.infer<typeof jobsResponseSchema>;
export const workspaceSchema = z.object({
  profile: profileSchema,
  messages: z.array(messageSchema),
  version: z.number(),
  saved: z.array(z.string()),
  letters: z.record(z.string(), z.string()),
  aiMode: z.enum(["live", "fallback"]).optional(),
});
export type AiMode = "live" | "fallback";
/** `fallback: true` marks results produced by the offline (non-AI) engine. */
export const chatResultSchema = workspaceSchema
  .pick({ profile: true, messages: true, version: true })
  .extend({ fallback: z.boolean().optional() });
export const letterResultSchema = z.object({
  letter: z.string(),
  fallback: z.boolean().optional(),
});
export const matchResultSchema = matchSchema.extend({
  fallback: z.boolean().optional(),
});
export const authFormSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
