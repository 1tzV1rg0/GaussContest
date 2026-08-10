(function () {
  var categories = [
    "Number Sense & Arithmetic",
    "Algebra & Patterns",
    "Geometry & Measurement",
    "Counting, Probability & Statistics",
    "Logic & Problem Solving"
  ];
  var years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
  var solutionNames = {
    2025: "2025GaussSolutions.pdf",
    2024: "2024GaussSolution.pdf",
    2023: "2023GaussSolution.pdf",
    2022: "2022GaussSolution.pdf",
    2021: "2021GaussSolution.pdf",
    2020: "2020GaussSolution.pdf",
    2019: "2019GaussSolution.pdf",
    2018: "2018GaussSolution.pdf",
    2017: "2017GaussSolution.pdf",
    2016: "2016GaussSolution.pdf"
  };
  var resultNames = {
    2025: "2025GaussResults.pdf",
    2024: "2024GaussResults_0.pdf",
    2023: "2023GaussResults.pdf",
    2022: "2022GaussResults.pdf",
    2021: "2021GaussResults.pdf",
    2020: "2020GaussResults.pdf",
    2019: "2019GaussResults.pdf",
    2018: "2018GaussResults.pdf",
    2017: "2017GaussResults.pdf",
    2016: "2016GaussResults.pdf"
  };
  var contests = [];
  years.forEach(function (year) {
    [7, 8].forEach(function (grade) {
      var base = "https://cemc.uwaterloo.ca/sites/default/files/documents/" + year + "/";
      contests.push({
        id: "gauss-" + year + "-" + grade,
        title: year + " Gauss Grade " + grade,
        year: year,
        grade: grade,
        contestPdfUrl: base + year + "Gauss" + grade + "Contest.pdf",
        solutionPdfUrl: base + solutionNames[year],
        resultPdfUrl: base + resultNames[year]
      });
    });
  });

  window.GAUSS_DATA = {
    listingUrl: "https://cemc.uwaterloo.ca/resources/past-contests?grade=All&academic_year=All&contest_category=13",
    source: "University of Waterloo CEMC Past Contests, Solutions and Results",
    rightsNote: "Official PDFs remain hosted by CEMC, University of Waterloo. This seed links to official resources and does not republish full contest content.",
    categories: categories,
    contests: contests,
    questions: []
  };
})();
