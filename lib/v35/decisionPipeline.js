import { buildAstroTruthV35 } from "./astroTruth.js";
import { buildBehaviourV35 } from "./behaviour.js";
import { buildCapitalDecisionV35 } from "./capitalDecision.js";
import { buildTimingPathV35 } from "./timingPath.js";
import { buildLanguageV35 } from "./language.js";

export function buildDecisionPipelineV35(inputs) {
  const astroTruth = buildAstroTruthV35(inputs);
  const behaviour = buildBehaviourV35(astroTruth);
  const capitalDecision = buildCapitalDecisionV35(astroTruth, behaviour);
  const timingPath = buildTimingPathV35(astroTruth, capitalDecision);
  const language = buildLanguageV35(astroTruth, behaviour, capitalDecision, timingPath);
  return {
    version: "35.5-window-relative-capital-posture",
    doctrine: "Astro Truth → Behaviour → Capital Decision → Bucket-Sovereign Timing → Language",
    astroTruth,
    behaviour,
    capitalDecision,
    timingPath,
    language,
    decisionTrace: [
      { layer: "ASTRO_TRUTH", output: `${astroTruth.expansionScore}/${astroTruth.pressureScore}; ${astroTruth.pressureType}` },
      { layer: "BEHAVIOUR", output: behaviour.state },
      { layer: "CAPITAL_DECISION", output: capitalDecision },
      { layer: "TIMING_PATH", output: { tactical: timingPath.tacticalGate, strategic: timingPath.strategicGate } },
      { layer: "LANGUAGE", output: language.singleStory }
    ]
  };
}
