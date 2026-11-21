import test from "node:test";
import assert from "node:assert/strict";
import { saysNo, asksForResume, contactIssue } from "../shared/schemas.ts";

test("short «no» answers", () => {
  for (const m of ["нет", "Нет.", "не было", "пока нет", "пропустить", "-", "no", "нету"]) assert.ok(saysNo(m), m);
  for (const m of ["нет, но был школьный проект по экономике", "Excel", "да"]) assert.ok(!saysNo(m), m);
});

test("asking for the resume", () => {
  for (const m of ["так и где?", "где резюме", "составь резюме", "ну давай", "Где?", "where is my resume"]) assert.ok(asksForResume(m), m);
  for (const m of ["Работал в кафе", "хочу работать где-нибудь в центре", "Английский C1"]) assert.ok(!asksForResume(m), m);
});

test("phone and email checks", () => {
  assert.equal(contactIssue("+777586288805"), "phone:12:7");
  assert.equal(contactIssue("+7 777 586 28 88"), "");
  assert.equal(contactIssue("8 (777) 586-28-88"), "");
  assert.equal(contactIssue("+998 90 123 45 67"), "");
  assert.equal(contactIssue("+998 90 123 45"), "phone:10:998");
  assert.equal(contactIssue("anna@mail.kz"), "");
  assert.equal(contactIssue("anna@mail"), "email");
  assert.equal(contactIssue("-"), "");
});
