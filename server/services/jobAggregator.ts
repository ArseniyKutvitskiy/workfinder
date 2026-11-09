import type { Database } from "../../shared/database.types.ts";
import type { Config } from "../config.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  jobSchema,
  jobIdSchema,
  type Job,
  type JobSource,
  type JobsResponse,
  type Profile,
  type SearchFilters,
} from "../../shared/schemas.ts";
import { resolveLocation } from "../../shared/geo.ts";
import { createJobService as createHH, HH_COUNTRY_AREAS } from "./jobs.ts";
import {
  PROVIDERS,
  englishKeyword,
  hash,
  type Fetcher,
  type Provider,
  type ProviderQuery,
} from "./providers.ts";
import { HttpError, dbResult } from "../errors.ts";
import { containsTerm, splitSkills } from "./fallback.ts";

export { normalizeArbeitnow, normalizeJooble } from "./providers.ts";

const PAGE_SIZE = 12;
/** Two-letter role words that are meaningful on their own. */
const SHORT_ROLES = new Set(["ux", "ui", "qa", "hr", "pm", "ba", "it", "ai", "ml", "go", "c#"]);
const ENTRY = /\b(junior|intern|internship|trainee|entry|graduate)\b|стаж[её]р|стажировк|младш|без опыта|начинающ|ученик|помощник/i;
const SENIOR = /\b(senior|lead|head|principal|staff|director|architect|chief|vp)\b|старш|ведущ|руководител|начальник|директор/i;
/** No work experience in the resume ("", "пока нет", "Опыта работы пока нет", "no experience yet") → prefer entry-level roles. */
const NO_EXPERIENCE = /(^|\s)(нет|не было|отсутствует|никакого|no|none|not yet|nothing)(\s|[.!,]|$)/i;
export const isBeginner = (profile?: Profile) => {
  if (!profile) return false;
  const text = profile.experience.trim();
  return !text || (text.length <= 80 && NO_EXPERIENCE.test(text));
};
const CACHE_TTL = 15 * 60_000;
/** IDs the original database constraint accepts (before migration 202611070001). */
const LEGACY_ID = /^(hh-[0-9]{1,16}|arbeitnow-[a-f0-9]{32}|jooble-[a-f0-9]{32})$/;

export type SearchContext = {
  profile?: Profile;
  userIp?: string;
  userAgent?: string;
};

export function deduplicate(jobs: Job[]) {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const titles = new Set<string>();
  return jobs.filter((job) => {
    const url = new URL(job.url);
    url.search = "";
    url.hash = "";
    const key = url.href.replace(/\/$/, "").toLowerCase();
    // Same title at the same company from two boards is the same opening.
    const titleKey = `${job.title}|${job.company}`.toLowerCase().replace(/\s+/g, " ");
    if (ids.has(job.id) || urls.has(key) || titles.has(titleKey)) return false;
    ids.add(job.id);
    urls.add(key);
    titles.add(titleKey);
    return true;
  });
}

/**
 * Relevance for this student: role words in the title matter most, then skill
 * overlap, then being in their city/country, then freshness. Pure function.
 */
export function rankJobs(
  jobs: Job[],
  {
    keyword,
    city,
    country,
    skills,
    beginner = false,
  }: { keyword: string; city: string; country: string; skills: string[]; beginner?: boolean },
  now = Date.now(),
) {
  const roleTerms = [
    ...new Set(
      [keyword, englishKeyword(keyword)]
        .join(" ")
        .split(/[\s/,;|()+\-–—]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length >= 3 || SHORT_ROLES.has(w)),
    ),
  ];
  const cityTerms = [city, resolveLocation(city, country).cityEn].filter(Boolean);
  const score = (job: Job) => {
    let s = 0;
    for (const term of roleTerms) {
      if (containsTerm(job.title, term)) s += 30;
      else if (containsTerm(job.description.slice(0, 2000), term)) s += 6;
    }
    const hay = `${job.title} ${job.skills.join(", ")} ${job.description.slice(0, 4000)}`;
    s += Math.min(30, skills.filter((k) => containsTerm(hay, k)).length * 6);
    if (cityTerms.some((c) => containsTerm(job.location, c))) s += 25;
    else if (!job.remote && country) s += 8;
    if (job.remote) s += 4;
    if (beginner) {
      // Students first: entry-level roles up, senior/lead roles down.
      if (ENTRY.test(job.title) || /no experience|без опыта/i.test(job.level)) s += 18;
      if (SENIOR.test(job.title)) s -= 25;
    }
    const age = job.publishedAt ? (now - Date.parse(job.publishedAt)) / 86_400_000 : 60;
    s += Math.max(0, 15 - Math.max(0, age) / 2);
    return s;
  };
  return jobs
    .map((job) => ({ job, s: score(job) }))
    .sort(
      (a, b) =>
        b.s - a.s ||
        (Date.parse(b.job.publishedAt || "") || 0) - (Date.parse(a.job.publishedAt || "") || 0) ||
        a.job.id.localeCompare(b.job.id),
    )
    .map((x) => x.job);
}

/** Which providers fit this search, and why the others are skipped. */
export function planSources(filters: SearchFilters, config: Config) {
  const hhOnlyFilters = !!(filters.salary || filters.level || filters.roleType);
  const plan: { id: JobSource; provider?: Provider; status: "run" | "notConfigured" | "unsupportedFilters" }[] = [];
  // HeadHunter covers the CIS markets, including its own remote listings.
  if (HH_COUNTRY_AREAS[filters.country])
    plan.push({ id: "hh", status: config.HH_ACCESS_TOKEN ? "run" : "notConfigured" });
  for (const provider of PROVIDERS) {
    const fitsCountry = provider.remoteOnly
      ? filters.remote !== "onsite"
      : !!filters.country &&
        filters.remote !== "remote" &&
        (!provider.countries || provider.countries.includes(filters.country));
    if (!fitsCountry) continue;
    plan.push({
      id: provider.id,
      provider,
      status: !provider.configured(config)
        ? "notConfigured"
        : hhOnlyFilters
          ? "unsupportedFilters"
          : "run",
    });
  }
  if (filters.source === "all") return plan;
  const chosen = plan.filter((p) => p.id === filters.source);
  // A source picked for a market it does not serve: say so instead of silently returning nothing.
  return chosen.length ? chosen : [{ id: filters.source, status: "unsupportedFilters" as const }];
}

export function createJobService(
  config: Config,
  admin: SupabaseClient<Database>,
  fetcher: Fetcher = fetch,
) {
  const hh = createHH(config, admin, fetcher);
  const inflight = new Map<string, Promise<Job[]>>();
  /** Process-local copy of recently shown jobs, so details work even before the DB migration. */
  const recent = new Map<string, Job>();
  const remember = (jobs: Job[]) => {
    for (const job of jobs) {
      recent.delete(job.id);
      recent.set(job.id, job);
    }
    while (recent.size > 3000) recent.delete(recent.keys().next().value!);
  };

  async function cached(key: string, loader: () => Promise<Job[]>): Promise<Job[]> {
    const hit = await admin
      .from("job_cache")
      .select("payload")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!hit.error && hit.data) {
      const parsed = z.array(jobSchema).safeParse(hit.data.payload);
      if (parsed.success) return parsed.data;
    }
    const pending = inflight.get(key);
    if (pending) return pending;
    const promise = (async () => {
      const value = await loader();
      // Cache write failures must not hide results.
      await admin
        .from("job_cache")
        .upsert({ key, payload: value, expires_at: new Date(Date.now() + CACHE_TTL).toISOString() });
      return value;
    })();
    inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      inflight.delete(key);
    }
  }

  async function persist(jobs: Job[]): Promise<string | undefined> {
    if (!jobs.length) return undefined;
    const rows = jobs.map((data) => ({ id: data.id, data, updated_at: new Date().toISOString() }));
    const result = await admin.from("jobs").upsert(rows);
    if (!result.error) return undefined;
    if (result.error.code === "23514") {
      // Migration 202611070001 not applied yet: store what the old constraint allows.
      dbResult(await admin.from("jobs").upsert(rows.filter((r) => LEGACY_ID.test(r.id))));
      return "jobs.migrationRequired";
    }
    dbResult(result);
    return undefined;
  }

  return {
    async search(filters: SearchFilters, context: SearchContext = {}): Promise<JobsResponse> {
      const profile = context.profile;
      const place = resolveLocation(filters.city, filters.country);
      const home = resolveLocation(profile?.city ?? "", profile?.country ?? "").country || filters.country;
      const keyword = filters.keyword.trim();
      const query: ProviderQuery = {
        keyword,
        keywordEn: englishKeyword(keyword),
        city: place.city || filters.city.trim(),
        cityEn: place.cityEn,
        country: filters.country,
        home,
        region: place.region,
        userIp: context.userIp ?? "",
        userAgent: context.userAgent ?? "",
      };
      const plan = planSources(filters, config);
      const outcomes = await Promise.all(
        plan.map(async (entry) => {
          if (entry.status !== "run") return { source: entry.id, status: entry.status, jobs: [] as Job[] };
          try {
            let jobs: Job[];
            if (entry.id === "hh") {
              const area = await hh.areaId(query.city, filters.country);
              jobs = (await hh.search({ ...filters, area, page: 0 }, 50)).jobs;
            } else {
              const provider = entry.provider!;
              const key = `${provider.id}:v5:${hash(
                JSON.stringify([query.keyword, query.city, query.country, query.home, query.region]),
              )}`;
              jobs = await cached(key, () => provider.search(query, fetcher, config));
            }
            return { source: entry.id, status: "ok" as const, jobs };
          } catch {
            return { source: entry.id, status: "unavailable" as const, jobs: [] as Job[] };
          }
        }),
      );
      const ranked = rankJobs(deduplicate(outcomes.flatMap((o) => o.jobs)), {
        keyword,
        city: query.city,
        country: filters.country,
        skills: splitSkills(profile?.skills ?? ""),
        beginner: isBeginner(profile),
      });
      const page = filters.page || 0;
      const jobs = ranked.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      remember(jobs);
      const notice = await persist(jobs);
      return {
        jobs,
        total: ranked.length,
        page,
        pages: Math.ceil(ranked.length / PAGE_SIZE),
        sampled: true,
        sources: outcomes.map(({ source, status, jobs }) => ({ source, status, count: jobs.length })),
        matchedLocation: { city: query.city, country: filters.country },
        notice,
      };
    },
    /** Make sure a job exists in the jobs table (for bookmarks). False if the DB rejects it. */
    async store(id: string): Promise<boolean> {
      const job = await this.detail(id).catch(() => null);
      if (!job) return false;
      return (await persist([job])) === undefined;
    },
    async detail(id: string): Promise<Job> {
      jobIdSchema.parse(id);
      if (id.startsWith("hh-")) return hh.detail(id);
      const row = dbResult(await admin.from("jobs").select("data").eq("id", id).maybeSingle());
      if (row) return jobSchema.parse(row.data);
      const local = recent.get(id);
      if (local) return local;
      throw new HttpError(404, "jobs.notFound");
    },
  };
}
