const high = (v, x) => Number(v) >= x;

/** Converts astro facts to expected stock expression. No capital actions are permitted here. */
export function buildBehaviourV35(truth) {
  const e = truth.expansionScore;
  const p = truth.pressureScore;
  const l = truth.tacticalLeadership;
  const durable = truth.strategicLeadership >= 70 && truth.receptorFit.score >= 58;
  let state = "FORWARD_LEADERSHIP_WATCH";

  if (truth.breakState.mapped) state = "BREAK_RESET_RISK";
  else if (/HIGH|DORMANT|RANGE/.test(truth.dormancyLevel)) state = "DORMANT_CAPITAL";
  else if (truth.correctionMode === "DIGESTION" && durable) state = "SLOW_COMPOUNDER_DURABLE_DIGESTION";
  else if (high(e, 72) && high(l, 68) && p < 58) state = truth.cyclePotential >= 75 ? "RERATING_IGNITION" : "CLEAN_EXPANSION";
  else if (high(e, 65) && high(l, 58) && p >= 58) state = "VOLATILE_EXPANSION";
  else if (high(e, 62) && high(l, 62)) state = "ACTIVE_TACTICAL_LEADERSHIP";
  else if (p >= 65 && !truth.breakState.mapped) state = "PRESSURE_DIGESTION";
  else if (durable && e >= 55) state = "MATURE_LEADER";
  else if (truth.correctionMode === "RESET" && e >= 58) state = "REPAIR_PHASE";

  return {
    schemaVersion: "35.0",
    layer: "BEHAVIOUR",
    state,
    direction: e >= p ? "EXPANSION_BIASED" : "PRESSURE_BIASED",
    durability: durable ? "DURABLE" : truth.strategicLeadership >= 58 ? "DEVELOPING" : "FRAGILE",
    velocity: e >= 78 && l >= 70 ? "HIGH" : e >= 62 ? "MEDIUM" : "LOW",
    capitalEfficiency: state === "DORMANT_CAPITAL" ? "LOW" : e >= 62 ? "PRODUCTIVE" : "SELECTIVE",
    breakStatus: truth.breakState.mapped ? "MAPPED" : "NOT_MAPPED",
    confidence: Math.max(0, Math.min(100, Math.round((truth.natalReliability + truth.receptorFit.confidence) / 2))),
    invariants: { containsCapitalAction: false, historicalLayerApplied: false }
  };
}
