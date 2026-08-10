import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateGaussDataset } from "../src/scoring.js";

test("seed metadata contains only Gauss Grade 7 and 8 contests for 2016-2025", async () => {
  const data = JSON.parse(await readFile("data/gauss-metadata.json", "utf8"));
  const errors = validateGaussDataset(data);
  assert.deepEqual(errors, []);
  assert.equal(data.contests.length, 20);
  assert.deepEqual([...new Set(data.contests.map((contest) => contest.grade))].sort(), [7, 8]);
  assert.deepEqual([...new Set(data.contests.map((contest) => contest.year))].sort(), [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
});
