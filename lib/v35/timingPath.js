const time = value => value ? new Date(`${value}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;

function bucketFor(role) {
  if (role === "PRESSURE_CHECK") return "EXISTING_AND_FRESH_TACTICAL";
  if (role === "REENTRY_REVIEW") return "FRESH_TACTICAL_AND_STRATEGIC";
  if (role === "EXPANSION_REVIEW" || role === "CATALYST_REVIEW") return "FRESH_TACTICAL";
  if (["STRATEGIC_BUILD_REVIEW", "FULL_BUILD_UPGRADE_REVIEW", "STRATEGIC_PROTECTION_REVIEW"].includes(role)) return "STRATEGIC";
  return "BACKGROUND_ONLY";
}

function whatChangesFor(role, gate) {
  const signal = String(gate?.signalClass || "MAPPED").replaceAll("_", " ").toLowerCase();
  if (role === "PRESSURE_CHECK") return `Rerun tactical Astro Truth at this date; confirm whether the forecast ${signal} pressure strengthened, softened, or changed class`;
  if (role === "EXPANSION_REVIEW") return "Rerun Astro Truth to test whether the catalyst strengthens active expansion";
  if (role === "CATALYST_REVIEW") return "Rerun the stock-specific astro contacts";
  if (role === "REENTRY_REVIEW") return `Rerun both affected capital buckets before deployment; this is a ${signal} review, not automatic approval`;
  if (role === "FULL_BUILD_UPGRADE_REVIEW") return "Reassess eligibility for Full Build";
  if (role === "STRATEGIC_PROTECTION_REVIEW") return `Rerun strategic Astro Truth at this date; the forecast pressure type is ${signal}`;
  return "Reassess strategic deployment";
}

function decorateGate(item) {
  return item ? {
    ...item,
    capitalBucket: bucketFor(item.role),
    whatChanges: whatChangesFor(item.role, item)
  } : null;
}

function affectsTactical(gate) {
  return ["EXISTING_AND_FRESH_TACTICAL", "FRESH_TACTICAL", "FRESH_TACTICAL_AND_STRATEGIC"].includes(gate?.capitalBucket);
}

function affectsStrategic(gate) {
  return ["STRATEGIC", "FRESH_TACTICAL_AND_STRATEGIC"].includes(gate?.capitalBucket);
}

function relevantStrategicGate(gate, strategicCapital) {
  if (!affectsStrategic(gate)) return false;
  if (strategicCapital === "FULL_BUILD") {
    return gate.role === "STRATEGIC_PROTECTION_REVIEW";
  }
  if (strategicCapital === "PART_BUILD") {
    return ["STRATEGIC_PROTECTION_REVIEW", "FULL_BUILD_UPGRADE_REVIEW", "STRATEGIC_BUILD_REVIEW"].includes(gate.role);
  }
  // WAIT has no approved strategic capital to protect. Its next strategic
  // decision must therefore be a deployment/re-entry gate, not another risk
  // date that cannot reopen capital.
  return ["REENTRY_REVIEW", "STRATEGIC_BUILD_REVIEW", "FULL_BUILD_UPGRADE_REVIEW"].includes(gate.role);
}

/** Capital-bucket sovereign timing: a tactical gate cannot suspend a strategic decision. */
export function buildTimingPathV35(truth, capital) {
  const candidates = [
    truth.windows.catalystWindow,
    truth.windows.pressureWindow,
    truth.windows.strategicPressureWindow,
    truth.windows.reentryWindow,
    truth.windows.strategicBuildWindow,
    truth.windows.fullBuildWindow
  ]
    .filter(Boolean)
    .filter(item => time(item.date) > time(truth.asOfDate))
    .map(decorateGate)
    .sort((a, b) => time(a.date) - time(b.date));

  const tacticalGate = candidates.find(affectsTactical) || null;
  const strategicGate = candidates.find(gate => relevantStrategicGate(gate, capital.strategicCapital)) || null;
  const tacticalGateIsStrategicNeutral = Boolean(tacticalGate && !affectsStrategic(tacticalGate));

  return {
    schemaVersion: "35.4",
    layer: "TIMING_PATH",
    now: { date: truth.asOfDate, capitalDecision: capital },
    tacticalGate,
    strategicGate,
    // Compatibility alias for existing table/API consumers. Never use this
    // alias to render the strategic path.
    nextGate: tacticalGate || strategicGate,
    afterNextGate: (tacticalGate || strategicGate) ? "STOP_AND_RERUN_RELEVANT_BUCKET" : "NO_LATER_DECISION_GATE_MAPPED",
    tacticalAfterGate: tacticalGate ? "RERUN_TACTICAL_BUCKET" : "KEEP_PRESENT_TACTICAL_DECISION",
    strategicAfterGate: strategicGate
      ? "RERUN_STRATEGIC_BUCKET"
      : capital.strategicCapital === "FULL_BUILD"
        ? "FULL_BUILD_CONTINUES_UNTIL_STRATEGIC_PROTECTION_GATE"
        : "KEEP_PRESENT_STRATEGIC_DECISION",
    tacticalGateIsStrategicNeutral,
    strategicContinuity: tacticalGateIsStrategicNeutral
      ? "TACTICAL_GATE_DOES_NOT_PAUSE_OR_REVOKE_STRATEGIC_CAPITAL"
      : null,
    longCycleBackground: truth.windows.longCycleWindow,
    projectedBeyondUnresolvedGate: false,
    invariants: {
      capitalBucketsAreSovereign: true,
      tacticalGateCanSuspendStrategicDecision: false
    }
  };
}
