import { z } from "zod";
import type { Config } from "../config.ts";
import type { Profile, Job, Message, ChatAction, ChatPhase } from "../../shared/schemas.ts";
/** The model only needs the words, not stored drafts or flags. */
const plain = (messages: Message[]) => messages.map(({ role, text }) => ({ role, text }));
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  aiParseSchema,
  aiComposeSchema,
  aiMatchSchema,
  aiRolesSchema,
  clampRoles,
  clampMatch,
  clampProfile,
  profileReadiness,
  interviewStep,
} from "../../shared/schemas.ts";
import {
  chatPrompt,
  composePrompt,
  parsePrompt,
  matchPrompt,
  letterPrompt,
  rolesPrompt,
} from "./prompts.ts";
import { HttpError } from "../errors.ts";
export function createLLM(config: Config) {
  const client = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    timeout: 60000,
    maxRetries: 0,
  });
  const base = {
    model: config.OPENAI_MODEL,
    store: false,
    max_output_tokens: 3500,
  };
  /**
   * Per-operation time budgets: a slow provider falls back to offline mode
   * quickly instead of leaving the student staring at "typing…" for a minute.
   */
  const TIMEOUT = { parse: 20_000, chat: 25_000, match: 25_000, compose: 80_000, letter: 40_000 };
  async function structured<T>(
    instructions: string,
    input: unknown,
    schema: z.ZodType<T>,
    name: string,
    signal?: AbortSignal,
    timeout: number = TIMEOUT.parse,
    maxTokens: number = base.max_output_tokens,
    model: string = base.model,
  ) {
    const result = await client.responses.parse(
      {
        ...base,
        model,
        max_output_tokens: maxTokens,
        instructions,
        input: JSON.stringify(input),
        text: { format: zodTextFormat(schema, name) },
      },
      { signal, timeout },
    );
    if (result.status !== "completed" || !result.output_parsed)
      throw new HttpError(502, "ai.failed");
    return schema.parse(result.output_parsed);
  }
  return {
    async *chat({
      profile,
      messages,
      language,
      signal,
      justReady = false,
      phase = "interview",
    }: {
      profile: Profile;
      messages: Message[];
      language: string;
      signal?: AbortSignal;
      /** The latest answer completed what job matching needs. */
      justReady?: boolean;
      /** interview → collect facts; review → a draft awaits saving; saved → help after saving. */
      phase?: ChatPhase;
    }) {
      const stream = await client.responses.create(
        {
          ...base,
          instructions: chatPrompt(language, {
            ...profileReadiness(profile),
            step: interviewStep(profile),
            justReady,
            phase,
          }),
          // Chat replies are short by design (60–90 words).
          max_output_tokens: 400,
          input: [
            {
              role: "user",
              content: `Existing resume data: ${JSON.stringify(profile)}`,
            },
            ...plain(messages)
              .slice(-12)
              .map((m) => ({ role: m.role, content: m.text })),
          ],
          stream: true,
        },
        { signal, timeout: TIMEOUT.chat },
      );
      let complete = false;
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") yield event.delta;
        if (event.type === "response.completed") complete = true;
        if (
          ["response.failed", "response.incomplete", "error"].includes(
            event.type,
          )
        )
          throw new HttpError(502, "ai.failed");
      }
      if (!complete) throw new HttpError(502, "ai.failed");
    },
    /** Update the facts from the latest answer and detect what the student asks for. */
    async parse(
      profile: Profile,
      messages: Message[],
      signal?: AbortSignal,
      hasDraft = false,
    ): Promise<{ profile: Profile; action: ChatAction }> {
      const { action, ...fields } = await structured(
        parsePrompt,
        { profile, hasDraft, messages: plain(messages).slice(-12) },
        aiParseSchema,
        "resume",
        signal,
      );
      // The "About me" summary is written only by compose().
      return { profile: clampProfile({ ...fields, summary: profile.summary }), action };
    },
    /** Write (or revise) the complete resume from the interview. */
    async compose(
      profile: Profile,
      messages: Message[],
      previous: Profile | undefined,
      language: string,
      signal?: AbortSignal,
    ): Promise<{ message: string; draft: Profile }> {
      const run = (model: string, timeout: number) =>
        structured(
          composePrompt(language, !!previous),
          { profile, previousDraft: previous ?? null, transcript: plain(messages).slice(-48) },
          aiComposeSchema,
          "resume_draft",
          signal,
          timeout,
          // A detailed resume in Russian is long: leave room for every section.
          8000,
          model,
        );
      const strong = config.OPENAI_COMPOSE_MODEL;
      const started = Date.now();
      let result;
      try {
        result = await run(strong, TIMEOUT.compose);
      } catch (error) {
        // The stronger model may be unavailable for this key: try the main model
        // with whatever time is left, unless the student cancelled.
        const left = TIMEOUT.compose - (Date.now() - started);
        if (strong === base.model || signal?.aborted || left < 20_000) throw error;
        console.warn("compose: falling back to", base.model);
        result = await run(base.model, left);
      }
      const { message, ...fields } = result;
      return { message: message.trim().slice(0, 2000), draft: clampProfile(fields) };
    },
    /** Job titles to search for, picked from the saved resume. */
    async roles(profile: Profile, language: string) {
      const { roles } = await structured(rolesPrompt(language), { profile }, aiRolesSchema, "roles", undefined, TIMEOUT.match, 400);
      return clampRoles(roles);
    },
    match: async (profile: Profile, job: Job, language: string) =>
      clampMatch(
        await structured(matchPrompt(language), { profile, job }, aiMatchSchema, "match", undefined, TIMEOUT.match),
      ),
    async *letterStream(
      profile: Profile,
      job: Job,
      language: string,
      signal?: AbortSignal,
    ) {
      const stream = await client.responses.create(
        {
          ...base,
          max_output_tokens: 1800,
          instructions: letterPrompt(language),
          input: JSON.stringify({
            profile,
            job: {
              title: job.title,
              company: job.company,
              description: job.description,
              skills: job.skills,
            },
          }),
          stream: true,
        },
        { signal, timeout: TIMEOUT.letter },
      );
      let complete = false;
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") yield event.delta;
        if (event.type === "response.completed") complete = true;
        if (
          ["response.failed", "response.incomplete", "error"].includes(
            event.type,
          )
        )
          throw new HttpError(502, "ai.failed");
      }
      if (!complete) throw new HttpError(502, "ai.failed");
    },
    async letter(profile: Profile, job: Job, language: string) {
      const result = await client.responses.create({
        ...base,
        instructions: letterPrompt(language),
        input: JSON.stringify({ profile, job }),
      });
      if (result.status !== "completed" || !result.output_text?.trim())
        throw new HttpError(502, "ai.failed");
      return result.output_text.slice(0, 15000);
    },
  };
}
