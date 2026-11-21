import test from "node:test";
import assert from "node:assert/strict";
import { formatSalary, postedAgo } from "../src/jobFormat.ts";

test("salary is readable", () => {
  assert.equal(formatSalary("80000–… RUR", "ru"), "от 80 000 ₽");
  assert.equal(formatSalary("…–120000 KZT", "ru"), "до 120 000 ₸");
  assert.equal(formatSalary("80000–120000 RUR", "ru"), "80 000 – 120 000 ₽");
  assert.equal(formatSalary("Salary not listed", "ru"), "");
  assert.equal(formatSalary("$50k–70k", "en"), "$50k–70k");
});

test("posted ago", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  assert.equal(postedAgo("2026-11-21T08:00:00Z", "ru", now), "сегодня");
  assert.equal(postedAgo("2026-11-18T08:00:00Z", "ru", now), "3 дня назад");
  assert.equal(postedAgo("2026-11-07T08:00:00Z", "ru", now), "2 недели назад");
  assert.equal(postedAgo(null, "ru", now), "");
});
