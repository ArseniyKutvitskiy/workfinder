import test from "node:test";
import assert from "node:assert/strict";
import { chatPhase, trimHistory, profileReadiness, emptyProfile, INTERVIEW_STEPS } from "../shared/schemas.ts";
import { sectionBlocks, splitList, filledSections } from "../shared/resumeFormat.ts";

test("chat phase: interview → review (draft not saved) → saved → review again after a revision", () => {
  const draft = { ...emptyProfile, name: "Анна" };
  assert.equal(chatPhase([]), "interview");
  assert.equal(chatPhase([{ role: "user", text: "Анна" }]), "interview");
  const review = [{ role: "assistant", text: "Готово", draft }];
  assert.equal(chatPhase(review), "review");
  const saved = [...review, { role: "assistant", text: "Сохранено", published: true }];
  assert.equal(chatPhase(saved), "saved");
  assert.equal(chatPhase([...saved, { role: "user", text: "Поменяй навыки" }, { role: "assistant", text: "Новая версия", draft }]), "review");
});

test("long chats keep the newest turns and never lose the draft or the saved mark", () => {
  const draft = { ...emptyProfile, name: "Анна" };
  const old = [
    { role: "assistant", text: "Черновик", draft },
    { role: "assistant", text: "Сохранено", published: true },
  ];
  const chatter = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `сообщение ${i}` }));
  const kept = trimHistory([...old, ...chatter]);
  assert.ok(kept.length <= 56);
  assert.ok(kept.some((m) => m.draft), "draft kept");
  assert.ok(kept.some((m) => m.published), "saved mark kept (jobs stay unlocked)");
  assert.equal(kept.at(-1).text, "сообщение 79");
  // Size limit: huge messages are dropped from the oldest side.
  const big = Array.from({ length: 30 }, () => ({ role: "user", text: "x".repeat(10_000) }));
  assert.ok(JSON.stringify(trimHistory(big)).length <= 110_000);
});

test("the interview has 14 steps; progress counts skipped optional ones", () => {
  assert.equal(INTERVIEW_STEPS.length, 14);
  const full = Object.fromEntries(INTERVIEW_STEPS.map((f) => [f, "-"]));
  assert.equal(profileReadiness({ ...emptyProfile, ...full }).percent, 100);
});

test("resume sections are parsed into headings, lines and bullets", () => {
  const text = "Бариста — Coffee Boom, 2024–2025\n• Готовил напитки\n• Обучил двух стажёров\n\nВолонтёр — фонд «Дом»\n• Помогал на мероприятиях";
  const blocks = sectionBlocks(text);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].title, "Бариста — Coffee Boom, 2024–2025");
  assert.deepEqual(blocks[0].bullets, ["Готовил напитки", "Обучил двух стажёров"]);
  assert.deepEqual(sectionBlocks("Просто абзац о себе."), [{ lines: ["Просто абзац о себе."], bullets: [] }]);
  assert.deepEqual(splitList("React, TypeScript; Figma"), ["React", "TypeScript", "Figma"]);
  const profile = { ...emptyProfile, summary: "О себе", courses: "-", languages: "• Русский — родной" };
  assert.deepEqual(filledSections(profile).map(([, key]) => key), ["summary", "languages"]);
});
