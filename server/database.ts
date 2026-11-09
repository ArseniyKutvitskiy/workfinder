import type {Database} from '../shared/database.types.ts';
import type { Request, Response, NextFunction } from "express";
import type { Config } from "./config.ts";
import type { Profile, Message } from "../shared/schemas.ts";
import "./types.ts";
import { createClient } from "@supabase/supabase-js";
import { HttpError, dbResult } from "./errors.ts";
import { z } from "zod";
import { profileSchema, messageSchema } from "../shared/schemas.ts";
const storedResume = z
  .object({
    profile: profileSchema,
    messages: z.array(messageSchema).max(60),
    version: z.number().int().nonnegative(),
  })
  .passthrough();
const auth = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};
export function createDatabase(config: Config) {
  const admin = createClient<Database>(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    { auth },
  );
  const identity = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth,
  });
  return {
    admin,
    async authenticate(req: Request, _res: Response, next: NextFunction) {
      try {
        const token = /^Bearer ([^\s]+)$/.exec(
          req.headers.authorization || "",
        )?.[1];
        if (!token || token.length > 8192)
          throw new HttpError(401, "auth.required");
        const { data, error } = await identity.auth.getUser(token);
        if (error || !data.user?.email_confirmed_at)
          throw new HttpError(401, "auth.required");
        req.user = data.user;
        req.db = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
          auth,
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        next();
      } catch (error) {
        next(error);
      }
    },
    async limit(
      userId: string,
      category: string,
      maximum: number,
      seconds: number,
      errorKey = "rate.limit",
    ) {
      const allowed = dbResult(
        await admin.rpc("consume_limit", {
          bucket_key: `${category}:${userId}`,
          max_count: maximum,
          window_seconds: seconds,
        }),
      );
      if (!allowed) throw new HttpError(429, errorKey);
    },
  };
}
export async function getResume(req: Request) {
  const rows = dbResult(
    await req.db
      .from("resumes")
      .select("*")
      .eq("user_id", req.user.id)
      .limit(1),
  );
  if (rows?.[0]) return storedResume.parse(rows[0]);
  const inserted = await req.db
    .from("resumes")
    .insert({ user_id: req.user.id })
    .select()
    .single();
  if (!inserted.error) return storedResume.parse(inserted.data);
  // Concurrent tabs may initialize the same account; the unique owner constraint wins.
  return storedResume.parse(
    dbResult(
      await req.db
        .from("resumes")
        .select("*")
        .eq("user_id", req.user.id)
        .single(),
    ),
  );
}
export async function saveResume(
  req: Request,
  profile: Profile,
  messages: Message[],
  version: number,
) {
  const rows = dbResult(
    await req.db
      .from("resumes")
      .update({
        profile,
        messages,
        version: version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", req.user.id)
      .eq("version", version)
      .select(),
  );
  if (!rows?.length) throw new HttpError(409, "resume.conflict");
  return storedResume.parse(rows[0]);
}
