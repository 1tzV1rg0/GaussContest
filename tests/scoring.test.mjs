import test from "node:test";
import assert from "node:assert/strict";
import { scoreAttempt } from "../src/scoring.js";

const questions = [
  { id: "a1", part: "A", pointValue: 5, correctAnswer: "A", primaryCategory: "Number Sense & Arithmetic" },
  { id: "b1", part: "B", pointValue: 6, correctAnswer: "B", primaryCategory: "Algebra & Patterns" },
  { id: "c1", part: "C", pointValue: 8, correctAnswer: "C", primaryCategory: "Geometry & Measurement" }
];

test("Gauss scoring awards part points and no penalty for wrong answers", () => {
  const score = scoreAttempt(questions, {
    a1: { selectedAnswer: "A" },
    b1: { selectedAnswer: "E" },
    c1: { selectedAnswer: "C" }
  });
  assert.equal(score.pointsEarned, 13);
  assert.equal(score.correct, 2);
  assert.equal(score.incorrect, 1);
});

test("unanswered questions earn 2 points up to 10 questions", () => {
  const many = Array.from({ length: 12 }, (_, index) => ({
    id: `q${index}`,
    part: "A",
    pointValue: 5,
    correctAnswer: "A",
    primaryCategory: "Number Sense & Arithmetic"
  }));
  const score = scoreAttempt(many, {});
  assert.equal(score.unanswered, 12);
  assert.equal(score.pointsEarned, 20);
});
