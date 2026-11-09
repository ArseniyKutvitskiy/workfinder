import { createHash } from "node:crypto";
import { z } from "zod";
import type { Config } from "../config.ts";
import type { Job, JobSource } from "../../shared/schemas.ts";
import { SOURCE_LABELS } from "../../shared/schemas.ts";
import { HttpError } from "../errors.ts";
import { countryName, CIS_COUNTRIES } from "../../shared/geo.ts";
import { stripHtml } from "./jobs.ts";
import {
  arbeitnowSchema,
  joobleSchema,
  type ArbeitnowJob,
  type JoobleJob,
} from "./providerSchemas.ts";

/** What every provider receives: already-resolved location and a keyword. */
export type ProviderQuery = {
  keyword: string;
  /** English keyword for English-only remote boards ("" = no keyword). */
  keywordEn: string;
  city: string;
  cityEn: string;
  /** ISO country of the search ("" = anywhere). */
  country: string;
  /** ISO country the student lives in; used to keep only remote jobs open to them. */
  home: string;
  /** trudvsem.ru KLADR region code, when known. */
  region: string;
  userIp: string;
  userAgent: string;
};
export type Fetcher = typeof fetch;

export const hash = (value: unknown) =>
  createHash("sha256").update(String(value)).digest("hex").slice(0, 32);
/** Undo UTF-8-decoded-as-Latin-1 damage ("Engineer â€” Lead" → "Engineer — Lead"). */
export function fixMojibake(value: string) {
  if (!/[ÃÂâ][\u0080-\u00ff€™œžŸ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((ch) => {
      const code = ch.charCodeAt(0);
      // Windows-1252 specials map back to their byte values.
      const cp1252: Record<number, number> = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
      if (code < 256) return code;
      if (cp1252[code] !== undefined) return cp1252[code];
      throw new Error("not mojibake");
    }));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded;
  } catch {
    // Mixed content: fix the common sequences only.
    return value
      .replace(/â€”/g, "—")
      .replace(/â€“/g, "–")
      .replace(/â€™/g, "’")
      .replace(/â€œ|â€\u009d|â€/g, "\"")
      .replace(/Â /g, " ")
      .replace(/â(?=\s)/g, "—");
  }
}
const text = (value: unknown, max = 18000) =>
  fixMojibake(stripHtml(value)).slice(0, max);

/** Accept only https links on the provider's own domains (http is upgraded). */
export function safeLink(value: string, domains: RegExp) {
  const url = new URL(value);
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:" || url.username || url.password || !domains.test(url.hostname.toLowerCase()))
    throw new Error("Invalid source URL");
  return url.href;
}

function initials(company: string) {
  const letters = company
    .replace(/["«»“”']/g, "")
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w) && !/^(ооо|ао|тоо|ип|зао|пао|llc|ltd|inc|gmbh)$/i.test(w))
    .slice(0, 2)
    .map((w) => [...w][0])
    .join("");
  return (letters || [...company][0] || "J").toUpperCase().slice(0, 2);
}
const COLORS = ["#246d58", "#35577e", "#7a6447", "#8a4560", "#55508a", "#2f6f7a"];

export function makeJob(
  source: JobSource,
  rawId: unknown,
  fields: {
    title: string;
    company: string;
    url: string;
    location: string;
    description: string;
    salary?: string;
    type?: string;
    level?: string;
    skills?: string[];
    publishedAt?: string | number | null;
    remote?: boolean;
  },
): Job {
  const company = text(fields.company, 300) || "—";
  const published =
    typeof fields.publishedAt === "number"
      ? new Date(fields.publishedAt * (fields.publishedAt < 1e12 ? 1000 : 1))
      : fields.publishedAt
        ? new Date(fields.publishedAt)
        : null;
  return {
    id: `${source}-${hash(source + ":" + String(rawId))}`,
    source: SOURCE_LABELS[source],
    title: text(fields.title, 300),
    company,
    initials: initials(company),
    color: COLORS[parseInt(hash(company).slice(0, 2), 16) % COLORS.length],
    url: fields.url,
    location: text(fields.location, 300),
    description: text(fields.description),
    level: text(fields.level, 120) || "Not specified",
    type: text(fields.type, 120) || "Not specified",
    salary: text(fields.salary, 120) || "Salary not listed",
    skills: (fields.skills ?? []).map((s) => text(s, 60)).filter(Boolean).slice(0, 30),
    score: null,
    matched: [],
    missing: [],
    publishedAt: published && Number.isFinite(published.getTime()) ? published.toISOString() : null,
    remote: fields.remote,
  };
}

/** Run a normalizer over a raw list, silently dropping malformed rows. */
function each<T>(rows: unknown[], schema: z.ZodType<T>, map: (row: T) => Job | null): Job[] {
  return rows.flatMap((row) => {
    try {
      const job = map(schema.parse(row));
      return job && job.title ? [job] : [];
    } catch {
      return [];
    }
  });
}

async function getJson(
  fetcher: Fetcher,
  url: string,
  init: RequestInit = {},
  timeout = 12000,
): Promise<unknown> {
  const response = await fetcher(url, {
    ...init,
    headers: { "User-Agent": "WorkFinder/2.0 (+career assistant for students)", Accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeout),
    redirect: "follow",
  });
  if (!response.ok)
    throw new HttpError(
      503,
      response.status === 401 || response.status === 403 ? "jobs.accessDenied" : "jobs.failed",
    );
  return response.json();
}

// ---------------------------------------------------------------------------
// Remote-work eligibility: show a KZ/RU student only remote jobs they can take.
// ---------------------------------------------------------------------------
const OPEN_TO_ALL = /\b(worldwide|anywhere|global|remote|international|any\s*location)\b/i;
const CIS_WORDS = String.raw`cis\b|снг|commonwealth of independent`;
const region = (words: string) => new RegExp(`${words}|${CIS_WORDS}`, "i");
const REGION_WORDS: Record<string, RegExp> = {
  KZ: region("kazakh|казахстан|central asia|asia\\b"),
  RU: region("russia|россия"),
  UZ: region("uzbek|узбекистан|central asia|asia\\b"),
  KG: region("kyrgyz|кыргызстан|киргиз|central asia|asia\\b"),
  TJ: region("tajik|таджикистан|central asia|asia\\b"),
  BY: region("belarus|беларусь|eastern europe"),
  AZ: region("azerbaijan|азербайджан|caucasus|кавказ"),
  GE: region("georgia\\b|грузия|caucasus|кавказ"),
  AM: region("armenia|армения|caucasus|кавказ"),
};
export function openToHome(restriction: string | string[] | undefined | null, home: string) {
  const list = (Array.isArray(restriction) ? restriction : [restriction ?? ""])
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length) return true;
  return list.some((entry) => OPEN_TO_ALL.test(entry) || (home && REGION_WORDS[home]?.test(entry)));
}

/** Russian role words → English, for English-only remote boards. */
const RU_EN: [RegExp, string][] = [
  [/разработчик|программист/i, "developer"],
  [/фронтенд|frontend|фронт-?енд/i, "frontend"],
  [/бэкенд|бекенд|backend/i, "backend"],
  [/дизайнер/i, "designer"],
  [/маркетолог|маркетинг/i, "marketing"],
  [/аналитик/i, "analyst"],
  [/данн/i, "data"],
  [/бухгалтер/i, "accountant"],
  [/менеджер/i, "manager"],
  [/продаж/i, "sales"],
  [/тестировщик|тестирован/i, "qa"],
  [/поддержк/i, "support"],
  [/переводчик/i, "translator"],
  [/преподавател|учител/i, "teacher"],
  [/копирайтер|контент/i, "content"],
  [/рекрутер|hr\b|кадр/i, "recruiter"],
  [/юрист/i, "legal"],
  [/инженер/i, "engineer"],
  [/devops/i, "devops"],
  [/python|java\b|javascript|react|golang|php|c#|\.net|ios|android|flutter|sql|smm|seo|ux|ui/i, ""],
];
export function englishKeyword(keyword: string) {
  if (!/[а-яё]/i.test(keyword)) return keyword.trim();
  const words = new Set<string>();
  for (const [pattern, en] of RU_EN) {
    const match = keyword.match(pattern);
    if (match) words.add(en || match[0].toLowerCase());
  }
  return [...words].join(" ").trim();
}
const matchesKeyword = (job: Job, keyword: string) => {
  if (!keyword) return true;
  const hay = `${job.title} ${job.skills.join(" ")} ${job.description.slice(0, 3000)}`.toLowerCase();
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((w) => hay.includes(w));
};

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
export type Provider = {
  id: JobSource;
  /** Remote-only boards are mixed in for every market and skipped for "onsite". */
  remoteOnly: boolean;
  /** Countries it serves; undefined = any. */
  countries?: string[];
  configured: (config: Config) => boolean;
  search: (q: ProviderQuery, fetcher: Fetcher, config: Config) => Promise<Job[]>;
};

export function normalizeArbeitnow(row: ArbeitnowJob): Job {
  return makeJob("arbeitnow", row.slug, {
    title: row.title,
    company: row.company_name,
    url: safeLink(row.url, /(^|\.)arbeitnow\.com$/),
    location: row.location,
    description: row.description,
    skills: row.tags ?? [],
    type: (row.job_types ?? []).join(", "),
    publishedAt: Number.isFinite(row.created_at) ? row.created_at : null,
    remote: row.remote === true,
  });
}
export function normalizeJooble(row: JoobleJob): Job {
  return makeJob("jooble", row.id, {
    title: row.title,
    company: row.company,
    url: safeLink(row.link, /(^|\.)jooble\.org$/),
    location: row.location,
    description: row.snippet,
    type: row.type,
    salary: row.salary,
    publishedAt: row.updated && Number.isFinite(Date.parse(row.updated)) ? row.updated : null,
  });
}

const trudSchema = z.object({
  vacancy: z.object({
    id: z.string(),
    "job-name": z.string(),
    company: z.object({ name: z.string().optional() }).optional(),
    region: z.object({ name: z.string().optional() }).optional(),
    addresses: z
      .object({ address: z.array(z.object({ location: z.string().optional() })).optional() })
      .optional(),
    salary: z.string().optional(),
    vac_url: z.string(),
    "creation-date": z.string().optional(),
    duty: z.string().optional(),
    requirements: z.string().optional(),
    employment: z.string().optional(),
    schedule: z.string().optional(),
    requirement: z.object({ experience: z.union([z.number(), z.string()]).optional() }).optional(),
  }),
});
const remotiveSchema = z.object({
  id: z.union([z.number(), z.string()]),
  url: z.string(),
  title: z.string(),
  company_name: z.string(),
  tags: z.array(z.string()).optional(),
  job_type: z.string().optional(),
  publication_date: z.string().optional(),
  candidate_required_location: z.string().optional(),
  salary: z.string().optional(),
  description: z.string().optional(),
});
const remoteOkSchema = z.object({
  id: z.union([z.string(), z.number()]),
  company: z.string(),
  position: z.string(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  url: z.string(),
  date: z.string().optional(),
});
const himalayasSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  companyName: z.string(),
  employmentType: z.string().optional(),
  minSalary: z.number().nullable().optional(),
  maxSalary: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  seniority: z.array(z.string()).optional(),
  locationRestrictions: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  description: z.string().optional(),
  pubDate: z.number().optional(),
  applicationLink: z.string(),
  guid: z.string(),
});
const jobicySchema = z.object({
  id: z.union([z.number(), z.string()]),
  url: z.string(),
  jobTitle: z.string(),
  companyName: z.string(),
  jobIndustry: z.array(z.string()).optional(),
  jobType: z.array(z.string()).optional(),
  jobGeo: z.string().optional(),
  jobLevel: z.string().optional(),
  jobExcerpt: z.string().optional(),
  jobDescription: z.string().optional(),
  pubDate: z.string().optional(),
  annualSalaryMin: z.union([z.number(), z.string()]).optional(),
  annualSalaryMax: z.union([z.number(), z.string()]).optional(),
  salaryCurrency: z.string().optional(),
});
const careerjetSchema = z.object({
  title: z.string(),
  company: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  locations: z.string().optional(),
  salary: z.string().optional(),
  url: z.string(),
});
const adzunaSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional(),
  created: z.string().optional(),
  redirect_url: z.string(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  contract_time: z.string().optional(),
  company: z.object({ display_name: z.string().optional() }).optional(),
  location: z.object({ display_name: z.string().optional() }).optional(),
});

const money = (min?: number | null, max?: number | null, currency = "") =>
  min || max
    ? `${min ? Math.round(min).toLocaleString("ru-RU") : "…"}–${max ? Math.round(max).toLocaleString("ru-RU") : "…"} ${currency}`.trim()
    : "";

/** Careerjet locale per market (overridable when Careerjet lists a different code). */
const CAREERJET_LOCALES: Record<string, string> = {
  KZ: "ru_KZ",
  RU: "ru_RU",
  DE: "de_DE",
  GB: "en_GB",
  US: "en_US",
  PL: "pl_PL",
  NL: "nl_NL",
};
export const ADZUNA_COUNTRIES = ["GB", "US", "AT", "AU", "BE", "BR", "CA", "CH", "DE", "ES", "FR", "IN", "IT", "MX", "NL", "NZ", "PL", "SG", "ZA"];

export const PROVIDERS: Provider[] = [
  {
    id: "trudvsem",
    remoteOnly: false,
    countries: ["RU"],
    configured: () => true,
    async search(q, fetcher) {
      // Official open-data API: up to 3 pages × 100 in parallel (offset = page index).
      // The first page must succeed; extra pages are best-effort.
      const base = "https://opendata.trudvsem.ru/api/v1/vacancies";
      const pageSchema = z.object({
        results: z.object({ vacancies: z.array(z.unknown()).optional() }).optional(),
      });
      const fetchPage = async (offset: number) => {
        const params = new URLSearchParams({ limit: "100", offset: String(offset) });
        if (q.keyword) params.set("text", q.keyword);
        const body = pageSchema.parse(
          await getJson(fetcher, `${base}${q.region ? `/region/${q.region}` : ""}?${params}`, {}, 20000),
        );
        return body.results?.vacancies ?? [];
      };
      const [first, ...rest] = await Promise.allSettled([0, 1, 2].map(fetchPage));
      if (first.status === "rejected") throw first.reason;
      const rows = [first.value];
      for (const page of rest) {
        if (page.status === "fulfilled") rows.push(page.value);
      }
      return each(rows.flat(), trudSchema, ({ vacancy: v }) =>
        makeJob("trudvsem", v.id, {
          title: v["job-name"],
          company: v.company?.name ?? "",
          url: safeLink(v.vac_url, /(^|\.)trudvsem\.ru$/),
          location: v.addresses?.address?.[0]?.location || v.region?.name || "",
          description: [v.duty, v.requirements].filter(Boolean).join("\n\n"),
          salary: v.salary && v.salary !== "0" ? `${v.salary} RUB` : "",
          type: [v.employment, v.schedule].filter(Boolean).join(", "),
          level:
            v.requirement?.experience !== undefined && Number(v.requirement.experience) === 0
              ? "No experience"
              : "",
          publishedAt: v["creation-date"] ?? null,
        }),
      );
    },
  },
  {
    id: "jooble",
    remoteOnly: false,
    countries: [...CIS_COUNTRIES, ...ADZUNA_COUNTRIES],
    configured: (c) => !!c.JOOBLE_API_KEY,
    async search(q, fetcher, config) {
      const body = z.object({ jobs: z.array(z.unknown()) }).parse(
        await getJson(fetcher, `https://jooble.org/api/${encodeURIComponent(config.JOOBLE_API_KEY!)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: q.keyword,
            // Jooble matches place names, not ISO codes.
            location: q.city || countryName(q.country, "ru"),
            page: "1",
            ResultOnPage: "50",
          }),
        }),
      );
      return each(body.jobs.slice(0, 60), joobleSchema, normalizeJooble);
    },
  },
  {
    id: "careerjet",
    remoteOnly: false,
    countries: Object.keys(CAREERJET_LOCALES),
    configured: (c) => !!c.CAREERJET_API_KEY,
    async search(q, fetcher, config) {
      const params = new URLSearchParams({
        locale_code: CAREERJET_LOCALES[q.country] ?? "en_GB",
        keywords: q.keyword,
        page_size: "50",
        sort: "relevance",
        user_ip: q.userIp || "127.0.0.1",
        user_agent: q.userAgent || "Mozilla/5.0",
      });
      if (q.city) params.set("location", q.city);
      const auth = Buffer.from(`${config.CAREERJET_API_KEY}:`).toString("base64");
      const body = z.object({ jobs: z.array(z.unknown()).optional() }).parse(
        await getJson(fetcher, `https://search.api.careerjet.net/v4/query?${params}`, {
          headers: { Authorization: `Basic ${auth}` },
        }),
      );
      return each(body.jobs ?? [], careerjetSchema, (j) =>
        makeJob("careerjet", j.url, {
          title: j.title,
          company: j.company ?? "",
          url: safeLink(j.url, /(^|\.)(careerjet\.[a-z.]+|jobviewtrack\.com)$/),
          location: j.locations ?? "",
          description: j.description ?? "",
          salary: j.salary,
          publishedAt: j.date ?? null,
        }),
      );
    },
  },
  {
    id: "adzuna",
    remoteOnly: false,
    countries: ADZUNA_COUNTRIES,
    configured: (c) => !!c.ADZUNA_APP_ID && !!c.ADZUNA_APP_KEY,
    async search(q, fetcher, config) {
      const params = new URLSearchParams({
        app_id: config.ADZUNA_APP_ID!,
        app_key: config.ADZUNA_APP_KEY!,
        results_per_page: "50",
        "content-type": "application/json",
      });
      if (q.keywordEn || q.keyword) params.set("what", q.keywordEn || q.keyword);
      if (q.cityEn || q.city) params.set("where", q.cityEn || q.city);
      const body = z.object({ results: z.array(z.unknown()) }).parse(
        await getJson(fetcher, `https://api.adzuna.com/v1/api/jobs/${q.country.toLowerCase()}/search/1?${params}`),
      );
      return each(body.results, adzunaSchema, (j) =>
        makeJob("adzuna", j.id, {
          title: j.title,
          company: j.company?.display_name ?? "",
          url: safeLink(j.redirect_url, /(^|\.)adzuna\.[a-z.]+$/),
          location: j.location?.display_name ?? "",
          description: j.description ?? "",
          salary: money(j.salary_min, j.salary_max),
          type: j.contract_time?.replace("_", "-"),
          publishedAt: j.created ?? null,
        }),
      );
    },
  },
  {
    id: "remotive",
    remoteOnly: true,
    configured: () => true,
    async search(q, fetcher) {
      const params = new URLSearchParams({ limit: "100" });
      if (q.keywordEn) params.set("search", q.keywordEn);
      const body = z.object({ jobs: z.array(z.unknown()) }).parse(
        await getJson(fetcher, `https://remotive.com/api/remote-jobs?${params}`),
      );
      return each(body.jobs, remotiveSchema, (j) =>
        openToHome(j.candidate_required_location, q.home)
          ? makeJob("remotive", j.id, {
              title: j.title,
              company: j.company_name,
              url: safeLink(j.url, /(^|\.)remotive\.(com|io)$/),
              location: `Remote · ${j.candidate_required_location || "Worldwide"}`,
              description: j.description ?? "",
              salary: j.salary,
              type: j.job_type?.replace("_", "-"),
              skills: j.tags,
              publishedAt: j.publication_date ?? null,
              remote: true,
            })
          : null,
      );
    },
  },
  {
    id: "remoteok",
    remoteOnly: true,
    configured: () => true,
    async search(q, fetcher) {
      const rows = z.array(z.unknown()).parse(await getJson(fetcher, "https://remoteok.com/api"));
      return each(rows.slice(1), remoteOkSchema, (j) =>
        openToHome(j.location, q.home)
          ? makeJob("remoteok", j.id, {
              title: j.position,
              company: j.company,
              url: safeLink(j.url, /(^|\.)remoteok\.(com|io)$/),
              location: `Remote · ${j.location || "Worldwide"}`,
              description: j.description ?? "",
              salary: money(j.salary_min, j.salary_max, "USD"),
              skills: j.tags,
              publishedAt: j.date ?? null,
              remote: true,
            })
          : null,
      ).filter((job) => matchesKeyword(job, q.keywordEn));
    },
  },
  {
    id: "himalayas",
    remoteOnly: true,
    configured: () => true,
    async search(q, fetcher) {
      const body = z.object({ jobs: z.array(z.unknown()) }).parse(
        // Search endpoint ranks by relevance and can exclude country-locked roles;
        // the plain feed is just the 20 newest jobs.
        await getJson(
          fetcher,
          q.keywordEn
            ? `https://himalayas.app/jobs/api/search?${new URLSearchParams({ q: q.keywordEn, worldwide: "true" })}`
            : "https://himalayas.app/jobs/api?limit=100",
        ),
      );
      return each(body.jobs, himalayasSchema, (j) =>
        openToHome(j.locationRestrictions, q.home)
          ? makeJob("himalayas", j.guid, {
              title: j.title,
              company: j.companyName,
              url: safeLink(j.applicationLink, /(^|\.)himalayas\.app$/),
              location: `Remote · ${j.locationRestrictions?.join(", ") || "Worldwide"}`,
              description: j.description || j.excerpt || "",
              salary: money(j.minSalary, j.maxSalary, j.currency ?? ""),
              type: j.employmentType,
              level: j.seniority?.join(", "),
              skills: j.categories?.map((c) => c.replace(/-/g, " ")),
              publishedAt: j.pubDate ?? null,
              remote: true,
            })
          : null,
      ).filter((job) => matchesKeyword(job, q.keywordEn));
    },
  },
  {
    id: "jobicy",
    remoteOnly: true,
    configured: () => true,
    async search(q, fetcher) {
      const params = new URLSearchParams({ count: "50" });
      const tag = q.keywordEn.split(/\s+/)[0];
      if (tag) params.set("tag", tag);
      const body = z.object({ jobs: z.array(z.unknown()).optional() }).parse(
        await getJson(fetcher, `https://jobicy.com/api/v2/remote-jobs?${params}`),
      );
      return each(body.jobs ?? [], jobicySchema, (j) =>
        openToHome(j.jobGeo, q.home)
          ? makeJob("jobicy", j.id, {
              title: j.jobTitle,
              company: j.companyName,
              url: safeLink(j.url, /(^|\.)jobicy\.com$/),
              location: `Remote · ${j.jobGeo || "Anywhere"}`,
              description: j.jobDescription || j.jobExcerpt || "",
              salary: money(Number(j.annualSalaryMin) || 0, Number(j.annualSalaryMax) || 0, j.salaryCurrency ?? ""),
              type: j.jobType?.join(", "),
              level: j.jobLevel && j.jobLevel !== "Any" ? j.jobLevel : "",
              skills: j.jobIndustry,
              publishedAt: j.pubDate ?? null,
              remote: true,
            })
          : null,
      );
    },
  },
  {
    id: "arbeitnow",
    remoteOnly: true,
    configured: () => true,
    async search(q, fetcher) {
      const body = z.object({ data: z.array(z.unknown()) }).parse(
        await getJson(fetcher, "https://www.arbeitnow.com/api/job-board-api"),
      );
      // Arbeitnow is Germany-based: for KZ/RU students keep only its remote roles.
      return each(body.data.slice(0, 300), arbeitnowSchema, normalizeArbeitnow).filter(
        (job) => (q.country === "DE" || job.remote) && matchesKeyword(job, q.keywordEn),
      );
    },
  },
];
export const providerById = (id: JobSource) => PROVIDERS.find((p) => p.id === id);
