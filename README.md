# Gauss Contest Practice

A compact, rights-conscious practice app for University of Waterloo CEMC Gauss Grade 7 and Grade 8 contest preparation.

The app starts directly in the practice interface. Students and teachers can filter by the only supported grades, year, category, part, and answer status; answer sample practice items; use study or 60-minute timed mode; bookmark questions; keep notes; resume locally; view score breakdowns; export attempts as CSV; and jump to the official CEMC contest, solution, and result PDFs.

## Run Locally

```bash
npm start
```

Then open `http://localhost:4173`.

No install step is required for the first version because the app uses only browser JavaScript and Node's built-in test runner.

## Test

```bash
npm test
```

The tests cover Gauss scoring rules and seed metadata validation.

## Data Sync

The cached metadata is in `data/gauss-metadata.json`. It includes only Gauss Grade 7 and Grade 8 official PDF links for 2016 through 2025.

To refresh discovered official links from CEMC:

```bash
npm run sync:data
```

This writes `data/gauss-metadata.synced.json` for review. It intentionally does not overwrite the reviewed seed file or import question text.

## Rights And Attribution

Official contest materials are copyright University of Waterloo CEMC. This public app links to official CEMC PDFs and shows source attribution instead of republishing full contest booklets as a question bank.

The included practice questions are locally authored samples used to demonstrate the workflow. If a school or private deployment has permission to import CEMC questions, add those questions to the seed with:

- the official source URL
- source page reference
- answer key and solution text
- exactly one primary category from the controlled taxonomy
- optional secondary tags
- category confidence
- educator review status

## PDF Extraction Limitations

Full PDF parsing is not enabled in this version. Diagrams, fractions, tables, and math notation from contest PDFs require careful review. A future importer should preserve official PDF links as the source of truth, flag low-confidence extraction, and fall back to official PDF pages or reviewed page crops when text extraction is incomplete.

## Scoring

Gauss scoring is implemented as:

- Part A questions: 5 points
- Part B questions: 6 points
- Part C questions: 8 points
- no penalty for incorrect answers
- unanswered questions: 2 points each, up to 10 unanswered questions
- timed mode: 60 minutes
