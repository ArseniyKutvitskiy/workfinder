import dotenv from "dotenv";
import { z } from "zod";
dotenv.config({
  path:
    process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
  quiet: true,
});
// Hosting dashboards often store unset values as empty strings; treat them as missing.
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), type.optional());
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z
    .url()
    .refine((v) => {
      const u = new URL(v);
      return (
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password &&
        u.pathname === "/" &&
        !u.search &&
        !u.hash
      );
    }, "Expected an HTTP origin without a path")
    .transform((v) => new URL(v).origin)
    .default("http://localhost:3000"),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Optional: without a key the app runs AI features in transparent offline mode.
  OPENAI_API_KEY: optional(z.string().min(20)),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  HH_USER_AGENT: z.string().min(10).default("WorkFinder/2.0"),
  HH_ACCESS_TOKEN: optional(z.string()),
  JOOBLE_API_KEY: optional(z.string()),
  CAREERJET_API_KEY: optional(z.string()),
  // Public OAuth client ID: enables the on-site Google button (no supabase.co on the consent screen).
  GOOGLE_CLIENT_ID: optional(z.string().regex(/^[\w.-]+\.apps\.googleusercontent\.com$/)),
  // Same secret as in Supabase → Providers → Google; used only to exchange the sign-in code.
  GOOGLE_CLIENT_SECRET: optional(z.string().min(10)),
  ADZUNA_APP_ID: optional(z.string()),
  ADZUNA_APP_KEY: optional(z.string()),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
});
export function readConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Missing or invalid configuration: ${[...new Set(result.error.issues.map((x) => x.path[0]))].join(", ")}`,
    );
  const config = result.data;
  if (
    config.NODE_ENV === "production" &&
    !config.APP_ORIGIN.startsWith("https://")
  )
    throw new Error("APP_ORIGIN must use HTTPS in production.");
  return config;
}

export type Config = ReturnType<typeof readConfig>;
