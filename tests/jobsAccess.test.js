import test from "node:test";
import assert from "node:assert/strict";
import { createJobService } from "../server/services/jobs.ts";
for (const status of [401, 403])
  test(`HH ${status} is reported as an access configuration failure`, async () => {
    const query = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gt() {
        return this;
      },
      async maybeSingle() {
        return { data: null, error: null };
      },
    };
    const service = createJobService(
      { HH_USER_AGENT: "WorkFinder test" },
      {
        from() {
          return query;
        },
      },
      async (_url, options) => {
        assert.equal(options.headers["HH-User-Agent"], "WorkFinder test");
        return new Response("{}", { status });
      },
    );
    await assert.rejects(
      service.search({ page: 0 }),
      (error) => error.code === "jobs.accessDenied" && error.status === 503,
    );
  });
