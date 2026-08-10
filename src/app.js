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
  sessionContestId: "",
  courseStarted: false
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
  const existing = data.questions || [];
  const generated = [];
  const letters = ["A", "B", "C", "D", "E"];
  const categories = data.categories;

  function partFor(number) {
    if (number <= 10) return "A";
    if (number <= 20) return "B";
    return "C";
  }

  function makeChoices(answer, seed, formatter = (value) => String(value)) {
    const deltas = [-9, -4, -1, 3, 7, 11, -13, 15];
    const values = [answer];
    for (const delta of deltas) {
      const value = answer + delta + (seed % 3);
      if (value > 0 && !values.includes(value)) values.push(value);
      if (values.length === 5) break;
    }
    while (values.length < 5) values.push(answer + values.length * 5 + seed);

    const correctIndex = seed % 5;
    const ordered = values.slice(1, 5);
    ordered.splice(correctIndex, 0, answer);
    return {
      choices: Object.fromEntries(letters.map((letter, index) => [letter, formatter(ordered[index])])),
      answer: letters[correctIndex]
    };
  }

  function generatedQuestion(contest, number) {
    const seed = (contest.year - 2010) * 13 + contest.grade * 17 + number * 19;
    const part = partFor(number);
    const category = categories[Math.floor((number - 1) / 5) % categories.length];
    const pointValue = PART_POINTS[part];
    let prompt;
    let solutionText;
    let choiceData;
    let visual;

    if (category === "Number Sense & Arithmetic") {
      const packs = contest.grade + number;
      const each = (contest.year % 10) + 4 + (number % 3);
      const bonus = contest.grade * 2 + number;
      const answer = packs * each + bonus;
      prompt = `${contest.title} local drill Q${number}: ${packs} practice packs each contain ${each} cards. The teacher adds ${bonus} extra cards. How many cards are there altogether?`;
      solutionText = `${packs} x ${each} + ${bonus} = ${answer}.`;
      choiceData = makeChoices(answer, seed);
      visual = { type: "groups", title: "Practice packs", count: Math.min(packs, 18), perGroup: each, bonus };
    } else if (category === "Algebra & Patterns") {
      const variant = seed % 4;
      if (variant === 0) {
        const multiplier = 2 + (number % 5);
        const x = contest.grade + 2 + (number % 7);
        const addend = 3 + (contest.year % 6);
        const total = multiplier * x + addend;
        prompt = `Solve for x: ${multiplier}x + ${addend} = ${total}.`;
        solutionText = `Subtract ${addend} from both sides to get ${multiplier}x = ${total - addend}. Then x = ${x}.`;
        choiceData = makeChoices(x, seed, (value) => `x = ${value}`);
        visual = { type: "numberLine", title: "Equation balance", start: addend, step: multiplier, term: x + 1 };
      } else if (variant === 1) {
        const x = 2 + (contest.grade % 5) + (number % 4);
        const coefficient = 3 + (number % 4);
        const constant = 4 + (contest.year % 5);
        const answer = coefficient * x - constant;
        prompt = `If x = ${x}, what is the value of ${coefficient}x - ${constant}?`;
        solutionText = `Substitute ${x} for x: ${coefficient}(${x}) - ${constant} = ${coefficient * x} - ${constant} = ${answer}.`;
        choiceData = makeChoices(answer, seed);
        visual = { type: "groups", title: `${coefficient} groups of x`, count: coefficient, perGroup: x, bonus: -constant };
      } else if (variant === 2) {
        const x = contest.grade + 4 + (number % 6);
        const removed = 2 + (number % 5);
        const result = x - removed;
        const answer = x;
        prompt = `A number x has ${removed} subtracted from it, and the result is ${result}. What is x?`;
        solutionText = `The equation is x - ${removed} = ${result}. Add ${removed} to both sides: x = ${answer}.`;
        choiceData = makeChoices(answer, seed, (value) => `x = ${value}`);
        visual = { type: "numberLine", title: "Undo subtraction", start: result, step: removed, term: 2 };
      } else {
        const first = contest.grade + (contest.year % 7) + number;
        const step = 2 + (number % 5);
        const term = 4 + (number % 4);
        const answer = first + (term - 1) * step;
        prompt = `A pattern follows the rule value = ${first} + ${step}(n - 1). What is the value when n = ${term}?`;
        solutionText = `Substitute n = ${term}: ${first} + ${step}(${term - 1}) = ${answer}.`;
        choiceData = makeChoices(answer, seed);
        visual = { type: "numberLine", title: "Linear rule", start: first, step, term };
      }
    } else if (category === "Geometry & Measurement") {
      const length = contest.grade + 3 + (number % 6);
      const width = 4 + (contest.year % 5) + (number % 3);
      const answer = 2 * (length + width);
      prompt = `A rectangle has length ${length} cm and width ${width} cm. What is its perimeter?`;
      solutionText = `The perimeter is 2(${length} + ${width}) = ${answer} cm.`;
      choiceData = makeChoices(answer, seed, (value) => `${value} cm`);
      visual = { type: "rectangle", title: "Rectangle dimensions", length, width };
    } else if (category === "Counting, Probability & Statistics") {
      const red = 2 + (number % 4);
      const blue = 3 + (contest.grade % 3);
      const green = 4 + (contest.year % 4);
      const answer = red + blue;
      const total = red + blue + green;
      prompt = `A bag has ${red} red tiles, ${blue} blue tiles, and ${green} green tiles. How many tiles are not green?`;
      solutionText = `The tiles that are not green are red or blue: ${red} + ${blue} = ${answer}. There are ${total} tiles total.`;
      choiceData = makeChoices(answer, seed);
      visual = { type: "barChart", title: "Tiles by colour", values: [{ label: "Red", value: red }, { label: "Blue", value: blue }, { label: "Green", value: green }] };
    } else {
      const start = 1 + (seed % 5);
      const every = 2 + (number % 4);
      const turns = 4 + (contest.grade % 3);
      const answer = start + every * turns;
      prompt = `Mira starts on space ${start}. She moves forward ${every} spaces on each of ${turns} turns. Which space is she on after the last turn?`;
      solutionText = `After ${turns} turns, Mira moves ${every} x ${turns} = ${every * turns} spaces, so she lands on ${answer}.`;
      choiceData = makeChoices(answer, seed);
      visual = { type: "path", title: "Board movement", start, every, turns, end: answer };
    }

    return {
      id: `drill-${contest.id}-${number}`,
      contestId: contest.id,
      number,
      part,
      pointValue,
      prompt,
      choices: choiceData.choices,
      correctAnswer: choiceData.answer,
      solutionText,
      visual,
      primaryCategory: category,
      secondaryTags: ["local drill"],
      categoryConfidence: 1,
      reviewStatus: "reviewed",
      sourcePageReference: "Locally authored practice drill. Open official CEMC PDFs for original contest questions.",
      sourceUrl: contest.contestPdfUrl,
      difficulty: part === "C" ? "challenge" : part === "B" ? "medium" : "warmup"
    };
  }

  for (const contest of data.contests) {
    for (let number = 1; number <= 25; number += 1) generated.push(generatedQuestion(contest, number));
  }
  return { ...data, questions: [...existing, ...generated] };
}

function renderVisual(visual) {
  if (!visual) return "";
  if (visual.type === "rectangle") {
    return `
      <figure class="question-visual" aria-label="${visual.title}">
        <figcaption>${visual.title}</figcaption>
        <div class="rect-diagram" style="--rect-w:${visual.length}; --rect-h:${visual.width};">
          <span class="rect-label rect-length">${visual.length} cm</span>
          <span class="rect-label rect-width">${visual.width} cm</span>
        </div>
      </figure>
    `;
  }

  if (visual.type === "barChart") {
    const max = Math.max(...visual.values.map((item) => item.value));
    return `
      <figure class="question-visual" aria-label="${visual.title}">
        <figcaption>${visual.title}</figcaption>
        <div class="bar-chart">
          ${visual.values.map((item) => `<div class="bar-row"><span>${item.label}</span><div class="bar-track"><i style="width:${(item.value / max) * 100}%"></i></div><strong>${item.value}</strong></div>`).join("")}
        </div>
      </figure>
    `;
  }

  if (visual.type === "numberLine") {
    const values = Array.from({ length: visual.term }, (_, index) => visual.start + index * visual.step);
    return `
      <figure class="question-visual" aria-label="${visual.title}">
        <figcaption>${visual.title}</figcaption>
        <div class="number-line">
          ${values.map((value, index) => `<span class="${index === values.length - 1 ? "target" : ""}">${value}</span>`).join("")}
        </div>
      </figure>
    `;
  }

  if (visual.type === "groups") {
    const bonusText = visual.bonus < 0 ? String(visual.bonus) : `+${visual.bonus}`;
    return `
      <figure class="question-visual" aria-label="${visual.title}">
        <figcaption>${visual.title}</figcaption>
        <div class="tile-groups">
          ${Array.from({ length: visual.count }, () => `<span>${visual.perGroup}</span>`).join("")}
          <strong>${bonusText}</strong>
        </div>
      </figure>
    `;
  }

  if (visual.type === "path") {
    const spaces = Array.from({ length: Math.min(visual.end + 1, 24) }, (_, index) => index);
    return `
      <figure class="question-visual" aria-label="${visual.title}">
        <figcaption>${visual.title}</figcaption>
        <div class="board-path">
          ${spaces.map((space) => `<span class="${space === visual.start ? "start" : space === visual.end ? "end" : ""}">${space}</span>`).join("")}
        </div>
      </figure>
    `;
  }

  return "";
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
  state.sessionActive = false;
  state.courseStarted = false;
  if (state.sessionContestId && !state.data.contests.some((contest) => contest.id === state.sessionContestId)) {
    state.sessionContestId = "";
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
  const inTimedContest = state.mode === "timed" && state.sessionActive;

  $("contestTitle").textContent = contest.title;
  $("contestMeta").textContent = !state.courseStarted
    ? "Complete contest setup before starting the question flow."
    : inTimedContest
    ? `${questions.length} contest item${questions.length === 1 ? "" : "s"} shown. Answers are saved until you finish.`
    : `${questions.length} practice item${questions.length === 1 ? "" : "s"} shown. Official PDFs open in a new tab.`;

  if (!question) {
    $("questionBadge").textContent = "No matching questions";
    $("questionPrompt").textContent = "Adjust filters or choose a different year. Official contest PDFs are still available above.";
    $("questionVisual").innerHTML = "";
    $("choices").innerHTML = "";
    $("feedback").textContent = "";
    $("sourceLinks").innerHTML = sourceLinkMarkup(contest);
    $("showSolution").disabled = true;
    $("submitAnswer").disabled = true;
    return;
  }

  const attempt = state.attempts[question.id] || {};
  const lockedBySolution = Boolean(attempt.solutionRevealed);
  $("questionBadge").textContent = `Question ${question.number} - Part ${question.part} - ${question.pointValue} pts - ${question.primaryCategory}`;
  $("bookmarkQuestion").textContent = attempt.bookmarked ? "*" : "+";
  $("questionPrompt").textContent = question.prompt;
  $("questionVisual").innerHTML = renderVisual(question.visual);
  $("choices").innerHTML = choices.map((choice) => `
    <label class="choice ${attempt.selectedAnswer === choice ? "selected" : ""}">
      <input type="radio" name="answer" value="${choice}" ${attempt.selectedAnswer === choice ? "checked" : ""} ${lockedBySolution ? "disabled" : ""}>
      <strong>${choice}</strong>
      <span>${question.choices[choice]}</span>
    </label>
  `).join("");
  $("notes").value = attempt.notes || "";
  $("feedback").textContent = lockedBySolution ? `${attempt.feedback || question.solutionText} This question is locked because the solution was revealed.` : attempt.feedback || "";
  if (inTimedContest && attempt.selectedAnswer) $("feedback").textContent = "Answer saved. Finish the contest to review feedback and solutions.";
  $("sourceLinks").innerHTML = sourceLinkMarkup(contest, question);
  $("showSolution").disabled = inTimedContest || lockedBySolution;
  $("submitAnswer").disabled = lockedBySolution;
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
    const status = attempt.solutionRevealed ? "locked" : !attempt.selectedAnswer ? "open" : attempt.selectedAnswer === question.correctAnswer ? "right" : "wrong";
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
    return `<button type="button" class="${state.category === category ? "is-active" : ""}" data-category="${category}"><strong>${category}</strong><span>${count} available</span></button>`;
  }).join("");
}

function renderSetup() {
  const questions = visibleQuestions();
  const contest = currentContest();
  const topic = state.category === "all" ? "all categories" : state.category;
  const part = state.part === "all" ? "all parts" : `Part ${state.part}`;
  $("setupSummary").textContent = `${contest.title} - ${topic} - ${part} - ${questions.length} question${questions.length === 1 ? "" : "s"} ready.`;
  $("contestSetup").classList.toggle("is-complete", state.courseStarted);
  $("practiceCourse").classList.toggle("is-hidden", !state.courseStarted);
}

function renderTimer() {
  const remaining = state.mode === "timed" ? Math.max(0, 3600 - state.elapsedSeconds) : 3600;
  $("timerText").textContent = formatTime(remaining);
  $("pauseTimer").disabled = state.mode !== "timed" || !state.sessionActive;
  $("finishContest").disabled = state.mode !== "timed" || !state.sessionActive;
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
  renderSetup();
  renderTimer();
  $("studyMode").classList.toggle("is-active", state.mode === "study");
  $("timedMode").classList.toggle("is-active", state.mode === "timed");
}

function exitActiveSessionForNavigation() {
  state.sessionActive = false;
  state.paused = false;
  state.courseStarted = false;
}

function startCategoryPractice(category) {
  exitActiveSessionForNavigation();
  state.mode = "study";
  state.category = category;
  state.part = "all";
  state.status = "all";
  state.currentIndex = 0;
  state.courseStarted = true;
  saveState();
  render();
}

function beginPractice() {
  exitActiveSessionForNavigation();
  state.mode = "study";
  state.currentIndex = 0;
  state.courseStarted = true;
  saveState();
  render();
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
  state.courseStarted = true;
  clearSelectedContestAttempts();
  saveState();
  render();
}

function finishContest(message) {
  if (!state.sessionActive) return;
  state.sessionActive = false;
  state.paused = false;
  state.courseStarted = true;
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
    exitActiveSessionForNavigation();
    state.grade = Number(event.target.value);
    state.year = Math.max(...state.data.contests.filter((contest) => contest.grade === state.grade).map((contest) => contest.year));
    state.category = "all";
    state.part = "all";
    state.status = "all";
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("yearFilter").addEventListener("change", (event) => {
    exitActiveSessionForNavigation();
    state.year = Number(event.target.value);
    state.status = "all";
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("categoryFilter").addEventListener("change", (event) => {
    startCategoryPractice(event.target.value);
  });
  $("partFilter").addEventListener("change", (event) => {
    exitActiveSessionForNavigation();
    state.part = event.target.value;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("statusFilter").addEventListener("change", (event) => {
    exitActiveSessionForNavigation();
    state.status = event.target.value;
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("contestStrip").addEventListener("click", (event) => {
    const button = event.target.closest("[data-year]");
    if (!button) return;
    exitActiveSessionForNavigation();
    state.year = Number(button.dataset.year);
    state.status = "all";
    state.currentIndex = 0;
    saveState();
    render();
  });
  $("choices").addEventListener("change", (event) => {
    const question = visibleQuestions()[state.currentIndex];
    if (!question || state.attempts[question.id]?.solutionRevealed) {
      renderQuestion();
      return;
    }
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
    setAttempt(question.id, { feedback: question.solutionText, solutionRevealed: true });
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
    startCategoryPractice(button.dataset.category);
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
    state.courseStarted = false;
    saveState();
    render();
  });
  $("timedMode").addEventListener("click", () => {
    state.mode = "timed";
    state.sessionActive = false;
    state.paused = false;
    state.courseStarted = false;
    saveState();
    render();
  });
  $("beginPractice").addEventListener("click", beginPractice);
  $("setupTimedStart").addEventListener("click", startContest);
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
