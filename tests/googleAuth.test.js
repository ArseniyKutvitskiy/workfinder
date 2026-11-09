import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.ts";

const base = {
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
const google = {
  GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-secret-123456",
};

async function withServer(config, run) {
  const server = createApp(config).listen(0);
  await new Promise((r) => server.once("listening", r));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}
const post = (url, body) =>
  fetch(url + "/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("config exposes the Google client ID only when the secret is set too", async () => {
  await withServer({ ...base, GOOGLE_CLIENT_ID: google.GOOGLE_CLIENT_ID }, async (url) => {
    assert.equal("googleClientId" in (await (await fetch(url + "/api/config")).json()), false);
  });
  await withServer({ ...base, ...google }, async (url) => {
    assert.equal((await (await fetch(url + "/api/config")).json()).googleClientId, google.GOOGLE_CLIENT_ID);
  });
});

test("code exchange is disabled without Google credentials", async () => {
  await withServer(base, async (url) => {
    assert.equal((await post(url, { code: "4/abcdefghijk" })).status, 404);
  });
});

test("code exchange returns only the ID token and rejects failures", async () => {
  const realFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://oauth2.googleapis.com/token")) {
      sent = new URLSearchParams(String(init.body));
      return sent.get("code") === "4/good-code-123"
        ? Response.json({ id_token: "header.payload.sig", access_token: "secret-access" })
        : Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    return realFetch(input, init);
  };
  try {
    await withServer({ ...base, ...google }, async (url) => {
      const ok = await post(url, { code: "4/good-code-123" });
      assert.equal(ok.status, 200);
      assert.deepEqual(await ok.json(), { idToken: "header.payload.sig" });
      assert.equal(sent.get("redirect_uri"), "postmessage");
      assert.equal(sent.get("client_secret"), google.GOOGLE_CLIENT_SECRET);
      assert.equal((await post(url, { code: "4/bad-code-123" })).status, 401);
      assert.equal((await post(url, { code: 42 })).status, 400);
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});
