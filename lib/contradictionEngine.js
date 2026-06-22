import { TRM_BLOCK_FRESH_CLASSES, trmScore, trmNatalReliability } from "./finLumenCapitalLanguage.js";

const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const u = v => String(v || "").toUpperCase();

function add(flags, code, severity, message, capitalEffect = "WATCH") {
  flags.push({ code, severity, message, capitalEffect });
}

function severityRank(severity) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[u(severity)] || 0;
}

export function buildContradictionReport({
  replay = {},
  windows = {},
  transitReceptorFit = null,
  capitalHorizon = {},
  currentDormancy = null,
  strategic = null,
  modelDisagreements = []
} = {}) {
  const flags = [];
  const cls = u(transitReceptorFit?.expressionClass);
  const expression = trmScore(transitReceptorFit, "expressionScore", 0);
  const receptor = trmScore(transitReceptorFit, "natalReceptorStrength", 0);
  const sector = trmScore(transitReceptorFit, "sectorThemeFit", 0);
  const pressure = trmScore(transitReceptorFit, "pressureInterference", 0);
  const network = trmScore(transitReceptorFit, "supportNetworkQuality", 0);
  const fundamentals = trmScore(transitReceptorFit, "fundamentalTransmission", 0);
  const natalReliability = trmNatalReliability(transitReceptorFit, 0);

  if (TRM_BLOCK_FRESH_CLASSES.has(cls) && /YES|BUILD|ACCUMULATE|CORE/.test(u(capitalHorizon?.strategic?.verdict))) {
    add(flags, "TRM_BLOCK_VS_STRATEGIC_BUILD", "HIGH", "Transit receptor class blocks fresh strategic capital while strategic verdict is constructive.", "CAP_STRATEGIC");
  }

  if (cls === "RERATING_TRANSIT" && (receptor < 60 || sector < 60 || pressure > 55 || network < 55 || fundamentals < 50)) {
    add(flags, "RERATING_WITH_FAILED_HARD_STOP", "CRITICAL", "Rerating label violates one or more hard-stop gates.", "CAP_LANGUAGE");
  }

  if (expression >= 70 && pressure >= 65) {
    add(flags, "HIGH_EXPRESSION_HIGH_PRESSURE", "HIGH", "Strong expansion score coexists with high pressure interference; classify as contested until pressure is resolved.", "CAP_SIZE");
  }

  if (expression >= 65 && natalReliability < 60) {
    add(flags, "HIGH_SIGNAL_LOW_NATAL_RELIABILITY", "HIGH", "Cycle signal is strong but natal reliability is below production-grade confidence.", "CAP_CONFIDENCE");
  } else if (natalReliability > 0 && natalReliability < 45) {
    add(flags, "LOW_NATAL_RELIABILITY", "MEDIUM", "Natal chart confidence is low; cap conviction and avoid high-certainty language.", "CAP_CONFIDENCE");
  }

  if (sector < 40 && receptor < 60 && /YES|BUILD|ACCUMULATE|CORE/.test(u(capitalHorizon?.strategic?.verdict))) {
    add(flags, "SECTOR_RECEPTOR_MISMATCH", "HIGH", "Sector eligibility and natal receptor are both weak despite constructive capital language.", "CAP_STRATEGIC");
  }

  if (fundamentals < 50 && /YES|BUILD|PASSIVE|LONGER/.test(u(capitalHorizon?.passiveLongTerm?.verdict))) {
    add(flags, "FUNDAMENTAL_TRANSMISSION_LOW_PASSIVE_APPROVAL", "HIGH", "Fundamental transmission is too weak for passive long-term approval.", "CAP_PASSIVE");
  }

  if (currentDormancy?.contradiction) {
    add(flags, "DORMANCY_CONTRADICTION", "MEDIUM", "Dormancy label conflicts with active current support; narrative should explain active churn rather than suppress present support.", "CAP_TIMING");
  }

  if (Array.isArray(modelDisagreements)) {
    modelDisagreements.forEach(code => {
      if (code === "CHECK_CHRONOLOGICAL_STORY") return;
      add(flags, `MODEL_${code}`, code.includes("BREAK") ? "HIGH" : "MEDIUM", `Replay intelligence flagged ${code}.`, "CAP_REVIEW");
    });
  }

  const maxSeverity = flags.reduce((max, flag) => severityRank(flag.severity) > severityRank(max) ? flag.severity : max, "CLEAR");
  const action =
    maxSeverity === "CRITICAL" ? "Block high-conviction language and require manual review." :
    maxSeverity === "HIGH" ? "Cap allocation language to conditional/restraint until contradiction clears." :
    maxSeverity === "MEDIUM" ? "Display caution and reduce confidence." :
    "No material contradiction detected.";

  return {
    engine: "Contradiction Engine",
    version: "v33.1",
    severity: maxSeverity,
    flagCount: flags.length,
    flags,
    action,
    capitalEffects: [...new Set(flags.map(f => f.capitalEffect))]
  };
}

export default buildContradictionReport;
