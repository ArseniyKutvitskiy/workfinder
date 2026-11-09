import {z} from 'zod';
import {jobSchema,jobsResponseSchema} from '../../shared/schemas.ts';
import type {Database} from '../../shared/database.types.ts';
import type { Config } from "../config.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, SearchFilters, JobsResponse } from "../../shared/schemas.ts";
import { hhJobSchema, hhSearchSchema, type HHJob } from "./providerSchemas.ts";
import { createHash } from "node:crypto";
import { HttpError, dbResult } from "../errors.ts";
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
};
function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}
/**
 * Plain text from provider HTML. Some feeds (Arbeitnow) ship entity-encoded HTML
 * ("&lt;p&gt;…"), sometimes twice, so decode until stable before removing tags.
 * Output is rendered as React text, never as HTML.
 */
export const stripHtml = (value: unknown) => {
  let text = String(value || "");
  for (let i = 0; i < 3; i++) {
    const decoded = decodeEntities(text);
    if (decoded === text) break;
    text = decoded;
  }
  return decodeEntities(
    text
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n[\s]*/g, "\n")
    .trim();
};
export function normalizeJob(job: HHJob): Job {
  if (!/^\d+$/.test(String(job.id))) throw new HttpError(502, "jobs.failed");
  const salary = job.salary_range || job.salary;
  const url = new URL(job.alternate_url || `https://hh.ru/vacancy/${job.id}`);
  if (url.protocol !== "https:" || !/(^|\.)hh\.(ru|kz)$/.test(url.hostname))
    throw new HttpError(502, "jobs.failed");
  return {
    id: `hh-${job.id}`,
    title: String(job.name).slice(0, 300),
    company: job.employer?.name || "",
    initials: (job.employer?.name || "HH").slice(0, 2),
    color: "#246d58",
    location: job.area?.name || "",
    level: job.experience?.name || "",
    type: job.employment?.name || "",
    salary: salary
      ? `${salary.from ?? "…"}–${salary.to ?? "…"} ${salary.currency || ""}`
      : "Salary not listed",
    source: "HeadHunter",
    url: url.href,
    publishedAt: job.published_at || null,
    skills: (job.key_skills || []).map((s) => s.name).slice(0, 30),
    description: stripHtml(
      job.description ||
        `${job.snippet?.requirement || ""} ${job.snippet?.responsibility || ""}`,
    ).slice(0, 18000),
    score: null,
    matched: [],
    missing: [],
  };
}
/** hh.ru area ids for whole countries (cities are resolved via /areas). */
export const HH_COUNTRY_AREAS: Record<string, string> = {
  KZ: "40",
  RU: "113",
  UZ: "97",
  KG: "48",
  BY: "16",
  AZ: "9",
  GE: "28",
  AM: "13",
  TJ: "86",
};
export function searchParams(
  f: SearchFilters & { area?: string },
  perPage = 12,
) {
  const p = new URLSearchParams({
    per_page: String(perPage),
    page: String(f.page),
    order_by: "relevance",
  });
  if (f.keyword) p.set("text", f.keyword);
  const area = f.area || HH_COUNTRY_AREAS[f.country];
  if (area) p.set("area", area);
  if (f.level)
    p.set(
      "experience",
      {
        "No experience": "noExperience",
        "Entry level": "between1And3",
        Experienced: "between3And6",
      }[f.level],
    );
  if (f.remote)
    p.set("work_format", f.remote === "remote" ? "REMOTE" : "ON_SITE");
  if (f.roleType) p.set("employment", f.roleType);
  if (f.salary) {
    p.set("salary", String(f.salary));
    p.set("currency", f.currency);
    p.set("only_with_salary", "true");
  }
  return p;
}
export function createJobService(
  config: Config,
  admin: SupabaseClient<Database>,
  fetcher: typeof fetch = fetch,
) {
  const inflight = new Map<string, Promise<unknown>>();
  async function remote(path: string): Promise<unknown> {
    const response = await fetcher(`https://api.hh.ru/${path}`, {
      headers: {
        "User-Agent": config.HH_USER_AGENT,
        "HH-User-Agent": config.HH_USER_AGENT,
        ...(config.HH_ACCESS_TOKEN
          ? { Authorization: `Bearer ${config.HH_ACCESS_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403)
      throw new HttpError(503, "jobs.accessDenied");
    if (!response.ok)
      throw new HttpError(
        response.status === 429 ? 429 : 502,
        response.status === 429 ? "rate.limit" : "jobs.failed",
      );
    return response.json();
  }
  async function cache<T>(
    key: string,
    ttl: number,
    schema:z.ZodType<T>,
    loader: () => Promise<T>,
  ): Promise<T> {
    const hit = dbResult(
      await admin
        .from("job_cache")
        .select("payload")
        .eq("key", key)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
    );
    if (hit) return schema.parse(hit.payload);
    if (inflight.has(key)) return inflight.get(key) as Promise<T>;
    const request = (async () => {
      const value = await loader();
      dbResult(
        await admin
          .from("job_cache")
          .upsert({
            key,
            payload: z.json().parse(value),
            expires_at: new Date(Date.now() + ttl).toISOString(),
          }),
      );
      return value;
    })();
    inflight.set(key, request);
    try {
      return await request;
    } finally {
      inflight.delete(key);
    }
  }
  type AreaNode = { id: string; name: string; areas?: AreaNode[] };
  const areaIndexes = new Map<string, { at: number; index: Promise<Map<string, string>> }>();
  function areaIndex(countryArea: string) {
    const hit = areaIndexes.get(countryArea);
    if (hit && Date.now() - hit.at < 86_400_000) return hit.index;
    const index = (async () => {
      const response = await fetcher(`https://api.hh.ru/areas/${countryArea}`, {
        headers: {
          "User-Agent": config.HH_USER_AGENT,
          "HH-User-Agent": config.HH_USER_AGENT,
        },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (!response.ok) throw new HttpError(502, "jobs.failed");
      const map = new Map<string, string>();
      const walk = (node: AreaNode) => {
        map.set(node.name.toLocaleLowerCase().replace(/ё/g, "е"), node.id);
        for (const child of node.areas ?? []) walk(child);
      };
      walk((await response.json()) as AreaNode);
      return map;
    })();
    index.catch(() => areaIndexes.delete(countryArea));
    areaIndexes.set(countryArea, { at: Date.now(), index });
    return index;
  }
  return {
    async search(
      filters: SearchFilters & { area?: string },
      perPage = 12,
    ): Promise<JobsResponse> {
      const params = searchParams(filters, perPage);
      return cache(
        `search:${createHash("sha256").update(params.toString()).digest("hex")}`,
        300000,
        jobsResponseSchema,
        async () => {
          const response = hhSearchSchema.parse(
            await remote(`vacancies?${params}`),
          );
          if (!Array.isArray(response.items))
            throw new HttpError(502, "jobs.failed");
          const jobs = response.items.map(normalizeJob);
          if (jobs.length)
            dbResult(
              await admin
                .from("jobs")
                .upsert(
                  jobs.map((data) => ({
                    id: data.id,
                    data,
                    updated_at: new Date().toISOString(),
                  })),
                ),
            );
          return {
            jobs,
            total: response.found,
            page: filters.page,
            pages: Math.min(response.pages, 100),
          };
        },
      );
    },
    /** City name → hh area id via the public /areas tree (cached for a day). */
    async areaId(city: string, country: string): Promise<string> {
      const fallback = HH_COUNTRY_AREAS[country] ?? "";
      const key = city.trim().toLocaleLowerCase().replace(/ё/g, "е");
      if (!key || !fallback) return fallback;
      try {
        const index = await areaIndex(fallback);
        return index.get(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    async detail(id: string): Promise<Job> {
      if (!/^hh-\d{1,16}$/.test(id))
        throw new HttpError(400, "request.invalid");
      return cache(`detail:${id}`, 900000, jobSchema, async () => {
        const job = normalizeJob(
          hhJobSchema.parse(await remote(`vacancies/${id.slice(3)}`)),
        );
        dbResult(
          await admin
            .from("jobs")
            .upsert({ id, data: job, updated_at: new Date().toISOString() }),
        );
        return job;
      });
    },
  };
}
