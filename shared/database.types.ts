import type {Profile,Message,Job} from './schemas.ts';
export type Json=string|number|boolean|null|{[key:string]:Json|undefined}|Json[];
type Table<Row,Relations extends {foreignKeyName:string;columns:string[];isOneToOne:boolean;referencedRelation:string;referencedColumns:string[]}[]=[]>={Row:Row;Insert:Partial<Row>;Update:Partial<Row>;Relationships:Relations};
// Mirrors the checked-in migrations. Verify against Supabase whenever the schema changes.
export type Database={public:{Tables:{
 profiles:Table<{user_id:string;display_name:string;created_at:string}>;
 resumes:Table<{id:string;user_id:string;profile:Profile;messages:Message[];version:number;updated_at:string}>;
 jobs:Table<{id:string;data:Job;updated_at:string}>;
 saved_jobs:Table<{user_id:string;job_id:string;created_at:string},[{foreignKeyName:'saved_jobs_job_id_fkey';columns:['job_id'];isOneToOne:false;referencedRelation:'jobs';referencedColumns:['id']}]>;
 cover_letters:Table<{user_id:string;job_id:string;language:'en'|'ru';letter:string;updated_at:string}>;
 job_cache:Table<{key:string;payload:Json;expires_at:string}>;
 rate_buckets:Table<{key:string;hits:number;expires_at:string}>;
};Views:Record<string,never>;Functions:{consume_limit:{Args:{bucket_key:string;max_count:number;window_seconds:number};Returns:boolean}};Enums:Record<string,never>;CompositeTypes:Record<string,never>}};
