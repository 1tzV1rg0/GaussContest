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

test("validation rejects duplicate or equivalent answer choices", () => {
  const data = {
    categories: ["Counting, Probability & Statistics"],
    contests: [
      {
        id: "gauss-2025-7",
        title: "2025 Gauss Grade 7",
        year: 2025,
        grade: 7,
        contestPdfUrl: "https://cemc.uwaterloo.ca/example-contest.pdf",
        solutionPdfUrl: "https://cemc.uwaterloo.ca/example-solution.pdf"
      }
    ],
    questions: [
      {
        id: "bad-equivalent-choices",
        primaryCategory: "Counting, Probability & Statistics",
        choices: { A: "1/5", B: "1/2", C: "3/5", D: "2/3", E: "5/10" },
        correctAnswer: "B",
        reviewStatus: "reviewed",
        sourceUrl: "https://cemc.uwaterloo.ca/example-contest.pdf"
      }
    ]
  };

  assert.match(validateGaussDataset(data).join("\n"), /duplicate or equivalent choices/);
});
