import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import { HttpError } from "../server/errors.ts";
import {
  containsTerm,
  fallbackChat,
  heuristicMatch,
  templateLetter,
} from "../server/services/fallback.ts";
import {
  CircuitBreaker,
  classifyAiError,
} from "../server/services/resilience.ts";
import { translate } from "../shared/i18n.ts";
import { matchSchema, profileReadiness } from "../shared/schemas.ts";
import { emptyProfile } from "../src/resume.ts";

const config = {
  NODE_ENV: "test",
  PORT: 3000,
  APP_ORIGIN: "http://localhost:3000",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-test-key-123456789",
  SUPABASE_SERVICE_ROLE_KEY: "private-test-key-123456789",
  OPENAI_MODEL: "gpt-4o",
  HH_USER_AGENT: "WorkFinder test",
  TRUST_PROXY_HOPS: 0,
};
const job = {
  id: "hh-123",
  title: "Junior Developer",
  company: "Acme",
  description: "Build React apps with TypeScript and C++ tooling.",
  skills: ["React", "TypeScript", "Docker"],
};

test("config boots without an OpenAI key (offline AI mode) and ignores empty values", () => {
  const parsed = readConfig({ ...config, OPENAI_API_KEY: "", JOOBLE_API_KEY: "" });
  assert.equal(parsed.OPENAI_API_KEY, undefined);
  assert.equal(parsed.JOOBLE_API_KEY, undefined);
  assert.throws(() => readConfig({ ...config, OPENAI_API_KEY: "short" }));
});

test("term matching respects word boundaries and symbol-heavy skills", () => {
  assert.ok(containsTerm("I know C++ and Node.js", "c++"));
  assert.ok(containsTerm("Опыт: React, SQL", "react"));
  assert.ok(!containsTerm("good communication", "go"));
  assert.ok(!containsTerm("JavaScript", "Java"));
});

test("heuristic match is schema-valid, evidence-based and honest", () => {
  const profile = { ...emptyProfile, skills: "React, TypeScript, Figma" };
  const result = heuristicMatch(profile, job, "en");
  assert.deepEqual(result.matched, ["React", "TypeScript"]);
  assert.deepEqual(result.missing, ["Docker"]);
  assert.equal(result.score, 67);
  assert.match(result.explanation, /Offline keyword estimate/);
  matchSchema.parse(result);
  const empty = heuristicMatch(emptyProfile, { ...job, skills: [] }, "ru");
  assert.equal(empty.score, 0);
  matchSchema.parse(empty);
});

test("template letter uses only the student's own facts in the chosen language", () => {
  const profile = {
    ...emptyProfile,
    name: "Анна Иванова",
    skills: "React, SQL",
    education: "КазНУ, информатика",
  };
  const ru = templateLetter(profile, job, "ru");
  assert.match(ru, /Здравствуйте, команда Acme!/);
  assert.match(ru, /React, SQL/);
  assert.match(ru, /Анна Иванова$/);
  const en = templateLetter({ ...emptyProfile, skills: "Python" }, job, "en");
  assert.match(en, /Junior Developer/);
  assert.match(en, /\[Your name\]/);
  assert.ok(en.length < 15000);
});

test("guided-interview fallback files answers only under the question asked", () => {
  // Empty conversation: the UI's opening prompt asks for the name.
  const first = fallbackChat(emptyProfile, [], "Анна", "ru");
  assert.equal(first.profile.name, "Анна");
  assert.ok(first.reply.endsWith(translate("ru", "fallback.ask.city")));
  const history = [
    { role: "user", text: "Анна" },
    { role: "assistant", text: first.reply },
  ];
  // A known city also fills the country, so the next question is the field of work.
  const second = fallbackChat(first.profile, history, "Алматы", "ru");
  assert.equal(second.profile.city, "Алматы");
  assert.equal(second.profile.country, "Казахстан");
  assert.ok(second.reply.endsWith(translate("ru", "fallback.ask.occupation")));
  // After a free-form AI turn we do not guess which field the answer belongs to.
  const afterAi = fallbackChat(
    first.profile,
    [...history, { role: "assistant", text: "Tell me more about yourself!" }],
    "I like robots",
    "en",
  );
  assert.deepEqual(afterAi.profile, first.profile);
  assert.ok(afterAi.reply.startsWith(translate("en", "fallback.intro")));
});

test("circuit breaker opens on quota/outage errors, not on ordinary failures", () => {
  let now = 0;
  const breaker = new CircuitBreaker(1000, 500, () => now);
  assert.equal(classifyAiError({ status: 429 }), "ai.quota");
  assert.equal(classifyAiError({ name: "APIConnectionTimeoutError" }), "ai.unavailable");
  assert.equal(classifyAiError(new HttpError(502, "ai.failed")), "ai.failed");
  breaker.failure(new HttpError(502, "ai.failed"));
  assert.equal(breaker.isOpen, false);
  breaker.failure({ status: 429 });
  assert.equal(breaker.isOpen, true);
  now = 1001;
  assert.equal(breaker.isOpen, false);
  breaker.failure({ status: 503 });
  assert.equal(breaker.isOpen, false, "one outage is tolerated");
  breaker.failure({ name: "APIConnectionTimeoutError" });
  assert.equal(breaker.lastFailure, "ai.unavailable", "two in a row open it");
  breaker.success();
  assert.equal(breaker.isOpen, false);
});

function fixture(profile = emptyProfile, messages = []) {
  let resume = { user_id: "owner", profile: { ...profile }, messages: [...messages], version: 0 };
  const db = {
    from(table) {
      let update;
      const predicates = [];
      const query = {
        upsert: () => query,
        select: () => query,
        limit: () => query,
        eq(key, value) {
          predicates.push([key, value]);
          return query;
        },
        update(value) {
          update = value;
          return query;
        },
        then(resolve) {
          if (table !== "resumes")
            return Promise.resolve({ data: [], error: null }).then(resolve);
          const allowed = predicates.every(([k, v]) => resume[k] === v);
          if (allowed && update) resume = { ...resume, ...update };
          return Promise.resolve({
            data: allowed ? [{ ...resume }] : [],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
  };
  return {
    database: {
      admin: db,
      async limit() {},
      authenticate(req, _res, next) {
        req.user = { id: "owner" };
        req.db = db;
        next();
      },
    },
    jobs: { search: async () => ({ jobs: [], pages: 0, total: 0 }), detail: async () => job },
  };
}
async function serve(t, dependencies) {
  const server = createApp(config, dependencies).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  return (route, body) =>
    fetch(`${url}/api/${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
}
const doneEvent = (stream) =>
  JSON.parse(/event: done\ndata: (.+)/.exec(stream)?.[1] ?? "null");

test("without an AI provider every AI feature still works in labelled offline mode", async (t) => {
  const call = await serve(t, {
    ...fixture({ ...emptyProfile, name: "Anna", skills: "React" }),
    llm: null,
  });
  const health = await (await call("health")).json();
  assert.equal(health.ai, "fallback");
  const workspace = await (await call("workspace")).json();
  assert.equal(workspace.aiMode, "fallback");

  const chat = await (
    await call("chat", { profile: { ...emptyProfile, name: "Anna", skills: "React" }, version: 0, message: "Hi", language: "en" })
  ).text();
  const done = doneEvent(chat);
  assert.equal(done.fallback, true);
  assert.equal(done.version, 1);
  assert.equal(done.messages.length, 2);

  const match = await (await call("match", { jobId: "hh-123", language: "en" })).json();
  assert.equal(match.fallback, true);
  assert.deepEqual(match.matched, ["React"]);

  const letter = await (
    await call("cover-letter/stream", { jobId: "hh-123", language: "en" })
  ).text();
  const letterDone = doneEvent(letter);
  assert.equal(letterDone.fallback, true);
  assert.match(letterDone.letter, /Dear Acme hiring team/);
});

test("a provider quota error falls back instantly and skips the provider while cooling down", async (t) => {
  let calls = 0;
  const quota = Object.assign(new Error("quota"), { status: 429 });
  const call = await serve(t, {
    ...fixture({ ...emptyProfile, name: "Anna", skills: "React" }),
    llm: {
      async *letterStream() {
        calls++;
        throw quota;
      },
      async match() {
        calls++;
        throw quota;
      },
    },
  });
  const first = await (await call("cover-letter/stream", { jobId: "hh-123", language: "en" })).text();
  assert.ok(!first.includes("event: error"));
  assert.equal(doneEvent(first).fallback, true);
  const match = await (await call("match", { jobId: "hh-123", language: "en" })).json();
  assert.equal(match.fallback, true);
  assert.equal(calls, 1, "breaker must skip the provider after a quota error");
  assert.equal((await (await call("health")).json()).ai, "fallback");
});

import { stripHtml } from "../server/services/jobs.ts";
test("provider HTML, including entity-encoded HTML, becomes readable plain text", () => {
  const encoded =
    "&lt;div class=&quot;intro&quot;&gt;&lt;h3&gt;&lt;strong&gt;About Staffbase&lt;/strong&gt;&lt;/h3&gt;&lt;p&gt;We&amp;#39;re hiring&amp;nbsp;now.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Search&lt;/li&gt;&lt;/ul&gt;&lt;/div&gt;";
  const text = stripHtml(encoded);
  assert.ok(!/[<>]|&[a-z#]+;/i.test(text), text);
  assert.match(text, /About Staffbase/);
  assert.match(text, /We're hiring now\./);
  assert.match(text, /• Search/);
  assert.equal(stripHtml("<p>Build <b>React</b> apps</p>"), "Build React apps");
  assert.equal(stripHtml("<script>alert(1)</script>Safe"), "Safe");
});

import { zodTextFormat } from "openai/helpers/zod";
import { aiProfileSchema, aiMatchSchema, clampMatch, clampProfile } from "../shared/schemas.ts";
test("schemas sent to OpenAI use only keywords strict structured output accepts", () => {
  for (const [name, schema] of [["resume", aiProfileSchema], ["match", aiMatchSchema]]) {
    const json = JSON.stringify(zodTextFormat(schema, name).schema);
    assert.ok(!/"(maxLength|minLength)"/.test(json), name);
  }
  const match = clampMatch({ score: 140.4, matched: Array(30).fill("x".repeat(300)), missing: [], explanation: "ok" });
  assert.equal(match.score, 100);
  assert.equal(match.matched.length, 20);
  assert.equal(match.matched[0].length, 120);
  assert.equal(clampProfile({ ...emptyProfile, city: "a".repeat(500) }).city.length, 120);
});

import { resumeExportable, resumeFileName } from "../shared/schemas.ts";
test("empty resumes cannot be exported and files are named after the student", () => {
  assert.equal(resumeExportable(emptyProfile), false);
  assert.equal(resumeExportable({ ...emptyProfile, name: "Анна" }), false);
  assert.equal(resumeExportable({ ...emptyProfile, name: "Анна", skills: "Figma" }), true);
  assert.equal(resumeFileName("Анна Иванова", "ru"), "Анна_Иванова_резюме");
  assert.equal(resumeFileName('A/B: "x"', "en"), "AB_x_resume");
  assert.equal(resumeFileName("", "ru"), "workfinder_резюме");
});

test("the resume is updated before the reply, so the assistant knows it just became ready", async (t) => {
  const seen = [];
  const order = [];
  const ready = { ...emptyProfile, name: "Арсений", city: "Алматы", country: "Казахстан", occupation: "Frontend", education: "Школа", skills: "JavaScript" };
  const call = await serve(t, {
    ...fixture({ ...ready, skills: "" }),
    llm: {
      async parse() {
        order.push("parse");
        return ready;
      },
      async *chat(args) {
        order.push("chat");
        seen.push(args);
        yield "Резюме готово!";
      },
    },
  });
  const stream = await (
    await call("chat", { profile: { ...ready, skills: "" }, version: 0, message: "JavaScript", language: "ru" })
  ).text();
  assert.deepEqual(order, ["parse", "chat"]);
  assert.equal(seen[0].justReady, true);
  assert.equal(seen[0].profile.skills, "JavaScript");
  assert.equal(doneEvent(stream).profile.skills, "JavaScript");
});

test("chat messages and match/letter calls use separate, generous AI budgets", async (t) => {
  const calls = [];
  const deps = fixture({ ...emptyProfile, name: "Anna", skills: "React" });
  deps.database.limit = async (_user, category, max, seconds, errorKey) => {
    calls.push([category, max, seconds, errorKey]);
  };
  const call = await serve(t, { ...deps, llm: null });
  await (await call("chat", { profile: emptyProfile, version: 0, message: "Hi", language: "en" })).text();
  await call("match", { jobId: "hh-123", language: "en" });
  assert.deepEqual(calls.slice(0, 2), [
    ["ai-chat-hour", 60, 3600, "ai.limitHour"],
    ["ai-chat-day", 300, 86400, "ai.limitDay"],
  ]);
  assert.deepEqual(calls.slice(2, 4).map((c) => c[0]), ["ai-tools-hour", "ai-tools-day"]);
});

test("compose → draft in chat → publish copies the draft into the resume", async (t) => {
  const facts = { ...emptyProfile, name: "Арсений", city: "Алматы", country: "Казахстан", occupation: "веб-разработчик", education: "Школа", skills: "React" };
  const polished = { ...facts, occupation: "Junior веб-разработчик", summary: "Начинающий веб-разработчик.", skills: "React, Claude Code" };
  let composed = 0;
  const call = await serve(t, {
    ...fixture(facts),
    llm: {
      async parse(p) { return { profile: p, action: "answer" }; },
      async compose(_p, _m, previous) { composed++; return { message: previous ? "Исправил" : "Вот черновик", draft: polished }; },
      async *chat() { yield "?"; },
    },
  });
  const first = doneEvent(await (await call("chat", { profile: facts, version: 0, message: "Составить резюме", language: "ru", action: "compose" })).text());
  assert.equal(composed, 1);
  assert.equal(first.messages.at(-1).draft.occupation, "Junior веб-разработчик");
  assert.equal(first.profile.occupation, "веб-разработчик", "facts stay until publication");
  const published = doneEvent(await (await call("chat", { profile: facts, version: first.version, message: "Опубликовать", language: "ru", action: "publish" })).text());
  assert.equal(published.messages.at(-1).published, true);
  assert.equal(published.profile.summary, "Начинающий веб-разработчик.");
  assert.equal(published.profile.occupation, "Junior веб-разработчик");
});

test("offline: typed 'составь резюме' composes from facts and only one draft is kept", async (t) => {
  const facts = { ...emptyProfile, name: "Анна", city: "Ташкент", country: "Узбекистан", occupation: "бухгалтер", education: "ТГЭУ, 3 курс", experience: "Опыта пока нет", skills: "Excel, 1С" };
  const call = await serve(t, { ...fixture(facts), llm: null });
  const one = doneEvent(await (await call("chat", { profile: facts, version: 0, message: "Составь резюме", language: "ru" })).text());
  assert.match(one.messages.at(-1).draft.education, /^• ТГЭУ/);
  assert.match(one.messages.at(-1).draft.summary, /бухгалтер/);
  const two = doneEvent(await (await call("chat", { profile: facts, version: one.version, message: "Составь резюме заново", language: "ru" })).text());
  assert.equal(two.messages.filter((m) => m.draft).length, 1);
  const pub = doneEvent(await (await call("chat", { profile: facts, version: two.version, message: "опубликуй", language: "ru" })).text());
  assert.equal(pub.messages.at(-1).published, true);
});

import { guessAction } from "../server/services/fallback.ts";
test("offline intent detection for compose / revise / publish", () => {
  assert.equal(guessAction("Составь мне резюме", false), "compose");
  assert.equal(guessAction("поменяй навыки", true), "revise");
  assert.equal(guessAction("поменяй навыки", false), "answer");
  assert.equal(guessAction("Опубликуй", true), "publish");
  assert.equal(guessAction("Алматы", false), "answer");
});

test("the interview runs to 100% (skips count) and the resume is composed right after the last answer", async (t) => {
  const almost = { ...emptyProfile, name: "Анна", city: "Ташкент", country: "Узбекистан", occupation: "юрист", education: "ТГЮУ, 2 курс", experience: "Стажировка в нотариальной конторе", skills: "Договоры, Word", projects: "-", goals: "Подработка" };
  assert.equal(profileReadiness(almost).ready, true);
  assert.equal(profileReadiness(almost).complete, false, "contact not answered yet");
  assert.equal(profileReadiness({ ...almost, contact: "-" }).percent, 100);
  // Offline: "нет" to the last optional question is a skip → 100% → compose immediately.
  const history = [{ role: "assistant", text: translate("ru", "fallback.ask.contact") }];
  const call = await serve(t, { ...fixture(almost, history), llm: null });
  const done = doneEvent(await (await call("chat", { profile: almost, version: 0, message: "нет, не хочу указывать", language: "ru" })).text());
  const last = done.messages.at(-1);
  assert.ok(last.draft, "draft composed automatically");
  assert.equal(last.draft.projects, "", "skipped section is not in the resume");
  assert.equal(last.draft.contact, "");
});

import { keepSkipsHonest } from "../server/app.ts";
test("only the step being asked can be marked as skipped", () => {
  const before = { ...emptyProfile, name: "Дана", city: "", country: "" };
  const after = { ...before, city: "Астана", country: "Казахстан", projects: "-", goals: "-", contact: "-" };
  const fixed = keepSkipsHonest(before, after);
  assert.equal(fixed.city, "Астана");
  assert.equal(fixed.projects, "", "projects was not asked yet");
  assert.equal(fixed.contact, "");
  const askingContact = { ...emptyProfile, name: "Дана", city: "Астана", country: "Казахстан", occupation: "юрист", education: "КазГЮУ", experience: "Практика", skills: "Word", projects: "-", goals: "Стажировка" };
  assert.equal(keepSkipsHonest(askingContact, { ...askingContact, contact: "-" }).contact, "-");
});
