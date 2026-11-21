import test from "node:test";
import assert from "node:assert/strict";
import { clampRoles, publishedProfile, profileReadiness, emptyProfile } from "../shared/schemas.ts";

test("clampRoles trims, drops duplicates and keeps at most six", () => {
  assert.deepEqual(clampRoles(["  Frontend-разработчик ", "frontend-разработчик", "", "Стажёр  веб-разработки"]), [
    "Frontend-разработчик",
    "Стажёр веб-разработки",
  ]);
  assert.equal(clampRoles(Array.from({ length: 9 }, (_, i) => `Роль ${i}`)).length, 6);
  assert.ok(clampRoles(["x".repeat(90)])[0].length <= 60);
});

test("publishing a draft keeps answered interview steps answered", () => {
  const facts = {
    ...emptyProfile,
    name: "Тимур",
    city: "Алматы",
    country: "Казахстан",
    occupation: "Веб-разработчик",
    education: "AITU, 2 курс",
    courses: "-",
    experience: "Бариста",
    projects: "-",
    skills: "HTML, CSS",
    strengths: "Ответственный",
    languages: "Русский",
    achievements: "-",
    goals: "Стажировка",
    contact: "-",
  };
  // The composed draft shows skipped sections as empty.
  const draft = { ...facts, courses: "", projects: "", achievements: "", contact: "", summary: "Студент…" };
  const saved = publishedProfile(draft, facts);
  assert.equal(profileReadiness(saved).complete, true);
  assert.equal(saved.courses, "-");
  assert.equal(saved.summary, "Студент…");
  assert.equal(saved.education, "AITU, 2 курс");
});
