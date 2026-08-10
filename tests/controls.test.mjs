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
