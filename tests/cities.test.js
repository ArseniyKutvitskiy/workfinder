import test from "node:test";
import assert from "node:assert/strict";
import { resumeCities, placeLabel } from "../shared/geo.ts";

test("several cities in the resume", () => {
  assert.deepEqual(resumeCities("Алматы или Москва", "Казахстан, Россия"), [
    { city: "Алматы", country: "KZ" },
    { city: "Москва", country: "RU" },
  ]);
  assert.deepEqual(resumeCities("Алматы, Москва"), resumeCities("Алматы или Москва"));
  // A country written after the city is not another city.
  assert.deepEqual(resumeCities("Алматы, Казахстан"), [{ city: "Алматы", country: "KZ" }]);
  assert.equal(resumeCities("Алматы, Астана, Шымкент, Караганда").length, 3);
});

test("resume place line", () => {
  assert.equal(placeLabel("Алматы", "Казахстан"), "Алматы, Казахстан");
  assert.equal(placeLabel("Алматы, Москва", "Казахстан, Россия"), "Алматы (Казахстан), Москва (Россия)");
  assert.equal(placeLabel("Алматы, Астана", "Казахстан"), "Алматы, Астана (Казахстан)");
  assert.equal(placeLabel("-", "-"), "");
});
