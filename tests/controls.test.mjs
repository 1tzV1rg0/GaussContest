import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("filters stay interactive and exit active timed sessions on navigation", async () => {
  const app = await readFile("src/app.js", "utf8");
  assert.doesNotMatch(app, /gradeFilter", "yearFilter", "categoryFilter", "partFilter", "statusFilter"\]\.forEach/);
  assert.match(app, /function exitActiveSessionForNavigation/);
  assert.match(app, /\$\("categoryFilter"\)\.addEventListener\("change", \(event\) => \{\s+exitActiveSessionForNavigation\(\);/);
});
