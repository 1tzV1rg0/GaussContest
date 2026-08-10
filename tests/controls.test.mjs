import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("filters stay interactive and exit active timed sessions on navigation", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.doesNotMatch(app, /gradeFilter", "yearFilter", "categoryFilter", "partFilter", "statusFilter"\]\.forEach/);
  assert.match(app, /function exitActiveSessionForNavigation/);
  assert.match(app, /\$\("gradeFilter"\)\.addEventListener\("change", \(event\) => \{\s+exitActiveSessionForNavigation\(\);/);
});

test("category practice resets conflicting filters and highlights active category", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /function startCategoryPractice\(category\)/);
  assert.match(app, /state\.part = "all";\s+state\.status = "all";/);
  assert.match(app, /startCategoryPractice\(button\.dataset\.category\)/);
  assert.match(app, /state\.category === category \? "is-active" : ""/);
});

test("local practice generator builds full varied contest sets", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /for \(let number = 1; number <= 50; number \+= 1\)/);
  assert.match(app, /partFor\(\(\(number - 1\) % 25\) \+ 1\)/);
  assert.match(app, /Math\.floor\(\(number - 1\) \/ 5\) % categories\.length/);
  assert.match(app, /seed = \(contest\.year - 2010\) \* 13 \+ contest\.grade \* 17 \+ number \* 19/);
});

test("timed contests sample 50 unique questions", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /sessionQuestionIds: \[\]/);
  assert.match(app, /function sampleQuestionIds\(questions, count\)/);
  assert.match(app, /const seenPrompts = new Set\(\)/);
  assert.match(app, /const seenIds = new Set\(\)/);
  assert.match(app, /if \(seenPrompts\.has\(question\.prompt\)\) continue/);
  assert.match(app, /unique\.push\(question\.id\)/);
  assert.match(app, /if \(seenIds\.has\(question\.id\)\) continue/);
  assert.match(app, /state\.sessionQuestionIds = sampleQuestionIds\(filteredQuestions\(\), 50\)/);
  assert.match(app, /const readyCount = state\.mode === "timed" \? Math\.min\(50, questions\.length\) : questions\.length/);
});

test("practice mode appends random unseen questions", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /practiceSeenIds: \[\]/);
  assert.match(app, /function appendRandomPracticeQuestion\(\)/);
  assert.match(app, /seenPrompts\.has\(question\.prompt\)/);
  assert.match(app, /!seen\.has\(question\.id\) && !seenPrompts\.has\(question\.prompt\)/);
  assert.match(app, /state\.sessionQuestionIds\.push\(next\.id\)/);
  assert.match(app, /appendRandomPracticeQuestion\(\);/);
});

test("contest setup appears before the question flow starts", async () => {
  const html = await readFile("index.html", "utf8");
  const app = await readFile("src/app.js", "utf8");
  assert.ok(html.indexOf('id="contestSetup"') < html.indexOf('id="practiceCourse"'));
  assert.match(html, /<article[^>]*class="question-card is-hidden"[^>]*id="practiceCourse"/);
  assert.match(app, /courseStarted: false/);
  assert.match(app, /function beginPractice\(\)/);
  assert.match(app, /"practiceCourse"\)\.classList\.toggle\("is-hidden", !state\.courseStarted\)/);
});

test("interface is split into setup practice and results pages", async () => {
  const html = await readFile("index.html", "utf8");
  const app = await readFile("src/app.js", "utf8");
  const css = await readFile("styles.css", "utf8");
  assert.match(html, /id="setupPage"/);
  assert.match(html, /id="practicePage"/);
  assert.match(html, /id="resultsPage"/);
  assert.match(html, /class="page-tabs"/);
  assert.match(app, /page: "setup"/);
  assert.match(app, /function renderPages\(\)/);
  assert.match(app, /state\.page = "practice"/);
  assert.match(app, /state\.page = "results"/);
  assert.match(css, /\.page-view/);
  assert.match(css, /#setupPage/);
});

test("revealing a solution locks the question against later answers", async () => {
  const app = await readFile("src/app.js", "utf8");
  const css = await readFile("styles.css", "utf8");
  assert.match(app, /solutionRevealed: true/);
  assert.match(app, /lockedBySolution/);
  assert.match(app, /state\.attempts\[question\.id\]\?\.solutionRevealed/);
  assert.match(app, /lockedBySolution \? "disabled" : ""/);
  assert.match(app, /attempt\.solutionRevealed \? "locked"/);
  assert.match(css, /\.answer-grid \.locked/);
});

test("generated questions can include visual diagrams", async () => {
  const html = await readFile("index.html", "utf8");
  const app = await readFile("src/app.js", "utf8");
  const css = await readFile("styles.css", "utf8");
  assert.match(html, /id="questionVisual"/);
  assert.match(app, /function renderVisual\(visual\)/);
  assert.match(app, /type: "barChart"/);
  assert.match(app, /type: "rectangle"/);
  assert.match(app, /type: "numberLine"/);
  assert.match(app, /\$\("questionVisual"\)\.innerHTML = renderVisual\(question\.visual\)/);
  assert.match(css, /\.question-visual/);
  assert.match(css, /\.bar-chart/);
});

test("algebra practice includes variable equations", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.match(app, /officialAlgebraItems/);
  assert.match(app, /From 2025 Gauss Grade 7 Q6/);
  assert.match(app, /From 2025 Gauss Grade 8 Q5/);
  assert.match(app, /Official CEMC \$\{sourceItem\.sourceYear\} Gauss Grade/);
  assert.match(app, /Prompt adapted for on-screen practice/);
  assert.doesNotMatch(app, /A number x has \$\{removed\} subtracted/);
});
