// REAL MACRO ASTRO ENGINE (v28.5)
// This file is now a translator over the Swiss-backed real ephemeris layer.
// It must not simulate macro regimes with synthetic cycles.

import { computeMacroEnvironment } from "./macroEnvironment.js";

function regimeFromEnvironment(environment, pressure, expansion, volatility) {
  if (environment === "EXTREME PRESSURE" || pressure >= 45) return "EXTREME PRESSURE";
  if (pressure >= 28 && expansion >= 28) return "CONFLICT / HIGH-ENERGY TUG";
  if (pressure >= 28) return "HIGH PRESSURE";
  if (expansion >= 28 && volatility >= 20) return "VOLATILE EXPANSION";
  if (expansion >= 20) return "EXPANSION";
  if (pressure >= 15) return "PRESSURE";
  return "BALANCED";
}

function macroScoreFromRealSky(pressure, expansion) {
  // Interpretable balance score, not a synthetic cycle:
  // 50 = balanced, above 50 = expansion leads, below 50 = pressure leads.
  return Math.max(0, Math.min(100, 50 + Number(expansion || 0) - Number(pressure || 0)));
}

export function runMacroEngine(date = new Date().toISOString().split("T")[0]) {
  const macro = computeMacroEnvironment(date);
  const pressure = Number(macro.pressureScore || 0);
  const expansion = Number(macro.expansionScore || 0);
  const volatility = Number(macro.volatility || 0);
  const score = macroScoreFromRealSky(pressure, expansion);
  const regime = regimeFromEnvironment(macro.environment, pressure, expansion, volatility);

  return {
    macro_score: Number(score.toFixed(2)),
    regime,
    environment: macro.environment,
    pressureScore: pressure,
    expansionScore: expansion,
    volatility,
    recommendation: macro.recommendation,
    source: "real_ephemeris_translator"
  };
}

export default runMacroEngine;
