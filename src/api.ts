import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  workspaceSchema,
  chatResultSchema,
  jobsResponseSchema,
  jobSchema,
  matchResultSchema,
  letterResultSchema,
  profileSchema,
  messageSchema,
} from "../shared/schemas.ts";
let authClient: SupabaseClient | undefined;
export const setAuthClient = (client: SupabaseClient) => {
  authClient = client;
};
/** Side-effect-free routes that are safe to retry on transient failures. */
const RETRYABLE = new Set(["workspace", "jobs", "saved-jobs", "job"]);
const TRANSIENT_STATUS = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
export async function request(
  route: string,
  data?: unknown,
  signal?: AbortSignal,
) {
  const attempts = RETRYABLE.has(route) ? MAX_ATTEMPTS : 1;
  let refreshed = false;
  for (let attempt = 1; ; attempt++) {
    const session = await authClient?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error("auth.required");
    const timeout = AbortSignal.timeout(120000);
    let response: Response | undefined;
    let failure: Error;
    try {
      response = await fetch(`/api/${route}`, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (response.ok) return response;
      if (response.status === 401 && authClient) {
        // The stored session can be revoked server-side (signed out elsewhere,
        // expired refresh). Try one refresh; otherwise drop the dead session so
        // the app returns to the sign-in form instead of a dead-end error.
        if (!refreshed) {
          refreshed = true;
          const renewed = await authClient.auth.refreshSession().catch(() => null);
          if (renewed?.data.session && !renewed.error) {
            attempt--;
            continue;
          }
        }
        await authClient.auth.signOut({ scope: "local" }).catch(() => {});
        throw new Error("auth.required");
      }
      const body: unknown = await response.json().catch(() => null);
      const parsed = z.object({ errorKey: z.string() }).safeParse(body);
      failure = new Error(
        parsed.success ? parsed.data.errorKey : "service.unavailable",
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      failure = new Error(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "network.offline"
          : "Could not connect to the server. Please try again.",
      );
    }
    const transient = !response || TRANSIENT_STATUS.has(response.status);
    if (!transient || attempt >= attempts) throw failure;
    // Exponential backoff with jitter: ~0.5s, ~1s.
    await wait(250 * 2 ** attempt + Math.random() * 250, signal);
  }
}
const contracts = {
  workspace: workspaceSchema,
  jobs: jobsResponseSchema,
  "saved-jobs": jobsResponseSchema,
  job: z.object({ job: jobSchema }),
  resume: z.object({ version: z.number(), messages: z.array(messageSchema).optional() }),
  reset: z.object({ profile: profileSchema, version: z.number() }),
  bookmark: z.object({ saved: z.boolean() }),
  match: matchResultSchema,
  "cover-letter": letterResultSchema,
  letter: z.object({ saved: z.boolean() }),
};
export async function api<K extends keyof typeof contracts>(
  route: K,
  data?: unknown,
  signal?: AbortSignal,
): Promise<z.infer<(typeof contracts)[K]>> {
  const response = await request(route, data, signal);
  const body: unknown = await response.json();
  const parsed=contracts[route].safeParse(body);if(!parsed.success)throw new Error("service.unavailable");return parsed.data as z.infer<(typeof contracts)[K]>;
}
export async function streamResult<T>(
  route: string,
  data: unknown,
  schema: z.ZodType<T>,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<T> {
  const response = await request(route, data, signal);
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  )
    throw new Error("ai.failed");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    result: T | undefined;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 200000) throw new Error("ai.failed");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const kind = frame.match(/^event: (.+)$/m)?.[1],
          payload = frame.match(/^data: (.+)$/m)?.[1];
        if (!payload) continue;
        const event: unknown = JSON.parse(payload);
        if (kind === "delta")
          onDelta(z.object({ text: z.string() }).parse(event).text);
        if (kind === "done") result = schema.parse(event);
        if (kind === "error")
          throw new Error(
            z.object({ errorKey: z.string() }).parse(event).errorKey,
          );
      }
      if (done) break;
    }
    if (!result) throw new Error("ai.failed");
    return result;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export const streamChat = (
  data: unknown,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) => streamResult("chat", data, chatResultSchema, onDelta, signal);
export const streamLetter = (
  data: unknown,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) =>
  streamResult(
    "cover-letter/stream",
    data,
    letterResultSchema,
    onDelta,
    signal,
  );
