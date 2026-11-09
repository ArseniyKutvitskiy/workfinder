import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeOAuthError,
  googleAvailable,
  withAuthTimeout,
} from "../src/authFlow.ts";

test("OAuth error returns a safe notice and removes callback errors from URL", () => {
  for (const suffix of [
    "?keep=1&error=access_denied&error_description=private",
    "?keep=1#error=access_denied&error_description=private",
  ]) {
    let destination;
    const notice = consumeOAuthError(
      { href: "https://workfinder.example/" + suffix },
      {
        state: null,
        replaceState(_s, _t, url) {
          destination = url;
        },
      },
    );
    assert.equal(notice, "auth.googleFailed");
    assert.equal(destination, "/?keep=1");
  }
});

test("Successful OAuth callback is left for Supabase to exchange", () => {
  assert.equal(
    consumeOAuthError(
      { href: "https://workfinder.example/?code=valid" },
      {
        replaceState() {
          assert.fail("must retain code");
        },
      },
    ),
    "",
  );
});

test("Stalled authentication times out instead of blocking the form indefinitely", async () => {
  await assert.rejects(
    withAuthTimeout(new Promise(() => {}), 10),
    /auth.timeout/,
  );
  assert.equal(
    await withAuthTimeout(Promise.resolve("success"), 100),
    "success",
  );
});

test("Disabled Google provider is detected before navigating away", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ external: { google: false } })),
  );
  assert.equal(
    await googleAvailable({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-test",
    }),
    false,
  );
});
