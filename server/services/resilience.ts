import { HttpError } from "../errors.ts";

export type AiFailure = "ai.quota" | "ai.unavailable" | "ai.failed";

/** Map provider/SDK errors to safe, user-facing keys without leaking details. */
export function classifyAiError(error: unknown): AiFailure {
  if (error instanceof HttpError)
    return error.code === "ai.quota" || error.code === "ai.unavailable"
      ? error.code
      : "ai.failed";
  if (typeof error !== "object" || error === null) return "ai.failed";
  const { status, name, code } = error as {
    status?: unknown;
    name?: unknown;
    code?: unknown;
  };
  if (
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted"
  )
    return "ai.quota";
  if (
    status === 401 ||
    status === 403 ||
    (typeof status === "number" && status >= 500) ||
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    name === "TimeoutError"
  )
    return "ai.unavailable";
  return "ai.failed";
}

/**
 * Process-local circuit breaker. After a quota error — or repeated outages —
 * skip the provider for a cool-down so requests answer instantly offline.
 * A single slow/timed-out request does not open it: providers have hiccups,
 * and switching the whole chat offline for one blip is worse than one retry.
 */
export class CircuitBreaker {
  private openUntil = 0;
  private reason: AiFailure | null = null;
  private outageStreak = 0;
  constructor(
    private readonly quotaCooldownMs = 5 * 60_000,
    private readonly outageCooldownMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly outagesToOpen = 2,
  ) {}
  get isOpen() {
    return this.now() < this.openUntil;
  }
  get lastFailure() {
    return this.isOpen ? this.reason : null;
  }
  success() {
    this.openUntil = 0;
    this.reason = null;
    this.outageStreak = 0;
  }
  failure(error: unknown) {
    const reason = classifyAiError(error);
    if (reason === "ai.failed") return reason;
    if (reason === "ai.unavailable" && ++this.outageStreak < this.outagesToOpen) return reason;
    this.reason = reason;
    this.openUntil =
      this.now() +
      (reason === "ai.quota" ? this.quotaCooldownMs : this.outageCooldownMs);
    return reason;
  }
}
