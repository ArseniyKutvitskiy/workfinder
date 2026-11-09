import test from "node:test";
import assert from "node:assert/strict";
import { AiCache } from "../server/services/aiCache.ts";
import { setAuthClient, streamResult } from "../src/api.ts";
import { z } from "zod";

test("AI cache separates accounts and coalesces identical concurrent requests", async () => {
  const cache = new AiCache();
  let calls = 0;
  const run = async () => {
    calls++;
    await Promise.resolve();
    return { score: 50 };
  };
  const a = cache.key("alice", "gpt-4o", "match", { skills: "React" }),
    b = cache.key("bob", "gpt-4o", "match", { skills: "React" });
  assert.notEqual(a, b);
  await Promise.all([cache.getOrCreate(a, run), cache.getOrCreate(a, run)]);
  assert.equal(calls, 1);
  await cache.getOrCreate(b, run);
  assert.equal(calls, 2);
  assert.notEqual(
    a,
    cache.key("alice", "gpt-4o", "match", { skills: "Python" }),
  );
});
test("AI cache does not preserve failures", async () => {
  const cache = new AiCache();
  await assert.rejects(
    cache.getOrCreate("a", async () => {
      throw Error("failed");
    }),
  );
  assert.equal(await cache.getOrCreate("a", async () => 42), 42);
});

test("SSE reader handles split UTF-8 frames and validates the final payload", async (t) => {
  setAuthClient({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test" } } }),
    },
  });
  const encoded = new TextEncoder().encode(
    'event: delta\ndata: {"text":"Привет"}\n\nevent: done\ndata: {"letter":"Привет"}\n\n',
  );
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < encoded.length; i += 3)
              controller.enqueue(encoded.slice(i, i + 3));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  let text = "";
  const result = await streamResult(
    "cover-letter/stream",
    {},
    z.object({ letter: z.string() }),
    (delta) => (text += delta),
  );
  assert.equal(text, "Привет");
  assert.equal(result.letter, "Привет");
});
test("SSE reader rejects partial streams without a committed done event", async (t) => {
  setAuthClient({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test" } } }),
    },
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response('event: delta\ndata: {"text":"partial"}\n\n', {
        headers: { "Content-Type": "text/event-stream" },
      }),
  );
  await assert.rejects(
    streamResult("chat", {}, z.object({ letter: z.string() }), () => {}),
    /ai.failed/,
  );
});
