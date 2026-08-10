import { writeFile } from "node:fs/promises";

const listingUrl = "https://cemc.uwaterloo.ca/resources/past-contests?academic_year=All&block_config_key=past_contest%3A1srMgUG8ZWnN5_Mx6CmP5HeP-aleHwL0jgxyVUuVYE4&contest_category=13&grade=All";
const base = "https://cemc.uwaterloo.ca";
const years = new Set(Array.from({ length: 10 }, (_, index) => 2016 + index));
const grades = [7, 8];

function absoluteUrl(path) {
  return path.startsWith("http") ? path : `${base}${path}`;
}

async function pageHtml(page) {
  const url = page === 0 ? listingUrl : `${listingUrl}&page=${page}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function pdfLinks(html) {
  const links = new Set();
  const pattern = /href="([^"]*Gauss[^"]*?(?:Contest|Solution|Solutions|Results)[^"]*?\.pdf)"/gi;
  let match;
  while ((match = pattern.exec(html))) links.add(absoluteUrl(match[1].replaceAll("&amp;", "&")));
  return [...links];
}

const discovered = [];
for (let page = 0; page < 5; page += 1) {
  discovered.push(...pdfLinks(await pageHtml(page)));
}

const contests = [];
for (const year of years) {
  const yearLinks = [...new Set(discovered.filter((url) => url.includes(`/${year}/`)))];
  for (const grade of grades) {
    const contestPdfUrl = yearLinks.find((url) => url.includes(`Gauss${grade}Contest.pdf`));
    const solutionPdfUrl = yearLinks.find((url) => /GaussSolutions?\.pdf$/i.test(url));
    const resultPdfUrl = yearLinks.find((url) => /GaussResults(?:_0)?\.pdf$/i.test(url)) || "";
    if (!contestPdfUrl || !solutionPdfUrl) throw new Error(`Missing contest or solution for ${year} grade ${grade}`);
    contests.push({
      id: `gauss-${year}-${grade}`,
      title: `${year} Gauss Grade ${grade}`,
      year,
      grade,
      contestPdfUrl,
      solutionPdfUrl,
      resultPdfUrl
    });
  }
}

const seed = {
  listingUrl: "https://cemc.uwaterloo.ca/resources/past-contests?grade=All&academic_year=All&contest_category=13",
  source: "University of Waterloo CEMC Past Contests, Solutions and Results",
  rightsNote: "Official PDFs remain hosted by CEMC, University of Waterloo. This seed links to official resources and does not republish full contest content.",
  categories: [
    "Number Sense & Arithmetic",
    "Algebra & Patterns",
    "Geometry & Measurement",
    "Counting, Probability & Statistics",
    "Logic & Problem Solving"
  ],
  contests: contests.sort((a, b) => b.year - a.year || a.grade - b.grade),
  questions: []
};

await writeFile("data/gauss-metadata.synced.json", `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Wrote ${seed.contests.length} contest records to data/gauss-metadata.synced.json`);
