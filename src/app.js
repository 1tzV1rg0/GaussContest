import { scoreAttempt } from "./scoring.js";

const storageKey = "gauss-practice-state-v1";
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
  paused: false
};

const $ = (id) => document.getElementById(id);
const choices = ["A", "B", "C", "D", "E"];

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

function fillSelect(select, options, currentValue) {
  select.innerHTML = options.map(({ value, label }) => `<option value="${value}">${label}</option>`).join("");
  select.value = String(currentValue);
}

function hydrateControls() {
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
}

function setAttempt(questionId, patch) {
  state.attempts[questionId] = { ...(state.attempts[questionId] || {}), ...patch };
  saveState();
}

function renderContestStrip() {
  $("contestStrip").innerHTML = state.data.contests
    .filter((contest) => contest.grade === state.grade)
    .sort((a, b) => b.year - a.year)
    .map((contest) => `<button type="button" class="${contest.year === state.year ? "is-active" : ""}" data-year="${contest.year}">${contest.year}</button>`)
    .join("");
}

function renderQuestion() {
  const questions = visibleQuestions();
  if (state.currentIndex >= questions.length) state.currentIndex = 0;
  const question = questions[state.currentIndex];
  const contest = currentContest();

  $("contestTitle").textContent = contest.title;
  $("contestMeta").textContent = `${questions.length} practice item${questions.length === 1 ? "" : "s"} shown. Official PDFs open in a new tab.`;

  if (!question) {
    $("questionBadge").textContent = "No matching questions";
    $("questionPrompt").textContent = "Adjust filters or choose a different year. Official contest PDFs are still available above.";
    $("choices").innerHTML = "";
    $("feedback").textContent = "";
    $("sourceLinks").innerHTML = sourceLinkMarkup(contest);
    return;
  }

  const attempt = state.attempts[question.id] || {};
  $("questionBadge").textContent = `Question ${question.number} - Part ${question.part} - ${question.pointValue} pts - ${question.primaryCategory}`;
  $("bookmarkQuestion").textContent = attempt.bookmarked ? "★" : "☆";
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
  $("sourceLinks").innerHTML = sourceLinkMarkup(contest, question);
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
  $("pauseTimer").disabled = state.mode !== "timed";
  $("pauseTimer").textContent = state.paused ? "Resume" : "Pause";
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
    renderQuestion();
  });
  $("submitAnswer").addEventListener("click", () => {
    const question = visibleQuestions()[state.currentIndex];
    if (!question) return;
    const attempt = state.attempts[question.id] || {};
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
    saveState();
    render();
  });
  $("timedMode").addEventListener("click", () => {
    state.mode = "timed";
    state.elapsedSeconds = 0;
    state.paused = false;
    saveState();
    render();
  });
  $("pauseTimer").addEventListener("click", () => {
    state.paused = !state.paused;
    saveState();
    renderTimer();
  });
  $("exportSummary").addEventListener("click", exportCsv);
}

async function init() {
  loadState();
  const response = await fetch("data/gauss-metadata.json");
  state.data = await response.json();
  bindEvents();
  render();
  setInterval(() => {
    if (state.mode === "timed" && !state.paused && state.elapsedSeconds < 3600) {
      state.elapsedSeconds += 1;
      saveState();
      renderTimer();
    }
  }, 1000);
}

init();
