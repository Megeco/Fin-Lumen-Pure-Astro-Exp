import assert from "node:assert/strict";
import { buildDecisionPipelineV35 } from "../lib/v35/decisionPipeline.js";
import { scoreCycleRunwayV35 } from "../lib/v35/astroTruth.js";

function input(overrides = {}) {
  const replay = {
    expansionScore: 76,
    pressureScore: 52,
    leadershipProbability: 74,
    multibaggerProbability: 80,
    transitDetails: [],
    ...overrides.replay
  };
  const strategic = { date: "2026-11-15", expansionScore: 78, pressureScore: 50, leadershipProbability: 82, label: "Strategic expansion" };
  return {
    replayDate: "2026-07-19",
    replay,
    windows: { windowMap: { strategicOpportunity: strategic }, bestWindow: strategic },
    macroSnapshot: { expansion: 65, pressure: 48, environment: "EXPANSION" },
    transitReceptorFit: { expressionClass: "RERATING_TRANSIT", scores: { expressionScore: 76, confidenceScore: 72, natalReliability: 70 } },
    replayValidationIntelligence: { currentResearchReading: { dormancy: { type: "NO CURRENT DORMANCY" }, breakAssessment: { complete: false, label: "NO BREAK EVIDENCE" } } },
    company: {},
    ...overrides
  };
}

const conviction = buildDecisionPipelineV35(input());
assert.equal(conviction.capitalDecision.strategicCapital, "FULL_BUILD", "FULL BUILD must be attainable in a general conviction zone");
assert.equal(conviction.capitalDecision.sizing, "BUILD_INTENDED_FULL_POSITION_IN_STAGES");
assert.equal(conviction.capitalDecision.invariants.fullBuildMeansAllIn, false);
assert.equal(conviction.astroTruth.invariants.containsCapitalLanguage, false);
assert.equal(conviction.behaviour.invariants.containsCapitalAction, false);
assert.equal(conviction.language.invariants.decisionsChangedDuringRendering, false);

const digestion = buildDecisionPipelineV35(input({ replay: { expansionScore: 70, pressureScore: 64, leadershipProbability: 68 } }));
assert.equal(digestion.astroTruth.pressureType, "VOLATILE_DIGESTION");
assert.equal(digestion.astroTruth.breakState.mapped, false, "ordinary digestion must not become a break");
assert.notEqual(digestion.capitalDecision.existingPosition, "TRIM_PROTECT");

const brokenInput = input();
brokenInput.replayValidationIntelligence.currentResearchReading.breakAssessment = { complete: true, label: "BREAK EVIDENCE PRESENT", evidence: ["persistent termination"] };
const broken = buildDecisionPipelineV35(brokenInput);
assert.equal(broken.astroTruth.pressureType, "BREAK_RESET");
assert.equal(broken.capitalDecision.existingPosition, "TRIM_PROTECT");
assert.equal(broken.capitalDecision.freshTacticalCapital, "NO_FRESH");
assert.equal(broken.capitalDecision.strategicCapital, "WAIT");

const withIgnoredHistory = buildDecisionPipelineV35(input({ historicalContext: { confidenceDelta: -7, analogousBehaviour: "slower rerating" } }));
assert.deepEqual(withIgnoredHistory.astroTruth, conviction.astroTruth, "abandoned historical input must not rewrite Astro Truth");
assert.equal(withIgnoredHistory.behaviour.confidence, conviction.behaviour.confidence, "abandoned historical input must have zero confidence authority");
assert.equal(withIgnoredHistory.behaviour.invariants.historicalLayerApplied, false);

const dated = input();
dated.windows.windowMap.tacticalRisk = { date: "2026-08-10", label: "Pressure gate" };
dated.windows.windowMap.strategicAccumulation = { date: "2026-11-01", label: "Re-entry gate" };
const path = buildDecisionPipelineV35(dated).timingPath;
assert.equal(path.nextGate.role, "PRESSURE_CHECK");
assert.equal(path.tacticalGate.role, "PRESSURE_CHECK");
assert.equal(path.strategicGate, null, "an already-active FULL BUILD must not be stopped by an upgrade/re-entry gate");
assert.equal(path.afterNextGate, "STOP_AND_RERUN_RELEVANT_BUCKET");
assert.equal(path.projectedBeyondUnresolvedGate, false);
assert.equal(path.invariants.tacticalGateCanSuspendStrategicDecision, false);
assert.match(path.tacticalGate.astroReading, /pressure|window/i, "a risk gate must state the mapped pressure type");

const expansionCatalyst = input({
  catalystScan: { best: { date: "2026-08-15", label: "Jupiter-Mercury conjunction", strength: "HIGH", expectedResponse: "rerating/leadership search, improved confidence, and stronger bid" } }
});
const expansionGate = buildDecisionPipelineV35(expansionCatalyst).timingPath.nextGate;
assert.equal(expansionGate.role, "EXPANSION_REVIEW", "constructive catalyst must say what to prepare for");
assert.equal(expansionGate.capitalBucket, "FRESH_TACTICAL");

const pressureCatalyst = input({
  catalystScan: { best: { date: "2026-08-11", label: "Mars-Rahu trine", strength: "VERY HIGH", expectedResponse: "narrative heat, volatility, quick reversals, and crowd sensitivity" } }
});
const pressureGate = buildDecisionPipelineV35(pressureCatalyst).timingPath.nextGate;
assert.equal(pressureGate.role, "PRESSURE_CHECK", "volatile catalyst must be typed as a pressure check");
assert.match(buildDecisionPipelineV35(pressureCatalyst).language.timingPath, /Affects EXISTING AND FRESH TACTICAL/);
assert.match(buildDecisionPipelineV35(pressureCatalyst).language.strategicTimingPath, /tactical pressure checks do not pause or revoke/i);

const waiting = input({
  replay: { expansionScore: 55, pressureScore: 63, leadershipProbability: 50, multibaggerProbability: 45, transitDetails: [] },
  transitReceptorFit: { expressionClass: "BACKGROUND", scores: { expressionScore: 45, confidenceScore: 60, natalReliability: 40 } }
});
waiting.windows.windowMap.tacticalRisk = { date: "2026-08-11", label: "Tactical pressure" };
waiting.windows.windowMap.strategicRisk = { date: "2026-10-01", expansionScore: 55, pressureScore: 76, leadershipProbability: 38, label: "strategic_risk" };
waiting.windows.windowMap.strategicAccumulation = { date: "2026-11-16", label: "Strategic re-entry" };
waiting.windows.windowMap.strategicOpportunity = { date: "2027-03-01", leadershipProbability: 72, label: "Later full-build review" };
const waitingDecision = buildDecisionPipelineV35(waiting);
assert.equal(waitingDecision.capitalDecision.strategicCapital, "WAIT");
assert.equal(waitingDecision.timingPath.tacticalGate.date, "2026-08-11");
assert.equal(waitingDecision.timingPath.strategicGate.date, "2026-11-16", "WAIT must point to the strategic deployment gate, not the earlier tactical check");
assert.match(waitingDecision.language.strategicTimingPath, /2026-11-16/);

const dateFamilies = input();
dateFamilies.windows.windowMap.longRangeCycle = { date: "2028-08-07", expansionScore: 82, pressureScore: 48, leadershipProbability: 84, label: "long_range_cycle" };
dateFamilies.windows.bestWindow = { date: "2027-02-14", expansionScore: 76, pressureScore: 50, leadershipProbability: 76, label: "Strategic opportunity" };
const dateFamilyDecision = buildDecisionPipelineV35(dateFamilies);
assert.equal(dateFamilyDecision.astroTruth.windows.longCycleWindow.date, "2028-08-07", "long-cycle context must come from the mapped long-range window, never the medium-horizon best window");

const noConfidence = input({ company: { confidence: "NONE" } });
const noConfidenceDecision = buildDecisionPipelineV35(noConfidence);
assert.equal(noConfidenceDecision.astroTruth.natalReliability, 50, "explicit NONE confidence must cap natal authority");
assert.equal(noConfidenceDecision.capitalDecision.strategicCapital, "PART_BUILD", "an exact calculated date with NONE confidence may support part-size capital, but not FULL BUILD");

const distantOpportunity = input({
  replay: { expansionScore: 70, pressureScore: 52, leadershipProbability: 62 },
  windows: {
    windowMap: {
      strategicAccumulation: { date: "2027-09-12", expansionScore: 71, pressureScore: 74, leadershipProbability: 43 },
      strategicOpportunity: { date: "2028-07-08", expansionScore: 92, pressureScore: 59, leadershipProbability: 83 },
      longRangeCycle: { date: "2028-08-07", expansionScore: 84, pressureScore: 62, leadershipProbability: 71 }
    }
  }
});
const distantDecision = buildDecisionPipelineV35(distantOpportunity);
assert.equal(distantDecision.astroTruth.strategicLeadership, 43, "a >18-month opportunity must not leak into today's strategic leadership bucket");

const forwardOpportunity = input({
  windows: { windowMap: { strategicOpportunity: { date: "2027-03-19", expansionScore: 84, pressureScore: 46, leadershipProbability: 88 } } }
});
const forwardDecision = buildDecisionPipelineV35(forwardOpportunity);
assert.equal(forwardDecision.astroTruth.strategicWindowPhase, "FORWARD");
assert.notEqual(forwardDecision.capitalDecision.strategicCapital, "FULL_BUILD", "forward leadership must not authorise FULL BUILD today");

const pressureFirst = input();
pressureFirst.windows.windowMap.strategicRisk = { date: "2026-09-01", expansionScore: 48, pressureScore: 80, leadershipProbability: 40 };
const pressureFirstDecision = buildDecisionPipelineV35(pressureFirst);
assert.equal(pressureFirstDecision.astroTruth.pressureBeforeOpportunity, true);
assert.equal(pressureFirstDecision.capitalDecision.strategicCapital, "WAIT", "pressure before opportunity must block present strategic deployment");

const ordinaryScans = Array.from({ length: 36 }, () => ({ expansionScore: 67, pressureScore: 55, leadershipProbability: 67 }));
const ordinaryRunway = scoreCycleRunwayV35({ leadershipProbability: 67 }, { fullScan: ordinaryScans });
assert.ok(ordinaryRunway < 72, `ordinary repeated support must not saturate to HIGH/EXTREME; received ${ordinaryRunway}`);

const rareScans = Array.from({ length: 36 }, () => ({ expansionScore: 86, pressureScore: 42, leadershipProbability: 94 }));
const rareRunway = scoreCycleRunwayV35({ leadershipProbability: 90 }, { fullScan: rareScans });
assert.ok(rareRunway >= 85, `exceptional repeated leadership should keep EXTREME reachable; received ${rareRunway}`);

console.log("v35 architecture invariants: PASS");
