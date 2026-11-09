import type {Database} from '../shared/database.types.ts';
import type { SupabaseClient, User } from "@supabase/supabase-js";
declare global {
  namespace Express {
    interface Request {
      id: string;
      user: User;
      db: SupabaseClient<Database>;
    }
  }
}
export {};
