import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.ts";

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

/** A fake database that records what the deletion touches. */
function fakeDatabase(log) {
  const table = (name) => ({
    delete: () => ({
      eq: async (column, value) => (log.push(["delete", name, column, value]), { data: null, error: null }),
      like: async (column, value) => (log.push(["delete-like", name, value]), { data: null, error: null }),
    }),
  });
  return {
    admin: {
      from: table,
      storage: {
        from: () => ({
          list: async (folder) => (log.push(["list", folder]), { data: [{ name: "ru-modern.pdf" }], error: null }),
          remove: async (paths) => (log.push(["remove", ...paths]), { data: [], error: null }),
        }),
      },
      auth: { admin: { deleteUser: async (id) => (log.push(["deleteUser", id]), { error: null }) } },
    },
    authenticate(req, _res, next) {
      req.user = { id: "user-1" };
      next();
    },
    limit: async (...args) => log.push(["limit", args[1]]),
  };
}

test("account deletion removes files, rows and the sign-in record of the caller only", async (t) => {
  const log = [];
  const server = createApp(config, { database: fakeDatabase(log), llm: null }).listen(0);
  t.after(() => server.close());
  await new Promise((r) => server.once("listening", r));
  const call = (body) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/account/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  // An explicit confirmation is required.
  assert.equal((await call({})).status, 400);
  assert.equal(log.some((e) => e[0] === "deleteUser"), false);

  const done = await call({ confirm: true });
  assert.equal(done.status, 200);
  assert.deepEqual(await done.json(), { deleted: true });
  assert.deepEqual(log.find((e) => e[0] === "remove"), ["remove", "user-1/ru-modern.pdf"]);
  const tables = log.filter((e) => e[0] === "delete").map((e) => e[1]);
  assert.deepEqual(tables, ["cover_letters", "saved_jobs", "resumes", "profiles"]);
  assert.ok(log.filter((e) => e[0] === "delete").every((e) => e[2] === "user_id" && e[3] === "user-1"));
  assert.deepEqual(log.at(-1), ["deleteUser", "user-1"]);
});
