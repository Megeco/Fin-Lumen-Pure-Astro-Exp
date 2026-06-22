// JS wrapper for natal chart validation registry to avoid JSON import-assert compatibility issues.
const natalChartValidationRegistry = {
  "schemaVersion": "1.0",
  "method": "Compare each credible natal candidate against replay JSON and actual price-chart behaviour before promotion to production default.",
  "statuses": [
    "untested",
    "testing",
    "validated-preferred",
    "rejected",
    "inconclusive"
  ],
  "stocks": {
    "BSE.NS": {
      "preferredChartId": "listing",
      "status": "validated-preferred",
      "reason": "Project replay testing found the listing chart materially more accurate than incorporation."
    },
    "JIOFIN.NS": {
      "preferredChartId": "demerger-record-date",
      "status": "validated-preferred",
      "reason": "Project replay testing found the 20 Jul 2023 record-date chart most accurate."
    },
    "DIXON.NS": {
      "preferredChartId": "listing",
      "status": "testing",
      "reason": "Listing is the current research default; incorporation and listing must both be replay-tested."
    },
    "WPIL.NS": {
      "preferredChartId": null,
      "status": "testing",
      "researchCase": "cascading-break",
      "reason": "Retained to learn cascading-fall, failed-support, and structural-break signatures."
    }
  },
  "replayEvaluationTemplate": {
    "ticker": "",
    "replayDate": "",
    "chartId": "",
    "chartType": "",
    "resolvedDateTimePlace": "",
    "modelReading": "",
    "actualPriceBehaviour": "",
    "directionalFit": "unscored",
    "timingFit": "unscored",
    "pressureFit": "unscored",
    "expansionFit": "unscored",
    "episodeContinuityFit": "unscored",
    "notes": ""
  }
};

export default natalChartValidationRegistry;
