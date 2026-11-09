import test from "node:test";
import assert from "node:assert/strict";
import { searchSchema, profileSchema, chatSchema } from "../shared/schemas.ts";
import { readConfig } from "../server/config.ts";
import { createApp } from "../server/app.ts";
import { HttpError } from "../server/errors.ts";
import { normalizeJob, searchParams } from "../server/services/jobs.ts";
import { renderResume } from "../server/services/pdf.ts";
import { emptyProfile, htmlResume, markdown } from "../src/resume.ts";
import { translate, readLanguage } from "../shared/i18n.ts";
const config = {
  NODE_ENV: "test",
  PORT: 3000,
  APP_ORIGIN: "http://localhost:3000",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-test-key-123456789",
  SUPABASE_SERVICE_ROLE_KEY: "private-test-key-123456789",
  OPENAI_API_KEY: "not-a-real-key-123456789",
  OPENAI_MODEL: "gpt-4o",
  HH_USER_AGENT: "WorkFinder test",
  TRUST_PROXY_HOPS: 0,
};

test("configuration fails safely and requires HTTPS for production", () => {
  assert.throws(() => readConfig({}), /SUPABASE_URL/);
  assert.throws(
    () => readConfig({ ...config, NODE_ENV: "production" }),
    /HTTPS/,
  );
  assert.equal(readConfig(config).OPENAI_MODEL, "gpt-4o");
});
test("schemas reject owner injection, excessive input, and unbounded pagination", () => {
  assert.throws(() =>
    profileSchema.parse({ ...emptyProfile, user_id: "victim" }),
  );
  assert.throws(() =>
    chatSchema.parse({
      profile: emptyProfile,
      version: 0,
      message: "x".repeat(5001),
    }),
  );
  assert.throws(() => searchSchema.parse({ page: 100 }));
  assert.throws(() => searchSchema.parse({ salary: -1 }));
});
test("job normalization strips HTML and rejects arbitrary external links", () => {
  const source = {
    id: "123",
    name: "Developer",
    employer: { name: "Acme" },
    description: "<p>Build <b>React</b> apps</p>",
    alternate_url: "https://hh.kz/vacancy/123",
  };
  const job = normalizeJob(source);
  assert.equal(job.id, "hh-123");
  assert.equal(job.description, "Build React apps");
  assert.equal(job.score, null);
  assert.throws(() =>
    normalizeJob({ ...source, alternate_url: "javascript:alert(1)" }),
  );
  const filters = searchSchema.parse({
    country: "KZ",
    city: "Астана",
    remote: "remote",
    salary: 250000,
    roleType: "part",
  });
  assert.equal(searchParams(filters).get("area"), "40", "country-wide without a resolved city");
  const params = searchParams({ ...filters, area: "159" });
  assert.equal(params.get("area"), "159");
  assert.equal(params.get("work_format"), "REMOTE");
  assert.equal(params.get("salary"), "250000");
  assert.equal(params.get("per_page"), "12");
});
test("PDF embeds a Unicode font and supports long Cyrillic resumes", async () => {
  const pdf = await renderResume(
    {
      ...emptyProfile,
      name: "Анна Иванова",
      education: "Университет",
      skills: "React, JavaScript",
      projects: "Проект\n".repeat(250),
    },
    "ru",
  );
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.match(pdf.toString("latin1"), /\/FontFile2/);
  const pages = [...pdf.toString("latin1").matchAll(/\/Type \/Page\b/g)];
  assert.ok(pages.length > 1, "Long resumes must continue across pages");
});
test("EN/RU localization and exports preserve user input safely", () => {
  assert.equal(readLanguage({ getItem: () => null }), "ru");
  assert.equal(translate("ru", "jobs.count", { count: 22 }), "22 вакансии");
  assert.equal(translate("en", "jobs.count", { count: 1 }), "1 opportunity");
  assert.equal(translate("ru", "constructor"), "constructor");
  const profile = {
    ...emptyProfile,
    name: "<script>Анна</script>",
    skills: "React",
  };
  assert.match(htmlResume(profile, "ru"), /lang="ru"/);
  assert.ok(!htmlResume(profile, "ru").includes("<script>"));
  assert.match(markdown(profile, "en"), /## Skills/);
});

// Test doubles are confined to tests; production has no mock fallback.
function fixture(profile = emptyProfile) {
  let resume = {
    user_id: "owner",
    profile: { ...profile },
    messages: [],
    version: 0,
  };
  const db = {
    from(table) {
      let update,
        predicates = [];
      const query = {
        upsert() { return query; },
        select() {
          return query;
        },
        limit() {
          return query;
        },
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
  const database = {
    admin: db,
    async limit() {},
    authenticate(req, _res, next) {
      if (req.headers.authorization !== "Bearer test")
        return next(new HttpError(401, "auth.required"));
      req.user = { id: "owner" };
      req.db = db;
      next();
    },
  };
  const llm = {
    async *chat() {
      yield "Привет";
      yield ", Анна!";
    },
    async parse() {
      return { ...emptyProfile, name: "Анна" };
    },
  };
  return {
    database,
    llm,
    jobs: { search: async () => ({ jobs: [], pages: 0, total: 0 }) },
  };
}
test("API enforces auth and origin checks, validates inputs, and streams an atomic update", async (t) => {
  const server = createApp(config, fixture()).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (route, data, headers = {}) =>
    fetch(`${url}/api/${route}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });
  assert.equal((await fetch(`${url}/api/workspace`)).status, 401);
  assert.equal(
    (await post("jobs", {}, { Origin: "https://evil.example" })).status,
    403,
  );
  assert.equal((await post("jobs", { page: 999 })).status, 400);
  const publicConfig = await (await fetch(`${url}/api/config`)).text();
  assert.ok(!publicConfig.includes(config.SUPABASE_SERVICE_ROLE_KEY));
  const result = await post("chat", {
    profile: emptyProfile,
    version: 0,
    language: "ru",
    message: "Анна",
  });
  assert.match(result.headers.get("content-type"), /text\/event-stream/);
  const stream = await result.text();
  assert.match(stream, /event: delta/);
  assert.match(stream, /Привет/);
  assert.match(stream, /event: done/);
  assert.match(stream, /"version":1/);
  assert.equal(
    (
      await post("chat", {
        profile: emptyProfile,
        version: 0,
        message: "stale",
      })
    ).status,
    409,
  );
  const workspace = await (
    await fetch(`${url}/api/workspace`, {
      headers: { Authorization: "Bearer test" },
    })
  ).json();
  assert.equal(workspace.profile.name, "Анна");
  assert.equal(workspace.messages.length, 2);
});
test("AI failures emit safe SSE errors without committing partial responses", async (t) => {
  const dependencies = fixture();
  dependencies.llm.chat = async function* () {
    yield "partial";
    throw new Error("secret upstream detail");
  };
  const server = createApp(config, dependencies).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile: emptyProfile,
      version: 0,
      message: "Hello",
    }),
  });
  const text = await response.text();
  assert.match(text, /event: error/);
  assert.ok(!text.includes("secret upstream"));
  assert.ok(!text.includes("event: done"));
  const workspace = await (
    await fetch(`${url}/api/workspace`, {
      headers: { Authorization: "Bearer test" },
    })
  ).json();
  assert.equal(workspace.version, 0);
  assert.equal(workspace.messages.length, 0);
});


test('Cover-letter stream commits only a complete response',async t=>{
 const dependencies=fixture({...emptyProfile,name:'Anna',skills:'React'});
 dependencies.jobs.detail=async()=>({id:'hh-123',title:'Developer',description:'React'});
 dependencies.llm.letterStream=async function*(){yield 'Dear ';yield 'team';};
 const server=createApp(config,dependencies).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const send=()=>fetch('http://127.0.0.1:'+server.address().port+'/api/cover-letter/stream',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({jobId:'hh-123',language:'en'})});
 const result=await (await send()).text();assert.match(result,/event: delta/);assert.match(result,/event: done/);assert.match(result,/Dear team/);
 dependencies.llm.letterStream=async function*(){yield 'partial';throw Error('provider-secret');};
 const failure=await (await send()).text();assert.match(failure,/event: error/);assert.ok(!failure.includes('event: done'));assert.ok(!failure.includes('provider-secret'));
});
