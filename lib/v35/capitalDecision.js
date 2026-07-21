function fullBuildEligible(truth, behaviour) {
  return !truth.breakState.mapped && truth.natalReliability >= 55 && truth.expansionScore >= 68 &&
    truth.strategicLeadership >= 72 && truth.pressureScore < 68 && behaviour.durability !== "FRAGILE" &&
    ["ACTIVE", "NEAR"].includes(truth.strategicWindowPhase) && !truth.pressureBeforeOpportunity &&
    !["DORMANT_CAPITAL", "BREAK_RESET_RISK", "REPAIR_PHASE"].includes(behaviour.state);
}

/** The only layer authorised to decide capital. */
export function buildCapitalDecisionV35(truth, behaviour) {
  const breaking = truth.breakState.mapped;
  const productive = ["CLEAN_EXPANSION", "RERATING_IGNITION", "ACTIVE_TACTICAL_LEADERSHIP", "VOLATILE_EXPANSION", "MATURE_LEADER", "SLOW_COMPOUNDER_DURABLE_DIGESTION"].includes(behaviour.state);
  const full = fullBuildEligible(truth, behaviour);

  let existingPosition = breaking ? "TRIM_PROTECT" : productive || behaviour.durability === "DURABLE" ? "HOLD_CORE" : "HOLD_REVIEW";
  if (behaviour.state === "RERATING_IGNITION" && behaviour.durability === "DURABLE") existingPosition = "HOLD_ADD_IN_PARTS";

  let freshTacticalCapital = "NO_FRESH";
  if (!breaking && ["CLEAN_EXPANSION", "RERATING_IGNITION", "ACTIVE_TACTICAL_LEADERSHIP"].includes(behaviour.state)) freshTacticalCapital = "STAGGER_ADD";
  else if (!breaking && behaviour.state === "VOLATILE_EXPANSION") freshTacticalCapital = "PART_SIZED_ONLY";

  let strategicCapital = "WAIT";
  if (full) strategicCapital = "FULL_BUILD";
  else if (!breaking && productive && truth.strategicLeadership >= 60 && truth.natalReliability >= 45 && !truth.pressureBeforeOpportunity) strategicCapital = "PART_BUILD";

  let passiveLongTermCapital = "NOT_APPROVED";
  if (!breaking && behaviour.durability === "DURABLE" && truth.strategicLeadership >= 78 && truth.natalReliability >= 65 && truth.pressureScore < 62) {
    passiveLongTermCapital = "PASSIVE_APPROVED";
  }

  return {
    schemaVersion: "35.0",
    layer: "CAPITAL_DECISION",
    existingPosition,
    freshTacticalCapital,
    strategicCapital,
    passiveLongTermCapital,
    sizing: strategicCapital === "FULL_BUILD" ? "BUILD_INTENDED_FULL_POSITION_IN_STAGES" : strategicCapital === "PART_BUILD" ? "CAP_STRATEGIC_SIZE" : "NO_STRATEGIC_DEPLOYMENT",
    reasonCodes: [behaviour.state, truth.pressureType, `WINDOW_${truth.strategicWindowPhase}`, truth.pressureBeforeOpportunity ? "PRESSURE_BEFORE_OPPORTUNITY" : "CHRONOLOGY_CLEAR", truth.breakState.mapped ? "BREAK_MAPPED" : "NO_BREAK_MAPPED", `NATAL_${truth.natalReliability}`],
    invariants: { fullBuildMeansAllIn: false, bucketsAreIndependent: true }
  };
}
