import { AiCache } from "./services/aiCache.ts";
import { streamResponse } from "./streaming.ts";
import type { Config } from "./config.ts";
import type { Request, Response, NextFunction } from "express";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  chatSchema,
  resumeSchema,
  searchSchema,
  jobIdSchema,
  jobRequestSchema,
  letterSchema,
  languageSchema,
} from "../shared/schemas.ts";
import { createDatabase, getResume, saveResume } from "./database.ts";
import { createLLM } from "./services/llm.ts";
import { createJobService } from "./services/jobAggregator.ts";
import { renderResume } from "./services/pdf.ts";
import { HttpError, dbResult } from "./errors.ts";
import { translate } from "../shared/i18n.ts";
import type { Message, Profile, Job } from "../shared/schemas.ts";
import {
  emptyProfile,
  profileReadiness,
  resumeExportable,
  latestDraft,
  isPublished,
  interviewStep,
  isSkipped,
  type ChatAction,
} from "../shared/schemas.ts";
import {
  fallbackChat,
  heuristicMatch,
  templateLetter,
  composeFallback,
  guessAction,
} from "./services/fallback.ts";

/**
 * A step may be marked "skipped" only when it was the question being asked.
 * Guards against the model pre-filling later optional steps with "-".
 */
export function keepSkipsHonest(before: Profile, after: Profile): Profile {
  const asked = interviewStep(before);
  const fixed = { ...after };
  for (const field of Object.keys(fixed) as (keyof Profile)[]) {
    if (isSkipped(fixed[field]) && !isSkipped(before[field]) && field !== asked)
      fixed[field] = before[field];
  }
  return fixed;
}

/** Accept both the {profile, action} parse result and a bare profile (test doubles). */
function asParseResult(value: unknown): { profile: Profile; action: ChatAction } {
  const v = value as { profile?: Profile; action?: ChatAction };
  return v && v.profile ? { profile: v.profile, action: v.action ?? "answer" } : { profile: value as Profile, action: "answer" };
}
import { CircuitBreaker } from "./services/resilience.ts";

type LLM = ReturnType<typeof createLLM>;

export function createApp(
  config: Config,
  injected: {
    database?: ReturnType<typeof createDatabase>;
    /** `null` forces offline AI mode (no provider configured). */
    llm?: LLM | null;
    jobs?: ReturnType<typeof createJobService>;
    breaker?: CircuitBreaker;
  } = {},
) {
  const app = express();
  const aiCache = new AiCache();
  const letterLocks = new Set<string>();
  const database = injected.database || createDatabase(config);
  const llm: LLM | null =
    injected.llm !== undefined
      ? injected.llm
      : config.OPENAI_API_KEY
        ? createLLM(config)
        : null;
  const breaker = injected.breaker || new CircuitBreaker();
  const jobs = injected.jobs || createJobService(config, database.admin);
  /** Returns the provider only when it is configured and not cooling down. */
  const liveAI = () => (llm && !breaker.isOpen ? llm : null);
  const aiMode = () => (liveAI() ? "live" : "fallback");
  const noteFallback = (req: Request, error: unknown, feature: string) => {
    const reason =
      error !== null
        ? breaker.failure(error)
        : llm
          ? `cooldown:${breaker.lastFailure}`
          : "not-configured";
    console.warn(
      JSON.stringify({ requestId: req.id, event: "ai.fallback", feature, reason }),
    );
  };
  /**
   * Run a streamed generation. Falls back only if nothing was streamed yet, so a
   * client never receives two different texts glued together.
   */
  async function generateText(
    req: Request,
    feature: string,
    signal: AbortSignal,
    emit: (event: string, payload: unknown) => void,
    stream: ((ai: LLM) => AsyncIterable<string>) | null,
    fallback: () => string,
  ) {
    const ai = liveAI();
    let text = "";
    if (ai && stream) {
      try {
        for await (const delta of stream(ai)) {
          text += delta;
          if (text.length > 15000) throw new HttpError(502, "ai.failed");
          emit("delta", { text: delta });
        }
        if (!text.trim()) throw new HttpError(502, "ai.failed");
        breaker.success();
        return { text, fallback: false };
      } catch (error) {
        if (signal.aborted || text) throw error;
        noteFallback(req, error, feature);
      }
    } else noteFallback(req, null, feature);
    text = fallback();
    emit("delta", { text });
    return { text, fallback: true };
  }
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY_HOPS);
  app.use(
    helmet({
      contentSecurityPolicy:
        config.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                // accounts.google.com/gsi: the on-site "Sign in with Google" button.
                scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style"],
                frameSrc: ["https://accounts.google.com/gsi/"],
                connectSrc: [
                  "'self'",
                  new URL(config.SUPABASE_URL).origin,
                  "https://accounts.google.com/gsi/",
                ],
                // Google profile photos for signed-in users (see src/Avatar.tsx).
                imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
              },
            }
          : false,
      // The Google sign-in popup must be able to message this window back.
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.setHeader("X-Request-Id", req.id);
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_req, _res, next) => next(new HttpError(429, "rate.limit")),
    }),
  );
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", (req, _res, next) => {
    if (req.headers.origin && req.headers.origin !== config.APP_ORIGIN)
      return next(new HttpError(403, "auth.required"));
    next();
  });
  app.get("/robots.txt", (_req, res) =>
    res
      .type("text/plain")
      .send(
        "User-agent: *\nDisallow: /api/\nSitemap: " +
          config.APP_ORIGIN +
          "/sitemap.xml",
      ),
  );
  app.get("/sitemap.xml", (_req, res) =>
    res
      .type("application/xml")
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' +
          config.APP_ORIGIN.replaceAll("&", "&amp;") +
          "/</loc></url></urlset>",
      ),
  );
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", ai: aiMode() }),
  );
  app.get("/api/ready", async (_req, res) => {
    const ok = await Promise.race([
      Promise.resolve(database.admin.from("jobs").select("id").limit(1))
        .then((result) => !result.error)
        .catch(() => false),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 5000).unref(),
      ),
    ]);
    res
      .status(ok ? 200 : 503)
      .json({ status: ok ? "ready" : "unavailable", ai: aiMode() });
  });
  app.get("/api/config", (_req, res) =>
    res.json({
      supabaseUrl: config.SUPABASE_URL,
      supabaseAnonKey: config.SUPABASE_ANON_KEY,
      ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
        ? { googleClientId: config.GOOGLE_CLIENT_ID }
        : {}),
    }),
  );
  /**
   * On-site Google sign-in: the popup returns a one-time authorization code,
   * which only the server can exchange (it needs the client secret). The ID
   * token goes back to the browser, and Supabase verifies it on sign-in.
   */
  app.post("/api/auth/google", async (req, res) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET)
      throw new HttpError(404, "auth.googleDisabled");
    const { code } = z.object({ code: z.string().min(10).max(2048) }).parse(req.body);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: "postmessage",
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { id_token?: unknown } | null;
    if (!response?.ok || typeof body?.id_token !== "string")
      throw new HttpError(401, "auth.googleFailed");
    res.json({ idToken: body.id_token });
  });
  app.use("/api", database.authenticate);
  /**
   * Per-user AI budgets (cost protection). Chat turns are cheap and an
   * interview needs 10-15 of them; match/letter calls are rarer and larger.
   */
  const AI_LIMITS = {
    chat: { hour: 60, day: 300 },
    tools: { hour: 30, day: 100 },
  } as const;
  const aiLimit = async (req: Request, kind: keyof typeof AI_LIMITS = "tools") => {
    const limits = AI_LIMITS[kind];
    await database.limit(req.user.id, `ai-${kind}-hour`, limits.hour, 3600, "ai.limitHour");
    await database.limit(req.user.id, `ai-${kind}-day`, limits.day, 86400, "ai.limitDay");
  };
  app.get("/api/workspace", async (req, res) => {
    const resume = await getResume(req);
    const saved = dbResult(
      await req.db
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", req.user.id),
    );
    const letters = dbResult(
      await req.db
        .from("cover_letters")
        .select("job_id,language,letter")
        .eq("user_id", req.user.id),
    );
    res.json({
      profile: resume.profile,
      messages: resume.messages,
      version: resume.version,
      saved: (saved || []).map((s) => s.job_id),
      letters: Object.fromEntries(
        (letters || []).map((l) => [`${l.job_id}:${l.language}`, l.letter]),
      ),
      aiMode: aiMode(),
    });
  });
  app.post("/api/resume", async (req, res) => {
    const { profile, version } = resumeSchema.parse(req.body);
    const language = languageSchema.parse(req.body?.language);
    const resume = await getResume(req);
    // A complete resume saved by hand counts as published too.
    const messages =
      !isPublished(resume.messages) && resumeExportable(profile)
        ? [
            ...resume.messages,
            {
              role: "assistant" as const,
              text: translate(language, "resume.publishedManually"),
              published: true,
            },
          ]
        : resume.messages;
    const updated = await saveResume(req, profile, messages, version);
    dbResult(
      await req.db
        .from("profiles")
        .upsert({ user_id: req.user.id, display_name: profile.name }),
    );
    res.json({ version: updated.version, messages });
  });
  app.post("/api/reset", async (req, res) => {
    const { version } = z
      .object({ version: z.number().int().nonnegative() })
      .strict()
      .parse(req.body);
    const profile = { ...emptyProfile };
    const updated = await saveResume(req, profile, [], version);
    res.json({ profile, messages: [], version: updated.version });
  });
  app.post("/api/chat", async (req, res) => {
    const { profile, version, message, language, action: requested } = chatSchema.parse(req.body);
    await aiLimit(req, "chat");
    const resume = await getResume(req);
    if (resume.version !== version) throw new HttpError(409, "resume.conflict");
    const history = resume.messages;
    const messages: Message[] = [...history, { role: "user", text: message }];
    if (messages.length > 58 || JSON.stringify(messages).length > 120000)
      throw new HttpError(400, "chat.full");
    await streamResponse(res, async (emit, signal) => {
      const offline = fallbackChat(profile, history, message, language);
      const previousDraft = latestDraft(history);
      const ai = liveAI();
      let parsed: Profile = profile;
      let action: ChatAction = requested ?? "answer";
      let fallback = false;

      // 1. Update the facts from the answer first (buttons skip this: nothing new to read).
      if (!requested) {
        if (ai) {
          try {
            const result = asParseResult(await ai.parse(profile, messages, signal));
            parsed = keepSkipsHonest(profile, result.profile);
            action = result.action;
          } catch (error) {
            if (signal.aborted) throw error;
            noteFallback(req, error, "parse");
            fallback = true;
            action = guessAction(message, !!previousDraft);
          }
        } else action = guessAction(message, !!previousDraft);
        // Offline: the guided interview records the answer itself.
        if ((!ai || fallback) && action === "answer") parsed = offline.profile;
      }
      // "Change X" before any draft exists is just an answer.
      if (action === "revise" && !previousDraft) action = "compose";
      if (action === "publish" && !previousDraft) action = "compose";
      // When every interview question is answered, compose without waiting to be asked.
      if (action === "answer" && !previousDraft && profileReadiness(parsed).complete)
        action = "compose";

      const finish = async (profileToSave: Profile, assistant: Message) => {
        // Keep only the newest draft in history (drafts are large).
        const trimmed = assistant.draft
          ? messages.map(({ draft: _old, ...rest }) => rest)
          : messages;
        trimmed.push(assistant);
        if (signal.aborted) return;
        const updated = await saveResume(req, profileToSave, trimmed, version);
        emit("done", { profile: updated.profile, messages: trimmed, version: updated.version, fallback });
      };

      // 2a. Publish the latest draft to "My resume".
      if (action === "publish" && previousDraft) {
        const text = translate(language, "resume.publishedMessage");
        emit("delta", { text });
        await finish({ ...previousDraft }, { role: "assistant", text, published: true });
        return;
      }

      // 2b. Compose or revise the complete resume.
      if (action === "compose" || action === "revise") {
        let composed: { message: string; draft: Profile } | null = null;
        if (ai) {
          try {
            composed = await ai.compose(parsed, messages, action === "revise" ? previousDraft : undefined, language, signal);
            breaker.success();
          } catch (error) {
            if (signal.aborted) throw error;
            noteFallback(req, error, "compose");
          }
        } else noteFallback(req, null, "compose");
        if (!composed) {
          fallback = true;
          composed = composeFallback(parsed, language);
        }
        emit("delta", { text: composed.message });
        await finish(parsed, { role: "assistant", text: composed.message, draft: composed.draft });
        return;
      }

      // 2c. Interview: reply with the up-to-date profile.
      const justReady = !profileReadiness(profile).ready && profileReadiness(parsed).ready;
      const result = await generateText(
        req,
        "chat",
        signal,
        emit,
        (live) => live.chat({ profile: parsed, messages, language, signal, justReady }),
        () => offline.reply,
      );
      if (result.fallback) {
        parsed = offline.profile;
        fallback = true;
      }
      await finish(parsed, { role: "assistant", text: result.text });
    });
  });
  app.post("/api/jobs", async (req, res) => {
    const filters = searchSchema.parse(req.body);
    await database.limit(req.user.id, "jobs", 60, 60);
    // The resume personalises ranking (skills) and remote eligibility (home country).
    const resume = await getResume(req).catch(() => null);
    res.json(
      await jobs.search(filters, {
        profile: resume?.profile,
        userIp: req.ip,
        userAgent: req.get("user-agent")?.slice(0, 300),
      }),
    );
  });
  app.post("/api/job", async (req, res) => {
    const { jobId } = jobRequestSchema.parse(req.body);
    await database.limit(req.user.id, "details", 60, 60);
    res.json({ job: await jobs.detail(jobId) });
  });
  app.post("/api/saved-jobs", async (req, res) => {
    const { page } = z
      .object({ page: z.number().int().min(0).max(1000).default(0) })
      .strict()
      .parse(req.body);
    const result = await req.db
      .from("saved_jobs")
      .select("jobs(data)", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(page * 12, page * 12 + 11)
      .returns<{ jobs: { data: unknown } }[]>();
    res.json({
      jobs: (dbResult(result) || []).map((row) => row.jobs.data),
      total: result.count || 0,
      pages: Math.ceil((result.count || 0) / 12),
      page,
    });
  });
  app.post("/api/bookmark", async (req, res) => {
    const { jobId, saved } = z
      .object({ jobId: jobIdSchema, saved: z.boolean() })
      .strict()
      .parse(req.body);
    if (!saved) {
      dbResult(
        await req.db
          .from("saved_jobs")
          .delete()
          .eq("user_id", req.user.id)
          .eq("job_id", jobId),
      );
      res.json({ saved });
      return;
    }
    const save = () =>
      req.db.from("saved_jobs").upsert({ user_id: req.user.id, job_id: jobId });
    let result = await save();
    if (result.error?.code === "23503") {
      // The job is only in memory (shown before the DB accepted its source): store it, retry.
      if (!(await jobs.store(jobId))) throw new HttpError(409, "jobs.migrationRequired");
      result = await save();
    }
    dbResult(result);
    res.json({ saved });
  });
  app.post("/api/match", async (req, res) => {
    const { jobId, language } = jobRequestSchema.parse(req.body);
    await aiLimit(req);
    const resume = await getResume(req);
    const job = await jobs.detail(jobId);
    const ai = liveAI();
    if (ai) {
      const key = aiCache.key(req.user.id, config.OPENAI_MODEL, "match", {
        profile: resume.profile,
        job,
        language,
      });
      try {
        const result = await aiCache.getOrCreate(key, () =>
          ai.match(resume.profile, job, language),
        );
        breaker.success();
        res.json({ ...result, fallback: false });
        return;
      } catch (error) {
        noteFallback(req, error, "match");
      }
    } else noteFallback(req, null, "match");
    res.json({ ...heuristicMatch(resume.profile, job, language), fallback: true });
  });
  const requireLetterBasics = (profile: Profile) => {
    if (!profile.name.trim() || !profile.skills.trim())
      throw new HttpError(400, "Add your name and skills to your resume first.");
  };
  const storeLetter = async (
    req: Request,
    jobId: string,
    language: "ru" | "en",
    letter: string,
  ) =>
    dbResult(
      await req.db.from("cover_letters").upsert({
        user_id: req.user.id,
        job_id: jobId,
        language,
        letter,
        updated_at: new Date().toISOString(),
      }),
    );
  app.post("/api/cover-letter", async (req, res) => {
    const { jobId, language } = jobRequestSchema.parse(req.body);
    await aiLimit(req);
    const resume = await getResume(req);
    requireLetterBasics(resume.profile);
    const job: Job = await jobs.detail(jobId);
    const ai = liveAI();
    let letter = "";
    let fallback = !ai;
    if (ai) {
      try {
        letter = await ai.letter(resume.profile, job, language);
        breaker.success();
      } catch (error) {
        noteFallback(req, error, "letter");
        fallback = true;
      }
    } else noteFallback(req, null, "letter");
    if (fallback) letter = templateLetter(resume.profile, job, language);
    await storeLetter(req, jobId, language, letter);
    res.json({ letter, fallback });
  });
  app.post("/api/cover-letter/stream", async (req, res) => {
    const { jobId, language } = jobRequestSchema.parse(req.body);
    const lock = req.user.id + ":" + jobId + ":" + language;
    if (letterLocks.has(lock)) throw new HttpError(409, "ai.busy");
    letterLocks.add(lock);
    try {
      await aiLimit(req);
      const resume = await getResume(req);
      requireLetterBasics(resume.profile);
      const job = await jobs.detail(jobId);
      await streamResponse(res, async (emit, signal) => {
        const { text: letter, fallback } = await generateText(
          req,
          "letter",
          signal,
          emit,
          (ai) => ai.letterStream(resume.profile, job, language, signal),
          () => templateLetter(resume.profile, job, language),
        );
        if (signal.aborted) throw new HttpError(502, "ai.failed");
        await storeLetter(req, jobId, language, letter);
        emit("done", { letter, fallback });
      });
    } finally {
      letterLocks.delete(lock);
    }
  });
  app.post("/api/letter", async (req, res) => {
    const { jobId, language, letter } = letterSchema.parse(req.body);
    await storeLetter(req, jobId, language, letter);
    res.json({ saved: true });
  });
  app.post("/api/resume/pdf", async (req, res) => {
    const { language, template } = z
      .object({
        language: languageSchema,
        template: z.enum(["modern", "classic"]).default("modern"),
      })
      .strict()
      .parse(req.body);
    await database.limit(req.user.id, "pdf", 10, 60);
    const resume = await getResume(req);
    if (!resumeExportable(resume.profile)) throw new HttpError(400, "resume.empty");
    const pdf = await renderResume(resume.profile, language, template);
    dbResult(
      await req.db.storage
        .from("resumes")
        .upload(`${req.user.id}/${language}-${template}.pdf`, pdf, {
          upsert: true,
          contentType: "application/pdf",
          cacheControl: "0",
        }),
    );
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="workfinder-resume.pdf"',
      })
      .send(pdf);
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "API route not found.")),
  );
  app.use(
    (error: unknown, req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      const code =
        error instanceof z.ZodError
          ? "request.invalid"
          : error instanceof HttpError
            ? error.code
            : error instanceof Error &&
                "type" in error &&
                error.type === "entity.too.large"
              ? "Request is too large."
              : error instanceof SyntaxError
                ? "Invalid JSON request."
                : "service.unavailable";
      const status =
        error instanceof z.ZodError || error instanceof SyntaxError
          ? 400
          : error instanceof HttpError
            ? error.status
            : error instanceof Error &&
                "type" in error &&
                error.type === "entity.too.large"
              ? 413
              : 503;
      if (status >= 500)
        console.error(
          JSON.stringify({
            requestId: req.id,
            method: req.method,
            path: req.path,
            code,
            status,
            // Error class only: messages can contain provider or user data.
            error: error instanceof Error ? error.name : typeof error,
          }),
        );
      res
        .status(status)
        .json({
          errorKey: code,
          error: translate(req.body?.language, code),
          requestId: req.id,
        });
    },
  );
  return app;
}
