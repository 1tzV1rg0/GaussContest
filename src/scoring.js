export const PART_POINTS = { A: 5, B: 6, C: 8 };
export const UNANSWERED_POINTS = 2;
export const UNANSWERED_LIMIT = 10;

export function partForQuestionNumber(number) {
  if (number <= 10) return "A";
  if (number <= 20) return "B";
  return "C";
}

export function pointsForPart(part) {
  return PART_POINTS[part] || 0;
}

export function scoreAttempt(questions, attempts) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let unansweredBonusCount = 0;
  let pointsEarned = 0;
  let totalPossible = 0;
  const byPart = {};
  const byCategory = {};

  for (const question of questions) {
    const points = question.pointValue || pointsForPart(question.part);
    const attempt = attempts[question.id] || {};
    const selected = attempt.selectedAnswer || "";
    const isAnswered = Boolean(selected);
    const isCorrect = selected === question.correctAnswer;
    const part = question.part;
    const category = question.primaryCategory;

    totalPossible += points;
    byPart[part] ||= { correct: 0, incorrect: 0, unanswered: 0, pointsEarned: 0, totalPossible: 0 };
    byCategory[category] ||= { correct: 0, incorrect: 0, unanswered: 0, pointsEarned: 0, totalPossible: 0 };
    byPart[part].totalPossible += points;
    byCategory[category].totalPossible += points;

    if (!isAnswered) {
      unanswered += 1;
      byPart[part].unanswered += 1;
      byCategory[category].unanswered += 1;
      if (unansweredBonusCount < UNANSWERED_LIMIT) {
        pointsEarned += UNANSWERED_POINTS;
        byPart[part].pointsEarned += UNANSWERED_POINTS;
        byCategory[category].pointsEarned += UNANSWERED_POINTS;
        unansweredBonusCount += 1;
      }
    } else if (isCorrect) {
      correct += 1;
      pointsEarned += points;
      byPart[part].correct += 1;
      byPart[part].pointsEarned += points;
      byCategory[category].correct += 1;
      byCategory[category].pointsEarned += points;
    } else {
      incorrect += 1;
      byPart[part].incorrect += 1;
      byCategory[category].incorrect += 1;
    }
  }

  return { correct, incorrect, unanswered, pointsEarned, totalPossible, byPart, byCategory };
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export function normalizeChoiceValue(value) {
  const trimmed = String(value).trim().toLowerCase();
  const fraction = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (fraction && Number(fraction[2]) !== 0) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    const divisor = gcd(numerator, denominator);
    return `fraction:${numerator / divisor}/${denominator / divisor}`;
  }

  const decimal = trimmed.match(/^-?\d+(?:\.\d+)?$/);
  if (decimal) return `number:${Number(trimmed)}`;

  return `text:${trimmed.replace(/\s+/g, " ")}`;
}

export function validateGaussDataset(data) {
  const allowedGrades = new Set([7, 8]);
  const allowedYears = new Set(Array.from({ length: 10 }, (_, i) => 2016 + i));
  const categories = new Set(data.categories || []);
  const errors = [];

  for (const contest of data.contests || []) {
    if (!allowedGrades.has(contest.grade)) errors.push(`${contest.id} has invalid grade ${contest.grade}`);
    if (!allowedYears.has(contest.year)) errors.push(`${contest.id} has invalid year ${contest.year}`);
    if (!/Gauss/i.test(contest.title)) errors.push(`${contest.id} is not labelled Gauss`);
    for (const key of ["contestPdfUrl", "solutionPdfUrl"]) {
      if (!String(contest[key] || "").startsWith("https://cemc.uwaterloo.ca/")) {
        errors.push(`${contest.id} has invalid ${key}`);
      }
    }
  }

  for (const question of data.questions || []) {
    if (!categories.has(question.primaryCategory)) errors.push(`${question.id} has invalid category`);
    if (Object.keys(question.choices || {}).sort().join("") !== "ABCDE") errors.push(`${question.id} must have choices A-E`);
    if (!question.correctAnswer || !question.choices?.[question.correctAnswer]) errors.push(`${question.id} has invalid answer key`);
    const normalizedChoices = Object.values(question.choices || {}).map(normalizeChoiceValue);
    if (new Set(normalizedChoices).size !== normalizedChoices.length) errors.push(`${question.id} has duplicate or equivalent choices`);
    if (!question.reviewStatus) errors.push(`${question.id} needs review status`);
    if (!question.sourceUrl) errors.push(`${question.id} needs a source URL`);
  }

  return errors;
}
