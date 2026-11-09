import { test } from "node:test";
import assert from "node:assert/strict";
import { chatSegments } from "../src/chatText.ts";

test("bold markdown becomes bold segments without asterisks", () => {
  assert.deepEqual(chatSegments("1. **HTML/CSS** — основы"), [
    { text: "1. ", bold: false },
    { text: "HTML/CSS", bold: true },
    { text: " — основы", bold: false },
  ]);
});

test("headings and bullet markers are cleaned", () => {
  const text = chatSegments("### Советы\n- Git\n* React").map((s) => s.text).join("");
  assert.equal(text, "Советы\n• Git\n• React");
});

test("unpaired markers mid-stream are hidden", () => {
  assert.equal(chatSegments("Навыки: **HTML").map((s) => s.text).join(""), "Навыки: HTML");
});

test("plain text is untouched", () => {
  assert.deepEqual(chatSegments("Привет! Как тебя зовут?"), [{ text: "Привет! Как тебя зовут?", bold: false }]);
});
