import { trmScore, trmNatalReliability } from "./finLumenCapitalLanguage.js";

// Signal Strength is deliberately separated from interpretation confidence.
const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, n(v, min)));

function label(score) {
  if (score >= 78) return "High";
  if (score >= 65) return "Medium-high";
  if (score >= 50) return "Medium";
  if (score >= 35) return "Low-medium";
  return "Low";
}

function rank(severity) {
  return { CLEAR: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[String(severity || "").toUpperCase()] || 0;
}

export function calibrateInterpretationConfidence({
  transitReceptorFit = null,
  contradictionReport = null,
  replayValidationIntelligence = null,
  historicalSampleCount = null,
  natalResearch = null
} = {}) {
  const trmConfidence = trmScore(transitReceptorFit, "confidenceScore", 50);
  const natalReliability = trmNatalReliability(transitReceptorFit, 50);
  const historicalEcho = trmScore(transitReceptorFit, "historicalEcho", 45);
  const receptor = trmScore(transitReceptorFit, "natalReceptorStrength", 45);
  const network = trmScore(transitReceptorFit, "supportNetworkQuality", 45);
  const pressure = trmScore(transitReceptorFit, "pressureInterference", 50);

  let score =
    trmConfidence * 0.32 +
    natalReliability * 0.26 +
    historicalEcho * 0.16 +
    receptor * 0.12 +
    network * 0.08 +
    Math.max(0, 100 - pressure) * 0.06;

  const flags = Array.isArray(contradictionReport?.flags) ? contradictionReport.flags : [];
  score -= flags.reduce((sum, flag) => {
    const s = String(flag?.severity || "").toUpperCase();
    return sum + (s === "CRITICAL" ? 18 : s === "HIGH" ? 10 : s === "MEDIUM" ? 5 : 2);
  }, 0);

  const disagreements = replayValidationIntelligence?.disagreements || [];
  score -= Math.min(14, disagreements.length * 2);

  if (Number.isFinite(Number(historicalSampleCount))) {
    const count = Number(historicalSampleCount);
    if (count < 3) score -= 8;
    else if (count >= 8) score += 4;
  }

  const candidateCount = Number(natalResearch?.candidateCount || 0);
  if (candidateCount > 1 && natalReliability < 70) score -= 4;

  score = clamp(Math.round(score));
  let cap = 100;
  const r = rank(contradictionReport?.severity);
  if (r >= 4) cap = Math.min(cap, 45);
  else if (r >= 3) cap = Math.min(cap, 58);
  else if (r >= 2) cap = Math.min(cap, 68);

  if (natalReliability < 45) cap = Math.min(cap, 50);
  else if (natalReliability < 60) cap = Math.min(cap, 65);

  const cappedScore = clamp(Math.min(score, cap));
  return {
    engine: "Confidence Calibration Engine",
    version: "v33.1",
    rawScore: score,
    score: cappedScore,
    label: label(cappedScore),
    cap,
    natalReliability,
    drivers: {
      trmConfidence,
      historicalEcho,
      receptor,
      network,
      pressureInterference: pressure,
      contradictionSeverity: contradictionReport?.severity || "CLEAR",
      disagreementCount: disagreements.length,
      historicalSampleCount,
      natalCandidateCount: candidateCount || null
    },
    rule: "Confidence is not the same as signal strength. Natal reliability, replay evidence and contradictions cap the final interpretation confidence."
  };
}

export default calibrateInterpretationConfidence;
