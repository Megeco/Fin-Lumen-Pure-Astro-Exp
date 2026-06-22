
import validationRegistry from "./natalChartValidationRegistry.js";

const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const low = v => String(v || "").toLowerCase();

function chartTypeLabel(chart = {}) {
  const t = low(chart.chartType || chart.chart_type || chart.id);
  if (t.includes("record")) return "Demerger / record-date";
  if (t.includes("listing")) return "Listing";
  if (t.includes("incorporation")) return "Incorporation";
  if (t.includes("statutory")) return "Statutory formation";
  if (t.includes("name")) return "Name-change / identity";
  if (t.includes("scheme") || t.includes("demerger")) return "Scheme / restructuring";
  if (t.includes("formation")) return "Formation / structural event";
  return chart.chartType || "Candidate";
}

function sourceConfidence(chart = {}) {
  const text = low(`${chart.confidence || ""} ${chart.source || ""} ${chart.auditStatus || ""} ${chart.v35Status || ""}`);
  if (text.includes("high") || text.includes("validated") || text.includes("locked")) return 82;
  if (text.includes("medium") || text.includes("accept")) return 68;
  if (text.includes("candidate") || text.includes("research")) return 56;
  if (text.includes("low") || text.includes("pending")) return 42;
  return 50;
}

function chartTypePrior(chart = {}) {
  const t = low(chart.chartType || chart.id);
  if (t.includes("record") || t.includes("demerger") || t.includes("scheme")) return 66;
  if (t.includes("listing")) return 62;
  if (t.includes("incorporation") || t.includes("statutory")) return 60;
  if (t.includes("name")) return 54;
  return 50;
}

function dateSpanScore(chart = {}) {
  const date = chart.date || chart.birthDate || null;
  if (!date) return 35;
  const year = Number(String(date).slice(0, 4));
  if (!Number.isFinite(year)) return 45;
  const currentYear = new Date().getUTCFullYear();
  const years = Math.max(0, currentYear - year);
  if (years >= 20) return 82;
  if (years >= 10) return 70;
  if (years >= 5) return 60;
  if (years >= 2) return 50;
  return 42;
}

function dataCompleteness(chart = {}) {
  let score = 20;
  if (chart.date) score += 25;
  if (chart.time) score += 20;
  if (chart.city) score += 15;
  if (chart.timezone) score += 10;
  if (chart.source) score += 10;
  return Math.max(0, Math.min(100, score));
}

function validationBoost(symbol, chart, validation) {
  if (!validation) return { fit: 0, reliability: 0, status: "CANDIDATE", reason: null };
  if (validation.preferredChartId && chart.id === validation.preferredChartId) {
    const isValidated = low(validation.status).includes("validated");
    return {
      fit: isValidated ? 18 : 10,
      reliability: isValidated ? 12 : 6,
      status: isValidated ? "LOCKED MANUAL" : "TENTATIVE BEST MATCH",
      reason: validation.reason || "Existing project validation prefers this chart."
    };
  }
  return { fit: 0, reliability: 0, status: "CANDIDATE", reason: null };
}

function contradictionPenalty(chart = {}, allCharts = []) {
  let penalty = 0;
  const source = low(`${chart.source || ""} ${chart.confidence || ""}`);
  if (source.includes("conflict") || source.includes("unresolved")) penalty += 18;
  if (!chart.date || !chart.time) penalty += 14;
  if (!chart.city) penalty += 8;
  if (allCharts.length > 2 && low(chart.chartType).includes("event")) penalty += 4;
  return Math.max(0, Math.min(100, penalty));
}

function scoreCandidate({ symbol, chart, allCharts, validation }) {
  const boost = validationBoost(symbol, chart, validation);
  const source = sourceConfidence(chart);
  const type = chartTypePrior(chart);
  const span = dateSpanScore(chart);
  const completeness = dataCompleteness(chart);
  const contradiction = contradictionPenalty(chart, allCharts);

  // v35.0 is intentionally conservative: this is a chart-selection readiness score,
  // not a statistical proof. True price-outcome scoring can plug into fitScore later.
  const fitScore = Math.round(Math.max(0, Math.min(100,
    0.36 * type + 0.26 * source + 0.18 * completeness + 0.20 * span + boost.fit - 0.20 * contradiction
  )));

  const reliabilityScore = Math.round(Math.max(0, Math.min(100,
    0.42 * source + 0.28 * completeness + 0.20 * span + boost.reliability - 0.25 * contradiction
  )));

  const stabilityScore = Math.round(Math.max(0, Math.min(100,
    0.50 * span + 0.25 * type + 0.25 * source - 0.15 * contradiction
  )));

  const selectionScore = Math.round(Math.max(0, Math.min(100,
    0.45 * fitScore + 0.30 * reliabilityScore + 0.20 * stabilityScore - 0.15 * contradiction
  )));

  return {
    ...chart,
    label: chartTypeLabel(chart),
    fitScore,
    reliabilityScore,
    stabilityScore,
    contradictionPenalty: contradiction,
    selectionScore,
    validationStatus: boost.status,
    validationReason: boost.reason
  };
}

function statusFor({ candidate, rank, gapToNext, validation }) {
  if (candidate.validationStatus === "LOCKED MANUAL") return "LOCKED MANUAL";
  if (rank === 0 && candidate.selectionScore < 55) return "INSUFFICIENT DATA";
  if (rank === 0 && gapToNext < 8) return "TENTATIVE BEST MATCH";
  if (rank === 0) return "BEST CURRENT MATCH";
  return "ALTERNATE VIEW";
}

export function evaluateNatalValidation(company = {}, options = {}) {
  const symbol = company.symbol || company.name || options.symbol || "";
  const charts = Array.isArray(company.charts) && company.charts.length
    ? company.charts
    : [{
        id: company.preferredChartId || company.chartType || "incorporation",
        chartType: company.chartType || "incorporation",
        date: company.birthDate || company.incorporationDate || company.listingDate,
        time: company.birthTime,
        city: company.city,
        country: company.country || "India",
        timezone: company.timezone || "Asia/Kolkata",
        confidence: company.confidence,
        source: company.source
      }].filter(c => c.date);

  const validation = validationRegistry?.stocks?.[symbol] || null;
  const scored = charts
    .filter(c => c?.date)
    .map(chart => scoreCandidate({ symbol, chart, allCharts: charts, validation }))
    .sort((a, b) => b.selectionScore - a.selectionScore);

  const best = scored[0] || null;
  const second = scored[1] || null;
  const gap = best && second ? best.selectionScore - second.selectionScore : 99;

  const candidates = scored.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    status: statusFor({ candidate, rank: index, gapToNext: index === 0 ? gap : 99, validation }),
    isBestCurrentMatch: index === 0,
    isSelectedView: candidate.id === (options.selectedChartId || company.selectedChartId || company.preferredChartId)
  }));

  const selected = candidates.find(c => c.isSelectedView) || best || null;
  const confidence =
    !best ? "Insufficient" :
    best.selectionScore >= 78 && gap >= 8 && best.reliabilityScore >= 68 ? "High" :
    best.selectionScore >= 65 && gap >= 5 ? "Medium-high" :
    best.selectionScore >= 55 ? "Medium" :
    "Low";

  const selectionStatus = best
    ? (best.validationStatus === "LOCKED MANUAL" ? "LOCKED MANUAL" : (gap < 8 ? "TENTATIVE BEST MATCH" : "BEST CURRENT MATCH"))
    : "INSUFFICIENT DATA";

  return {
    version: "v35.0-natal-validation-chart-selector",
    doctrine: "No composite charts. The best current astro-match is the default; all credible charts remain available for manual selection.",
    symbol,
    companyName: company.companyName || symbol,
    selectedChartId: selected?.id || null,
    displayedChartId: best?.id || selected?.id || null,
    bestChart: best ? {
      id: best.id,
      chartType: best.chartType,
      label: best.label,
      date: best.date,
      time: best.time,
      city: best.city,
      selectionScore: best.selectionScore,
      fitScore: best.fitScore,
      reliabilityScore: best.reliabilityScore,
      stabilityScore: best.stabilityScore,
      status: selectionStatus
    } : null,
    confidence,
    selectionStatus,
    topGap: best && second ? gap : null,
    alternateCount: Math.max(0, candidates.length - 1),
    candidates,
    notes: [
      "Legacy spreadsheet remarks are ignored; each imported chart starts as a candidate.",
      "This engine does not blend charts or create composite charts.",
      "If top charts are close, the main table should mark the result as tentative and the expanded card should compare both."
    ]
  };
}

export function natalValidationSummary(validation = {}) {
  const best = validation.bestChart;
  if (!best) return "Natal validation: insufficient candidate data.";
  const alt = validation.alternateCount ? `; ${validation.alternateCount} alternate chart${validation.alternateCount === 1 ? "" : "s"} available` : "";
  return `${best.label} · ${validation.selectionStatus} · score ${best.selectionScore}/100 · reliability ${best.reliabilityScore}/100${alt}`;
}

export default evaluateNatalValidation;
