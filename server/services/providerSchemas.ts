import { z } from "zod";
const named = z.object({ name: z.string() });
const salary = z
  .object({
    from: z.number().nullable().optional(),
    to: z.number().nullable().optional(),
    currency: z.string().optional(),
  })
  .nullable()
  .optional();
export const hhJobSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string(),
  employer: named.nullable().optional(),
  area: named.optional(),
  experience: named.optional(),
  employment: named.optional(),
  salary,
  salary_range: salary,
  alternate_url: z.string().optional(),
  published_at: z.string().optional(),
  key_skills: z.array(named).optional(),
  description: z.string().optional(),
  snippet: z
    .object({
      requirement: z.string().nullable().optional(),
      responsibility: z.string().nullable().optional(),
    })
    .optional(),
});
export const hhSearchSchema = z.object({
  items: z.array(hhJobSchema),
  found: z.number(),
  pages: z.number(),
});
export type HHJob = z.infer<typeof hhJobSchema>;
export const arbeitnowSchema = z.object({
  slug: z.string(),
  title: z.string(),
  company_name: z.string(),
  url: z.string(),
  location: z.string(),
  description: z.string(),
  remote: z.boolean(),
  job_types: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.number(),
});
export const joobleSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  company: z.string(),
  link: z.string(),
  location: z.string(),
  snippet: z.string(),
  type: z.string().optional(),
  salary: z.string().optional(),
  updated: z.string().optional(),
});
export type ArbeitnowJob = z.infer<typeof arbeitnowSchema>;
export type JoobleJob = z.infer<typeof joobleSchema>;
