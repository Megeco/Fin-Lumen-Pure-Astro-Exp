function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function includes(value, needle) {
  return String(value || "").toLowerCase().includes(needle);
}

export function getConfidence(stock = {}) {
  // Confidence now means interpretive clarity, not bullishness.
  // A clean bearish/dormant reading can be high-confidence; a mixed high-expansion/high-pressure
  // reading can be directionally positive but lower-confidence.
  let score = 5;

  const pressure = num(stock.pressureScore ?? stock.pressure ?? stock.pressureLevelScore, 0);
  const expansion = num(stock.expansionScore ?? stock.expansion ?? stock.expansionLevelScore, 0);
  const structuralPressure = num(stock.structuralPressureScore ?? stock.structuralPressure, 0);
  const volatilePressure = num(stock.volatilePressureScore ?? stock.volatilePressure, 0);
  const leadershipPotential = num(stock.leadershipPotential ?? stock.tacticalLeadership ?? stock.leadership, 0);
  const leadershipDurability = num(stock.leadershipDurability ?? stock.strategicLeadership ?? stock.durability, 0);
  const hardPressure = Boolean(stock.hardPressureFlag || stock.breakRiskFlag || num(stock.breakRisk, 0) >= 5);
  const natalConfidence = String(stock.natalConfidence || stock.registryConfidence || "").toUpperCase();

  const spread = Math.abs(expansion - pressure);
  if (spread >= 25) score += 2;
  else if (spread >= 12) score += 1;
  else score -= 1; // conflict / close tug lowers certainty, not direction.

  if (hardPressure) score += 1; // clear danger is interpretable.

  if (expansion >= 70 && pressure >= 60) score -= 0.4;
  if (volatilePressure > structuralPressure && expansion >= 70) score -= 0.5;

  if (leadershipPotential >= 65 && leadershipDurability >= 65) score += 1;
  if (leadershipPotential >= 65 && leadershipDurability < 50) score -= 1;

  if (natalConfidence === "LOW") score -= 1;
  if (natalConfidence === "LOCKED" || natalConfidence === "HIGH") score += 0.5;

  if (includes(stock.expected_behaviour, "mixed") || includes(stock.signal, "churn")) score -= 0.5;

  score = Math.max(1, Math.min(10, Number(score.toFixed(1))));

  let label = "MEDIUM";
  if (score >= 7) label = "HIGH";
  if (score < 4.5) label = "LOW";

  return {
    label,
    score,
    meaning: "Confidence in interpretation, not bullishness",
    basis: "interpretive_clarity_v29_1"
  };
}

export default getConfidence;
