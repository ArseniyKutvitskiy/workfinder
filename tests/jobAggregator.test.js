import test from "node:test";
import assert from "node:assert/strict";
import {
  createJobService,
  normalizeArbeitnow,
  normalizeJooble,
  deduplicate,
  planSources,
  rankJobs,
} from "../server/services/jobAggregator.ts";
import { openToHome, englishKeyword, makeJob } from "../server/services/providers.ts";
import { searchSchema, jobIdSchema, profileReadiness, emptyProfile } from "../shared/schemas.ts";
import { resolveLocation } from "../shared/geo.ts";

const raw = {
  slug: "developer-123",
  title: "Junior Developer",
  company_name: "Example",
  url: "https://www.arbeitnow.com/jobs/developer-123",
  location: "Berlin",
  remote: true,
  description: "<p>JavaScript</p>",
  tags: ["React"],
  created_at: 1700000000,
};

/** In-memory Supabase double; `strictIds` mimics the pre-migration constraint. */
function database({ strictIds = false } = {}) {
  const rows = new Map();
  return {
    rows,
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq(_k, value) {
          q.key = value;
          return q;
        },
        gt() {
          return q;
        },
        async maybeSingle() {
          return {
            data: table === "jobs" && rows.has(q.key) ? { data: rows.get(q.key) } : null,
            error: null,
          };
        },
        async upsert(data) {
          if (table !== "jobs") return { error: null };
          const list = Array.isArray(data) ? data : [data];
          if (strictIds && list.some((r) => !/^(hh-\d+|arbeitnow-|jooble-)/.test(r.id)))
            return { error: { code: "23514" } };
          for (const row of list) rows.set(row.id, row.data);
          return { error: null };
        },
      };
      return q;
    },
  };
}
const json = (body) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

test("provider IDs are stable and URLs cannot execute scripts or impersonate a provider", () => {
  const job = normalizeArbeitnow(raw);
  assert.equal(job.id, normalizeArbeitnow(raw).id);
  jobIdSchema.parse(job.id);
  assert.equal(job.description, "JavaScript");
  assert.throws(() => normalizeArbeitnow({ ...raw, url: "https://arbeitnow.com.evil.test/job" }));
  assert.throws(() => normalizeJooble({ id: "1", title: "job", company: "x", link: "javascript:alert(1)", location: "", snippet: "" }));
  assert.throws(() => jobIdSchema.parse("arbeitnow-../../secrets"));
  jobIdSchema.parse(makeJob("trudvsem", "abc", { title: "t", company: "c", url: "https://trudvsem.ru/x", location: "", description: "" }).id);
});

test("locations resolve to canonical city, country and region", () => {
  assert.deepEqual(resolveLocation("алма-ата").country, "KZ");
  assert.equal(resolveLocation("Алматы, Казахстан").city, "Алматы");
  assert.equal(resolveLocation("Москва").region, "7700000000000");
  assert.equal(resolveLocation("Караганда", "").cityEn, "Karaganda");
  assert.equal(resolveLocation("Unknown Town", "Россия").country, "RU");
});

test("resume readiness needs name, city, role, skills and studies or experience", () => {
  assert.equal(profileReadiness(emptyProfile).ready, false);
  const ready = { ...emptyProfile, name: "Анна", city: "Алматы", occupation: "SMM", skills: "Canva", experience: "Пока нет опыта" };
  assert.equal(profileReadiness(ready).ready, true);
  assert.deepEqual(profileReadiness({ ...ready, experience: "" }).missing, ["education"]);
});

test("remote jobs are kept only when open to the student's country", () => {
  assert.equal(openToHome("USA", "KZ"), false);
  assert.equal(openToHome("Worldwide", "KZ"), true);
  assert.equal(openToHome([], "RU"), true);
  assert.equal(openToHome(["Russia", "Ukraine"], "RU"), true);
  assert.equal(openToHome(["United States"], "RU"), false);
  assert.equal(englishKeyword("Frontend разработчик"), "developer frontend");
  assert.equal(englishKeyword("python developer"), "python developer");
});

test("source plan follows the market: KZ → hh/Jooble/Careerjet + remote; RU adds Работа России", () => {
  const ids = (filters, config = {}) => planSources(searchSchema.parse(filters), config);
  const kz = ids({ country: "KZ" });
  assert.ok(kz.some((p) => p.id === "hh" && p.status === "notConfigured"));
  assert.ok(kz.some((p) => p.id === "remotive" && p.status === "run"));
  assert.ok(!kz.some((p) => p.id === "trudvsem"));
  assert.ok(ids({ country: "RU" }).some((p) => p.id === "trudvsem" && p.status === "run"));
  assert.ok(ids({ country: "" }).every((p) => p.provider?.remoteOnly));
  assert.ok(!ids({ country: "KZ", remote: "onsite" }).some((p) => p.provider?.remoteOnly));
  assert.ok(ids({ country: "KZ" }, { JOOBLE_API_KEY: "k" }).some((p) => p.id === "jooble" && p.status === "run"));
  assert.ok(ids({ country: "KZ", salary: 100 }).some((p) => p.id === "remotive" && p.status === "unsupportedFilters"));
});

test("ranking puts the student's role, skills and city first", () => {
  const base = { company: "Co", url: "https://trudvsem.ru/a", description: "", publishedAt: new Date().toISOString() };
  const jobs = [
    makeJob("trudvsem", 1, { ...base, title: "Бухгалтер", location: "Москва", url: "https://trudvsem.ru/1" }),
    makeJob("trudvsem", 2, { ...base, title: "Frontend разработчик", location: "Казань", url: "https://trudvsem.ru/2" }),
    makeJob("trudvsem", 3, { ...base, title: "Frontend разработчик", location: "Москва", description: "React, TypeScript", url: "https://trudvsem.ru/3" }),
  ];
  const ranked = rankJobs(jobs, { keyword: "Frontend разработчик", city: "Москва", country: "RU", skills: ["React"] });
  assert.equal(ranked[0].url, "https://trudvsem.ru/3");
  assert.equal(ranked.at(-1).url, "https://trudvsem.ru/1");
  assert.equal(deduplicate([jobs[1], { ...jobs[1], id: "trudvsem-" + "0".repeat(32) }]).length, 1);
});

test("aggregates several sources, survives a failing one, paginates and keeps details before the DB migration", async () => {
  const db = database({ strictIds: true });
  const remotive = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    url: `https://remotive.com/remote-jobs/${i}`,
    title: i % 2 ? "React Developer" : "Sales manager",
    company_name: `Company ${i}`,
    candidate_required_location: i === 0 ? "USA" : "Worldwide",
    publication_date: "2026-11-01T00:00:00",
  }));
  const service = createJobService({ HH_USER_AGENT: "test" }, db, async (url) => {
    if (url.includes("remotive")) return json({ jobs: remotive });
    if (url.includes("himalayas")) return new Response("down", { status: 500 });
    if (url.includes("remoteok")) return json([{ legal: "x" }]);
    if (url.includes("jobicy")) return json({ jobs: [] });
    if (url.includes("arbeitnow")) return json({ data: [raw] });
    return json({});
  });
  const context = {
    profile: { ...emptyProfile, city: "Алматы", country: "Казахстан", skills: "React" },
  };
  const first = await service.search(searchSchema.parse({ country: "KZ", keyword: "React" }), context);
  const status = (id) => first.sources.find((s) => s.source === id)?.status;
  assert.equal(status("himalayas"), "unavailable");
  assert.equal(status("remotive"), "ok");
  assert.equal(status("hh"), "notConfigured");
  assert.ok(first.jobs.every((j) => !j.title.includes("Company 0")));
  assert.match(first.jobs[0].title, /React/);
  assert.equal(first.notice, "jobs.migrationRequired");
  assert.equal(first.total, 20, "19 open remotive jobs + 1 remote arbeitnow job");
  const second = await service.search(searchSchema.parse({ country: "KZ", keyword: "React", page: 1 }), context);
  assert.ok(second.jobs.every((j) => !first.jobs.some((k) => k.id === j.id)));
  const detail = await service.detail(first.jobs[0].id);
  assert.equal(detail.title, first.jobs[0].title);
});

test("students without experience see entry-level roles before senior ones", () => {
  const base = { company: "Co", location: "Remote", description: "", publishedAt: new Date().toISOString(), remote: true };
  const jobs = [
    makeJob("remotive", 1, { ...base, title: "Senior React Developer", url: "https://remotive.com/1" }),
    makeJob("remotive", 2, { ...base, title: "Junior React Developer", url: "https://remotive.com/2" }),
  ];
  const ranked = rankJobs(jobs, { keyword: "React", city: "", country: "", skills: [], beginner: true });
  assert.match(ranked[0].title, /Junior/);
});

test("'no experience' answers are recognised in natural phrasing", async () => {
  const { isBeginner } = await import("../server/services/jobAggregator.ts");
  for (const text of ["", "Опыта работы пока нет", "пока нет", "No experience yet", "нет"]) assert.equal(isBeginner({ ...emptyProfile, experience: text }), true, text);
  for (const text of ["Стажировка в Kaspi, 3 месяца", "2 years as a frontend developer"]) assert.equal(isBeginner({ ...emptyProfile, experience: text }), false, text);
});

test("a source chosen outside its market is reported, not silently empty", () => {
  const plan = planSources(searchSchema.parse({ country: "", source: "hh" }), {});
  assert.deepEqual(plan.map((p) => [p.id, p.status]), [["hh", "unsupportedFilters"]]);
});

import { currencyFor, CIS_COUNTRIES } from "../shared/geo.ts";
import { HH_COUNTRY_AREAS, searchParams } from "../server/services/jobs.ts";
import { fallbackChat } from "../server/services/fallback.ts";
test("the whole CIS is a local market: cities, currencies, hh areas and sources", () => {
  assert.equal(resolveLocation("Ташкент").country, "UZ");
  assert.equal(resolveLocation("toshkent").cityEn, "Tashkent");
  assert.equal(resolveLocation("Бишкек, Кыргызстан").country, "KG");
  assert.equal(resolveLocation("Минск").country, "BY");
  assert.equal(resolveLocation("", "Грузия").country, "GE");
  assert.equal(currencyFor("UZ"), "UZS");
  assert.equal(currencyFor("AM"), "USD");
  for (const code of CIS_COUNTRIES) assert.ok(HH_COUNTRY_AREAS[code], code);
  assert.equal(searchParams(searchSchema.parse({ country: "BY", currency: "BYR" })).get("area"), "16");
  const uz = planSources(searchSchema.parse({ country: "UZ" }), {});
  assert.ok(uz.some((p) => p.id === "hh"));
  assert.ok(uz.some((p) => p.id === "jooble"));
  assert.ok(!uz.some((p) => p.id === "trudvsem"));
  assert.equal(openToHome("Central Asia", "UZ"), true);
  assert.equal(openToHome("Caucasus region", "GE"), true);
  assert.equal(openToHome("CIS", "BY"), true);
  assert.equal(openToHome("Germany", "BY"), false);
  const answer = fallbackChat({ ...emptyProfile, name: "Айбек" }, [{ role: "assistant", text: "В каком городе и стране вы хотите работать? Например: Алматы, Казахстан." }], "Бишкек", "ru");
  assert.equal(answer.profile.country, "Кыргызстан");
});

import { fixMojibake } from "../server/services/providers.ts";
test("broken feed encoding is repaired and role words like UX/UI count for ranking", () => {
  assert.equal(fixMojibake("Engineer â€” Lead"), "Engineer — Lead");
  assert.equal(fixMojibake("CafÃ© Manager"), "Café Manager");
  assert.equal(fixMojibake("Обычный текст — без проблем"), "Обычный текст — без проблем");
  const base = { company: "Co", location: "Remote", description: "", publishedAt: new Date().toISOString(), remote: true };
  const jobs = [
    makeJob("remotive", 1, { ...base, title: "ML Engineer — Task Designer", url: "https://remotive.com/1" }),
    makeJob("remotive", 2, { ...base, title: "UX/UI Designer", url: "https://remotive.com/2" }),
  ];
  const ranked = rankJobs(jobs, { keyword: "UX/UI-дизайнер", city: "", country: "", skills: [], beginner: true });
  assert.equal(ranked[0].title, "UX/UI Designer");
});
