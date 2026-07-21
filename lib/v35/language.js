const words = {
  HOLD_CORE: "HOLD CORE",
  HOLD_ADD_IN_PARTS: "HOLD / ADD IN PARTS",
  HOLD_REVIEW: "HOLD / REVIEW",
  TRIM_PROTECT: "TRIM / PROTECT",
  NO_FRESH: "NO FRESH",
  STAGGER_ADD: "STAGGER ADD",
  PART_SIZED_ONLY: "PART-SIZED ONLY",
  WAIT: "WAIT",
  PART_BUILD: "PART BUILD",
  FULL_BUILD: "FULL BUILD",
  NOT_APPROVED: "NOT APPROVED",
  PASSIVE_APPROVED: "PASSIVE APPROVED"
};

const stateWords = value => String(value || "").replaceAll("_", " ");

function gateLine(gate, bucketName) {
  if (!gate) return null;
  const reading = gate.astroReading ? ` Astro reading: ${gate.astroReading}` : "";
  const shared = gate.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC";
  const rerun = shared
    ? "Rerun the tactical and strategic decisions together at this shared gate."
    : `Rerun only the ${bucketName} decision at this gate.`;
  return `${stateWords(gate.role)}: ${gate.date}${gate.label ? ` — ${gate.label}` : ""}.${reading} ${stateWords(gate.whatChanges)}. Affects ${stateWords(gate.capitalBucket)}. ${rerun}`;
}

/** Rendering only: this layer contains no thresholds and makes no decisions. */
export function buildLanguageV35(truth, behaviour, capital, timing) {
  const breakLine = truth.breakState.mapped ? "Break/reset risk is mapped." : "No break-risk is mapped.";
  const tacticalGateLine = gateLine(timing.tacticalGate, "tactical") || "No later tactical gate is mapped. Keep the present tactical decision primary.";
  const strategicGateLine = gateLine(timing.strategicGate, "strategic") || (
    capital.strategicCapital === "FULL_BUILD"
      ? "No strategic protection/break gate is mapped. FULL BUILD remains active; tactical pressure checks do not pause or revoke it."
      : capital.strategicCapital === "PART_BUILD"
        ? "No later strategic upgrade/protection gate is mapped. PART BUILD remains the strategic ceiling."
        : "No later strategic deployment gate is mapped. Strategic WAIT remains active."
  );
  const tacticalNeutrality = timing.tacticalGateIsStrategicNeutral
    ? " This is a tactical-only gate; it does not change strategic capital."
    : "";
  const tacticalTimingPath = `${tacticalGateLine}${tacticalNeutrality}`;
  const strategicNote = capital.strategicCapital === "FULL_BUILD"
    ? "This is a conviction deployment zone. Build the intended full position in stages. Tactical-only gates do not suspend strategic approval."
    : capital.strategicCapital === "PART_BUILD"
      ? "Part-sized strategic capital is active; sizing remains capped until a strategic gate changes it."
      : "No strategic capital is authorised now; only a strategic deployment gate can reopen it.";
  const sharedDecisionGate = Boolean(
    timing.tacticalGate &&
    timing.strategicGate &&
    timing.tacticalGate.date === timing.strategicGate.date &&
    timing.tacticalGate.role === timing.strategicGate.role &&
    timing.tacticalGate.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC"
  );
  const pathStory = sharedDecisionGate
    ? `Shared tactical/strategic path: ${strategicGateLine}`
    : `Tactical path: ${tacticalTimingPath} Strategic path: ${strategicGateLine}`;

  return {
    schemaVersion: "35.4",
    layer: "LANGUAGE",
    headline: stateWords(behaviour.state),
    astroSummary: `${stateWords(behaviour.direction)} with ${stateWords(truth.pressureType)} pressure. ${breakLine}`,
    capital: {
      existingPosition: words[capital.existingPosition],
      freshTacticalCapital: words[capital.freshTacticalCapital],
      strategicCapital: words[capital.strategicCapital],
      passiveLongTermCapital: words[capital.passiveLongTermCapital]
    },
    strategicNote,
    tacticalTimingPath,
    strategicTimingPath: strategicGateLine,
    // Backward-compatible alias for tactical table/API consumers.
    timingPath: tacticalTimingPath,
    singleStory: `${stateWords(behaviour.state)}. ${breakLine} Existing position: ${words[capital.existingPosition]}. Fresh tactical capital: ${words[capital.freshTacticalCapital]}. Strategic capital: ${words[capital.strategicCapital]}. Passive long-term capital: ${words[capital.passiveLongTermCapital]}. ${strategicNote} ${pathStory}`,
    invariants: {
      containsUnresolvedConditionalLanguage: false,
      decisionsChangedDuringRendering: false,
      tacticalLanguageCanOverrideStrategicCapital: false
    }
  };
}
