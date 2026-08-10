const storageKey = "gauss-practice-state-v1";
const PART_POINTS = { A: 5, B: 6, C: 8 };
const UNANSWERED_POINTS = 2;
const UNANSWERED_LIMIT = 10;
const state = {
  data: null,
  grade: 7,
  year: 2025,
  category: "all",
  part: "all",
  status: "all",
  mode: "study",
  currentIndex: 0,
  attempts: {},
  elapsedSeconds: 0,
  paused: false,
  sessionActive: false,
  sessionContestId: ""
};

const $ = (id) => document.getElementById(id);
const choices = ["A", "B", "C", "D", "E"];

function scoreAttempt(questions, attempts) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let unansweredBonusCount = 0;
  let pointsEarned = 0;
  let totalPossible = 0;
  const byPart = {};
  const byCategory = {};

  for (const question of questions) {
    const points = question.pointValue || PART_POINTS[question.part] || 0;
    const attempt = attempts[question.id] || {};
    const selected = attempt.selectedAnswer || "";
    const part = question.part;
    const category = question.primaryCategory;

    totalPossible += points;
    byPart[part] ||= { correct: 0, incorrect: 0, unanswered: 0, pointsEarned: 0, totalPossible: 0 };
    byCategory[category] ||= { correct: 0, incorrect: 0, unanswered: 0, pointsEarned: 0, totalPossible: 0 };
    byPart[part].totalPossible += points;
    byCategory[category].totalPossible += points;

    if (!selected) {
      unanswered += 1;
      byPart[part].unanswered += 1;
      byCategory[category].unanswered += 1;
      if (unansweredBonusCount < UNANSWERED_LIMIT) {
        pointsEarned += UNANSWERED_POINTS;
        byPart[part].pointsEarned += UNANSWERED_POINTS;
        byCategory[category].pointsEarned += UNANSWERED_POINTS;
        unansweredBonusCount += 1;
      }
    } else if (selected === question.correctAnswer) {
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

function buildPracticeQuestions(data) {
  const templates = [
    {
      part: "A",
      pointValue: 5,
      category: "Number Sense & Arithmetic",
      prompt: (contest) => `Practice drill for ${contest.title}: What is ${contest.grade * 6} + ${contest.year % 100}?`,
      choices: (contest) => {
        const answer = contest.grade * 6 + (contest.year % 100);
        return { A: String(answer - 5), B: String(answer - 1), C: String(answer), D: String(answer + 3), E: String(answer + 8) };
      },
      answer: "C",
      solution: (contest) => `Compute ${contest.grade * 6} + ${contest.year % 100} = ${contest.grade * 6 + (contest.year % 100)}.`
    },
    {
      part: "A",
      pointValue: 5,
      category: "Algebra & Patterns",
      prompt: (contest) => `A pattern starts ${contest.grade}, ${contest.grade + 3}, ${contest.grade + 6}. What is the fifth term?`,
      choices: (contest) => {
        const answer = contest.grade + 12;
        return { A: String(answer - 6), B: String(answer - 3), C: String(answer), D: String(answer + 3), E: String(answer + 6) };
      },
      answer: "C",
      solution: (contest) => `The pattern adds 3 each time, so the fifth term is ${contest.grade} + 4 x 3 = ${contest.grade + 12}.`
    },
    {
      part: "B",
      pointValue: 6,
      category: "Geometry & Measurement",
      prompt: (contest) => `A rectangle has sides ${contest.grade + 2} cm and ${contest.grade - 2} cm. What is its perimeter?`,
      choices: (contest) => {
        const answer = 4 * contest.grade;
        return { A: `${answer - 4} cm`, B: `${answer - 2} cm`, C: `${answer} cm`, D: `${answer + 4} cm`, E: `${answer * 2} cm` };
      },
      answer: "C",
      solution: (contest) => `Perimeter is 2(length + width) = 2(${contest.grade + 2} + ${contest.grade - 2}) = ${4 * contest.grade} cm.`
    },
    {
      part: "B",
      pointValue: 6,
      category: "Counting, Probability & Statistics",
      prompt: () => "A spinner has 2 red sections, 3 blue sections, and 5 green sections. What is the probability of landing on blue?",
      choices: () => ({ A: "1/5", B: "3/10", C: "1/2", D: "3/5", E: "7/10" }),
      answer: "B",
      solution: () => "There are 10 equal sections and 3 are blue, so the probability is 3/10."
    },
    {
      part: "C",
      pointValue: 8,
      category: "Logic & Problem Solving",
      prompt: () => "In a code, every shape is either shaded or outlined, and every shaded shape is a circle. Which statement must be true?",
      choices: () => ({ A: "Every circle is shaded", B: "No outlined shape is a circle", C: "Every shaded shape is not outlined", D: "A shaded square is possible", E: "A shaded shape cannot be a square" }),
      answer: "E",
      solution: () => "If every shaded shape is a circle, then a shaded shape cannot be a square."
    }
  ];

  const existing = data.questions || [];
  const generated = [];
  for (const contest of data.contests) {
    for (const [index, template] of templates.entries()) {
      if (existing.some((question) => question.contestId === contest.id && question.primaryCategory === template.category)) continue;
      generated.push({
        id: `drill-${contest.id}-${index + 1}`,
        contestId: contest.id,
        number: index + 1,
        part: template.part,
        pointValue: template.pointValue,
        prompt: template.prompt(contest),
        choices: template.choices(contest),
        correctAnswer: template.answer,
        solutionText: template.solution(contest),
        primaryCategory: template.category,
        secondaryTags: ["local drill"],
        categoryConfidence: 1,
        reviewStatus: "reviewed",
        sourcePageReference: "Locally authored practice drill. Open official CEMC PDFs for original contest questions.",
        sourceUrl: contest.contestPdfUrl,
        difficulty: template.part === "C" ? "challenge" : template.part === "B" ? "medium" : "warmup"
      });
    }
  }
  return { ...data, questions: [...existing, ...generated] };
}

function loadState() {
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(storageKey)) || {});
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  const { data, ...persisted } = state;
  localStorage.setItem(storageKey, JSON.stringify(persisted));
}

function normalizeState() {
  if (![7, 8].includes(Number(state.grade))) state.grade = 7;
  state.grade = Number(state.grade);

  const yearsForGrade = state.data.contests
    .filter((contest) => contest.grade === state.grade)
    .map((contest) => contest.year);
  if (!yearsForGrade.includes(Number(state.year))) state.year = Math.max(...yearsForGrade);
  state.year = Number(state.year);

  if (!state.data.categories.includes(state.category) && state.category !== "all") state.category = "all";
  if (!["all", "A", "B", "C"].includes(state.part)) state.part = "all";
  if (!["all", "unanswered", "correct", "incorrect", "bookmarked"].includes(state.status)) state.status = "all";
  if (!["study", "timed"].includes(state.mode)) state.mode = "study";
  if (!Number.isFinite(Number(state.currentIndex)) || state.currentIndex < 0) state.currentIndex = 0;
  state.currentIndex = Number(state.currentIndex);
  state.elapsedSeconds = Math.max(0, Number(state.elapsedSeconds) || 0);
  state.sessionActive = Boolean(state.sessionActive);
  if (state.sessionContestId && !state.data.contests.some((contest) => contest.id === state.sessionContestId)) {
    state.sessionContestId = "";
    state.sessionActive = false;
  }
}

function currentContest() {
  return state.data.contests.find((contest) => contest.grade === state.grade && contest.year === state.year) || state.data.contests[0];
}

function visibleQuestions() {
  return state.data.questions.filter((question) => {
    const contest = state.data.contests.find((item) => item.id === question.contestId);
    const attempt = state.attempts[question.id] || {};
    const answered = Boolean(attempt.selectedAnswer);
    const correct = attempt.selectedAnswer === question.correctAnswer;
    return contest?.grade === state.grade
      && contest?.year === state.year
      && (state.category === "all" || question.primaryCategory === state.category)
      && (state.part === "all" || question.part === state.part)
      && (state.status === "all"
        || (state.status === "unanswered" && !answered)
        || (state.status === "correct" && correct)
        || (state.status === "incorrect" && answered && !correct)
        || (state.status === "bookmarked" && attempt.bookmarked));
  });
}

function allQuestionsForSelectedContest() {
  return state.data.questions.filter((question) => question.contestId === currentContest().id);
}

function clearSelectedContestAttempts() {
  const ids = new Set(allQuestionsForSelectedContest().map((question) => question.id));
  state.attempts = Object.fromEntries(
    Object.entries(state.attempts).filter(([questionId]) => !ids.has(questionId))
  );
}

function fillSelect(select, options, currentValue) {
  select.innerHTML = options.map(({ value, label }) => `<option value="${value}">${label}</option>`).join("");
  select.value = String(currentValue);
}

function hydrateControls() {
  const locked = state.mode === "timed" && state.sessionActive;
  fillSelect($("gradeFilter"), [{ value: 7, label: "Grade 7" }, { value: 8, label: "Grade 8" }], state.grade);
  fillSelect($("yearFilter"), [...new Set(state.data.contests.map((contest) => contest.year))]
    .sort((a, b) => b - a).map((year) => ({ value: year, label: year })), state.year);
  fillSelect($("categoryFilter"), [{ value: "all", label: "All categories" }, ...state.data.categories.map((category) => ({ value: category, label: category }))], state.category);
  fillSelect($("partFilter"), [
    { value: "all", label: "All parts" },
    { value: "A", label: "Part A" },
    { value: "B", label: "Part B" },
    { value: "C", label: "Part C" }
  ], state.part);
  $("statusFilter").value = state.status;
  ["gradeFilter", "yearFilter", "categoryFilter", "partFilter", "statusFilter"].forEach((id) => {
    $(id).disabled = locked;
  });
}

function setAttempt(questionId, patch) {
  state.attempts[questionId] = { ...(state.attempts[questionId] || {}), ...patch };
  saveState();
}

function renderContestStrip() {
  $("contestStrip").innerHTML = state.data.contests
    .filter((contest) => contest.grade === state.grade)
    .sort((a, b) => b.year - a.year)
    .map((contest) => `<button type="button" class="${contest.year === state.year ? "is-active" : ""}" data-year="${contest.year}" ${state.sessionActive ? "disabled" : ""}>${contest.year}</button>`)
    .join("");
}

function renderQuestion() {
  const questions = visibleQuestions();
  if (state.currentIndex >= questions.length) state.currentIndex = 0;
  const question = questions[state.currentIndex];
  const contest = currentContest();
  const inTimedContest = state.mode === "timed" && state.sessionActive;

  $("contestTitle").textContent = contest.title;
  $("contestMeta").textContent = inTimedContest
    ? `${questions.length} contest item${questions.length === 1 ? "" : "s"} shown. Answers are saved until you finish.`
    : `${questions.length} practice item${questions.length === 1 ? "" : "s"} shown. Official PDFs open in a new tab.`;

  if (!question) {
    $("questionBadge").textContent = "No matching questions";
    $("questionPrompt").textContent = "Adjust filters or choose a different year. Official contest PDFs are still available above.";
    $("choices").innerHTML = "";
    $("feedback").textContent = "";
    $("sourceLinks").innerHTML = sourceLinkMarkup(contest);
    $("showSolution").disabled = true;
    $("submitAnswer").disabled = true;
    return;
  }

  const attempt = state.attempts[question.id] || {};
  $("questionBadge").textContent = `Question ${question.number} - Part ${question.part} - ${question.pointValue} pts - ${question.primaryCategory}`;
  $("bookmarkQuestion").textContent = attempt.bookmarked ? "*" : "+";
  $("questionPrompt").textContent = question.prompt;
  $("choices").innerHTML = choices.map((choice) => `
    <label class="choice ${attempt.selectedAnswer === choice ? "selected" : ""}">
      <input type="radio" name="answer" value="${choice}" ${attempt.selectedAnswer === choice ? "checked" : ""}>
      <strong>${choice}</strong>
      <span>${question.choices[choice]}</span>
    </label>
  `).join("");
  $("notes").value = attempt.notes || "";
  $("feedback").textContent = attempt.feedback || "";
  if (inTimedContest && attempt.selectedAnswer) $("feedback").textContent = "Answer saved. Finish the contest to review feedback and solutions.";
  $("sourceLinks").innerHTML = sourceLinkMarkup(contest, question);
  $("showSolution").disabled = inTimedContest;
  $("submitAnswer").disabled = false;
  $("submitAnswer").textContent = inTimedContest ? "Save" : "Check";
}

function sourceLinkMarkup(contest, question) {
  const reference = question ? `<span>${question.sourcePageReference}</span>` : "";
  return `
    ${reference}
    <a href="${contest.contestPdfUrl}" target="_blank" rel="noreferrer">Official PDF</a>
    <a href="${contest.solutionPdfUrl}" target="_blank" rel="noreferrer">Solutions</a>
    ${contest.resultPdfUrl ? `<a href="${contest.resultPdfUrl}" target="_blank" rel="noreferrer">Results</a>` : ""}
  `;
}

function renderSummary() {
  const questions = allQuestionsForSelectedContest();
  const score = scoreAttempt(questions, state.attempts);
  $("scoreNumber").textContent = `${score.pointsEarned} / ${score.totalPossible}`;
  $("summaryGrid").innerHTML = [
    ["Correct", score.correct],
    ["Incorrect", score.incorrect],
    ["Unanswered", score.unanswered],
    ["Time Used", formatTime(state.elapsedSeconds)]
  ].map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");

  $("answerGrid").innerHTML = questions.map((question) => {
    const attempt = state.attempts[question.id] || {};
    const status = !attempt.selectedAnswer ? "open" : attempt.selectedAnswer === question.correctAnswer ? "right" : "wrong";
    return `<button type="button" class="${status}" data-jump-id="${question.id}" title="Question ${question.number}">${question.number}</button>`;
  }).join("");

  $("categoryProgress").innerHTML = Object.entries(score.byCategory).map(([category, item]) => {
    const done = item.correct + item.incorrect;
    const total = item.correct + item.incorrect + item.unanswered;
    return `<div class="meter"><span>${category}</span><strong>${item.pointsEarned}/${item.totalPossible}</strong><progress value="${done}" max="${total || 1}"></progress></div>`;
  }).join("");
}

function renderCategoryCards() {
  const contestQuestions = allQuestionsForSelectedContest();
  $("categoryCards").innerHTML = state.data.categories.map((category) => {
    const count = contestQuestions.filter((question) => question.primaryCategory === category).length;
    return `<button type="button" data-category="${category}"><strong>${category}</strong><span>${count} available</span></button>`;
  }).join("");
}

function renderTimer() {
  const remaining = state.mode === "timed" ? Math.max(0, 3600 - state.elapsedSeconds) : 3600;
  $("timerText").textContent = formatTime(remaining);
  $("startContest").disabled = state.sessionActive;
  $("pauseTimer").disabled = state.mode !== "timed" || !state.sessionActive;
  $("finishContest").disabled = state.mode !== "timed" || !state.sessionActive;
  $("pauseTimer").textContent = state.paused ? "Resume" : "Pause";
  $("startContest").textContent = state.sessionActive ? "Started" : "Start";
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function render() {
  hydrateControls();
  renderContestStrip();
  renderQuestion();
  renderSummary();
  renderCategoryCards();
  renderTimer();
  $("studyMode").classList.toggle("is-active", state.mode === "study");
  $("timedMode").classList.toggle("is-active", state.mode === "timed");
}

function startContest() {
  state.mode = "timed";
  state.category = "all";
  state.part = "all";
  state.status = "all";
  state.currentIndex = 0;
  state.elapsedSeconds = 0;
  state.paused = false;
  state.sessionActive = true;
  state.sessionContestId = currentContest().id;
  clearSelectedContestAttempts();
  saveState();
  render();
}

function finishContest(message) {
  if (!state.sessionActive) return;
  state.sessionActive = false;
  state.paused = false;
  saveState();
  render();
  if (message) $("feedback").textContent = message;
}

function exportCsv() {
  const questions = allQuestionsForSelectedContest();
  const rows = [["question", "part", "category", "selected", "correct", "elapsed_seconds", "bookmarked"]];
  for (const question of questions) {
    const attempt = state.attempts[question.id] || {};
    rows.push([
      question.number,
      question.part,
      question.primaryCategory,
      attempt.selectedAnswer || "",
      attempt.selectedAnswer ? String(attempt.selectedAnswer === question.correctAnswer) : "",
      attempt.elapsedSeconds || 0,
      Boolean(attempt.bookmarked)
    ]);
  }
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `${currentContest().id}-attempt-summary.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindEvents() {
  $("gradeFilter").addEventListener("change", (event) => {
    state.grade = Number(event.target.value);
    state.year = Math.max(...state.data.contests.filter((contest) => contest.grade === state.grade).map((contest) => contest.year));
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("yearFilter").addEventListener("change", (event) => {
    state.year = Number(event.target.value);
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("categoryFilter").addEventListener("change", (event) => {
    state.category = event.target.value;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("partFilter").addEventListener("change", (event) => {
    state.part = event.target.value;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("statusFilter").addEventListener("change", (event) => {
    state.status = event.target.value;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("contestStrip").addEventListener("click", (event) => {
    const button = event.target.closest("[data-year]");
    if (!button) return;
    state.year = Number(button.dataset.year);
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("choices").addEventListener("change", (event) => {
    const question = visibleQuestions()[state.currentIndex];
    setAttempt(question.id, { selectedAnswer: event.target.value, elapsedSeconds: state.elapsedSeconds });
    if (state.mode === "timed" && state.sessionActive) {
      setAttempt(question.id, { feedback: "Answer saved. Finish the contest to review feedback and solutions." });
    }
    renderQuestion();
  });
  $("submitAnswer").addEventListener("click", () => {
    const question = visibleQuestions()[state.currentIndex];
    if (!question) return;
    const attempt = state.attempts[question.id] || {};
    if (state.mode === "timed" && state.sessionActive) {
      setAttempt(question.id, { feedback: attempt.selectedAnswer ? "Answer saved. Finish the contest to review feedback and solutions." : "Choose an answer or leave it blank for unanswered scoring." });
      render();
      return;
    }
    const feedback = !attempt.selectedAnswer
      ? "Choose an answer first, or leave it blank for unanswered scoring."
      : attempt.selectedAnswer === question.correctAnswer
        ? `Correct. ${question.pointValue} points earned.`
        : `Not quite. The correct answer is ${question.correctAnswer}.`;
    setAttempt(question.id, { feedback });
    render();
  });
  $("showSolution").addEventListener("click", () => {
    const question = visibleQuestions()[state.currentIndex];
    if (!question) return;
    setAttempt(question.id, { feedback: question.solutionText });
    render();
  });
  $("nextQuestion").addEventListener("click", () => {
    state.currentIndex = Math.min(state.currentIndex + 1, Math.max(visibleQuestions().length - 1, 0));
    saveState();
    render();
  });
  $("prevQuestion").addEventListener("click", () => {
    state.currentIndex = Math.max(state.currentIndex - 1, 0);
    saveState();
    render();
  });
  $("bookmarkQuestion").addEventListener("click", () => {
    const question = visibleQuestions()[state.currentIndex];
    if (!question) return;
    setAttempt(question.id, { bookmarked: !(state.attempts[question.id] || {}).bookmarked });
    render();
  });
  $("notes").addEventListener("input", (event) => {
    const question = visibleQuestions()[state.currentIndex];
    if (question) setAttempt(question.id, { notes: event.target.value });
  });
  $("categoryCards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("answerGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump-id]");
    if (!button) return;
    state.category = "all";
    state.part = "all";
    state.status = "all";
    state.currentIndex = visibleQuestions().findIndex((question) => question.id === button.dataset.jumpId);
    if (state.currentIndex < 0) state.currentIndex = 0;
    saveState();
    render();
  });
  $("studyMode").addEventListener("click", () => {
    state.mode = "study";
    state.paused = false;
    state.sessionActive = false;
    saveState();
    render();
  });
  $("timedMode").addEventListener("click", () => {
    state.mode = "timed";
    state.sessionActive = false;
    state.paused = false;
    saveState();
    render();
  });
  $("startContest").addEventListener("click", startContest);
  $("pauseTimer").addEventListener("click", () => {
    state.paused = !state.paused;
    saveState();
    renderTimer();
  });
  $("finishContest").addEventListener("click", () => {
    finishContest("Contest finished. You can now check answers, review solutions, and export the summary.");
  });
  $("exportSummary").addEventListener("click", exportCsv);
}

async function init() {
  loadState();
  if (!window.GAUSS_DATA) {
    $("contestMeta").textContent = "Practice data could not load. Start the local server with npm start and reopen the app.";
    return;
  }
  state.data = buildPracticeQuestions(window.GAUSS_DATA);
  normalizeState();
  bindEvents();
  render();
  setInterval(() => {
    if (state.mode === "timed" && state.sessionActive && !state.paused && state.elapsedSeconds < 3600) {
      state.elapsedSeconds += 1;
      saveState();
      renderTimer();
      if (state.elapsedSeconds >= 3600) {
        finishContest("Time is up. Your contest has been submitted.");
      }
    }
  }, 1000);
}

init();
