const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dateOf = item => item?.date || item?.dateOnly || item?.windowDate || null;
const dayMs = 24 * 60 * 60 * 1000;

function insideStrategicHorizon(item, replayDate) {
  const date = dateOf(item);
  if (!date || !replayDate) return false;
  const days = (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${replayDate}T00:00:00Z`).getTime()) / dayMs;
  return days >= 0 && days <= 548; // 18 months, with a small calendar-month allowance.
}

function daysFrom(replayDate, item) {
  const date = dateOf(item);
  if (!date || !replayDate) return null;
  return Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${replayDate}T00:00:00Z`).getTime()) / dayMs);
}

function strategicWindowPosture(replayDate, candidate, tacticalLeadership) {
  const days = daysFrom(replayDate, candidate);
  if (days === null || days <= 30) return { phase: "ACTIVE", daysToWindow: Math.max(0, days || 0) };
  if (days <= 120) return { phase: "NEAR", daysToWindow: days };
  if (days <= 548) return { phase: "FORWARD", daysToWindow: days };
  return { phase: "LONG_CYCLE", daysToWindow: days };
}

export function scoreCycleRunwayV35(resonance = {}, windows = {}) {
  const scans = Array.isArray(windows?.fullScan) ? windows.fullScan : [];
  const forward = scans.filter((_, index) => index >= 6);
  const productive = forward.filter(item => n(item?.expansionScore) >= 65 && n(item?.leadershipProbability) >= 65 && n(item?.pressureScore) < 75);
  const strong = productive.filter(item => n(item?.expansionScore) >= 70 && n(item?.leadershipProbability) >= 70 && n(item?.pressureScore) < 68);
  const breakWindows = forward.filter(item => n(item?.pressureScore) >= 78 && n(item?.pressureScore) >= n(item?.expansionScore) + 8);
  const topLeadership = productive.map(item => n(item?.leadershipProbability)).sort((a, b) => b - a).slice(0, 5);
  const durableLeadership = topLeadership.length ? topLeadership.reduce((sum, value) => sum + value, 0) / topLeadership.length : 0;
  const repetition = Math.min(24, strong.length * 4);
  const runway = Math.min(10, productive.length);
  const breakPenalty = Math.min(30, breakWindows.length * 5);
  const rareDurabilityLift = strong.length >= 8 && breakWindows.length === 0 && durableLeadership >= 85 ? 5 : 0;
  const score = Math.round(durableLeadership * 0.45 + repetition + runway + n(resonance?.leadershipProbability) * 0.08 + rareDurabilityLift - breakPenalty);
  return Math.max(0, Math.min(100, score));
}

function natalReliability(company = {}, receptor = {}) {
  const raw = Math.round(n(
    receptor?.scores?.natalReliability ??
    receptor?.scores?.natalReliabilityScore ??
    company?.natalReliability ??
    company?.confidenceScore,
    50
  ));
  const confidence = String(company?.confidence || company?.natal_confidence || "").trim().toUpperCase();

  // A computed chart is not automatically a high-confidence chart. In
  // particular, an explicit NONE/LOW registry confidence must cap strategic
  // authority even when a registered date lets the ephemeris calculate exact
  // planetary positions for that date.
  if (confidence === "NONE") return Math.min(raw, 50);
  if (confidence === "LOW") return Math.min(raw, 54);
  return raw;
}

function breakEvidence(reading = {}, receptor = {}) {
  const assessment = reading?.breakAssessment || {};
  const label = String(assessment?.label || "").toUpperCase();
  const near = receptor?.pressureInterference?.nearFieldGate || {};
  const receptorBreak = /BREAK|RESET/.test(String(near?.severity || "").toUpperCase());
  return {
    mapped: Boolean(assessment?.complete || receptorBreak || /BREAK EVIDENCE PRESENT|TERMINATED/.test(label)),
    complete: Boolean(assessment?.complete),
    label: assessment?.label || (receptorBreak ? "BREAK/RESET GATE MAPPED" : "NO BREAK-RISK MAPPED"),
    evidence: Array.isArray(assessment?.evidence) ? assessment.evidence : [],
    date: assessment?.date || near?.date || null
  };
}

function pressureType({ pressure, expansion, dormancy, breakState, receptor }) {
  if (breakState.mapped) return "BREAK_RESET";
  if (/DORMANT|RANGE|CAPITAL INEFFICIENT/.test(String(dormancy?.type || "").toUpperCase())) return "DORMANCY";
  const grammarKind = String(receptor?.finAstroGrammar?.pressure?.pressureKind || receptor?.pressureKind || "").toLowerCase();
  if (/volatile|churn|contested/.test(grammarKind) || (pressure >= 58 && expansion >= pressure - 8)) return "VOLATILE_DIGESTION";
  if (pressure >= 68) return "STRUCTURAL_DISCIPLINE";
  if (pressure >= 48) return "NOISE";
  return "LOW";
}

function windowSignal(item, role) {
  const expansion = n(item?.expansionScore, 50);
  const pressure = n(item?.pressureScore, 50);
  const leadership = n(item?.leadershipProbability, 50);

  if (role === "REENTRY_REVIEW" || role === "STRATEGIC_BUILD_REVIEW" || role === "FULL_BUILD_UPGRADE_REVIEW") {
    if (pressure >= 70 || leadership < 55) {
      return {
        signalClass: "CONTESTED_REENTRY",
        astroReading: `Contested re-entry: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. This is a reassessment date, not automatic deployment.`
      };
    }
    if (expansion >= pressure + 10 && leadership >= 65) {
      return {
        signalClass: "CONSTRUCTIVE_REENTRY",
        astroReading: `Constructive re-entry candidate: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. Capital still reopens only after the dated Astro Truth rerun.`
      };
    }
    return {
      signalClass: "SELECTIVE_REENTRY",
      astroReading: `Selective re-entry candidate: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. Keep sizing capped unless the dated rerun improves the field.`
    };
  }

  if (pressure >= 75 && pressure >= expansion + 8) {
    return {
      signalClass: "BREAK_RESET_RISK",
      astroReading: `Break/reset-risk window: pressure ${Math.round(pressure)} exceeds expansion ${Math.round(expansion)}, with leadership ${Math.round(leadership)}.`
    };
  }
  if (pressure >= 65 && pressure >= expansion - 3) {
    return {
      signalClass: "STRUCTURAL_PRESSURE",
      astroReading: `Structural-pressure test: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
    };
  }
  if (pressure >= 58) {
    return {
      signalClass: "VOLATILE_DIGESTION",
      astroReading: `Volatile-digestion window: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
    };
  }
  return {
    signalClass: pressure >= 48 ? "NOISE" : "LOW_PRESSURE",
    astroReading: `${pressure >= 48 ? "Noise" : "Low-pressure"} window: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
  };
}

function cleanWindowLabel(item, role) {
  const raw = String(item?.label || item?.windowLabel || item?.windowType || "").trim();
  if (!raw) return null;
  const generic = new Set([
    "active_window",
    "tactical_risk",
    "strategic_risk",
    "accumulation",
    "strategic_accumulation",
    "strategic_opportunity",
    "long_range_cycle",
    String(role || "").toLowerCase()
  ]);
  return generic.has(raw.toLowerCase()) ? null : raw;
}

function windowRef(item, role) {
  if (!item || !dateOf(item)) return null;
  const signal = windowSignal(item, role);
  return {
    role,
    date: dateOf(item),
    label: cleanWindowLabel(item, role),
    sourceWindowType: item.windowType || null,
    expansionScore: n(item.expansionScore, null),
    pressureScore: n(item.pressureScore, null),
    leadership: n(item.leadershipProbability, null),
    ...signal
  };
}

function catalystWindowRef(catalystScan = {}) {
  const item = catalystScan?.best;
  if (!item || !dateOf(item)) return null;
  const response = String(item?.expectedResponse || "").toLowerCase();
  const tone = String(item?.tone || "").toLowerCase();
  // Classify the stated astrological function, not incidental prose such as
  // "support remains stronger than pressure". Explicit constructive language
  // wins unless the response also names an actual adverse behaviour.
  const adverse = /narrative heat|quick reversal|crowd sensitivity|valuation compression|cooling|hesitation|break(?:down)?|reset risk|pressure (?:dominates|leads|builds)|volatile pressure/.test(response) || /^(pressure|volatile|reset)$/.test(tone);
  const constructive = /expansion|rerating|leadership|stronger bid|improved confidence|constructive|supportive|acceleration/.test(response) || /^(expansion|support|constructive)$/.test(tone);
  const pressure = adverse && !constructive;
  const expansion = constructive && !adverse;
  const role = pressure && !expansion ? "PRESSURE_CHECK" : expansion && !pressure ? "EXPANSION_REVIEW" : "CATALYST_REVIEW";
  const signalClass = /narrative heat|volatility|quick reversal|crowd sensitivity/.test(response)
    ? "VOLATILITY_REVERSAL"
    : /valuation compression|cooling|hesitation|pressure/.test(response)
      ? "COMPRESSION_COOLING"
      : /rerating|leadership|stronger bid|constructive/.test(response)
        ? "EXPANSION_RERATING"
        : "MIXED_TRANSITION";
  const signalLabel = signalClass.replaceAll("_", " ").toLowerCase();
  return {
    role,
    date: dateOf(item),
    label: item.label || "Catalyst",
    strength: item.strength || null,
    expectedBehaviour: item.expectedResponse || null,
    signalClass,
    astroReading: `${signalLabel.charAt(0).toUpperCase()}${signalLabel.slice(1)} catalyst; use the stock-specific natal contacts below for the expected expression.`,
    daysRemaining: n(item.daysRemaining, null)
  };
}

/** Pure astronomical-state projection. This layer must never emit capital actions. */
export function buildAstroTruthV35({ replayDate, replay = {}, windows = {}, macroSnapshot = {}, transitReceptorFit = {}, replayValidationIntelligence = {}, company = {}, catalystScan = {}, cyclePotentialScore = null }) {
  const reading = replayValidationIntelligence?.currentResearchReading || {};
  const map = windows?.windowMap || {};
  const expansionScore = Math.round(n(replay?.expansionScore, 50));
  const pressureScore = Math.round(n(replay?.pressureScore, 50));
  const tacticalLeadership = Math.round(n(replay?.leadershipProbability, 50));
  // Strategic capital is a 3–12/18 month bucket. A strong point near the end of
  // the two-year scanner must remain long-cycle context; it cannot leak back
  // into today's strategic leadership or capital approval.
  const strategicCandidate = [
    map?.strategicOpportunity,
    map?.strategicAccumulation,
    map?.accumulationOpen,
    windows?.strategic,
    windows?.bestWindow
  ].find(item => insideStrategicHorizon(item, replayDate)) || replay;
  const strategicLeadership = Math.round(n(strategicCandidate?.leadershipProbability, tacticalLeadership));
  const strategicWindow = strategicWindowPosture(replayDate, strategicCandidate, tacticalLeadership);
  const strategicOpportunityDate = dateOf(strategicCandidate) || replayDate;
  const pressureBeforeOpportunity = Boolean(
    map?.strategicRisk &&
    daysFrom(replayDate, map.strategicRisk) >= 0 &&
    daysFrom(replayDate, map.strategicRisk) < strategicWindow.daysToWindow
  );
  const dormancy = reading?.dormancy || {};
  const breakState = breakEvidence(reading, transitReceptorFit);
  const type = pressureType({ pressure: pressureScore, expansion: expansionScore, dormancy, breakState, receptor: transitReceptorFit });

  return {
    schemaVersion: "35.0",
    layer: "ASTRO_TRUTH",
    asOfDate: replayDate,
    expansionScore,
    pressureScore,
    pressureType: type,
    tacticalLeadership,
    strategicLeadership,
    strategicLeadershipDate: strategicOpportunityDate,
    strategicWindowPhase: strategicWindow.phase,
    daysToStrategicWindow: strategicWindow.daysToWindow,
    pressureBeforeOpportunity,
    dormancyLevel: String(dormancy?.type || (pressureScore < 55 && expansionScore < 55 ? "MEDIUM" : "LOW")).toUpperCase(),
    correctionMode: breakState.mapped ? "RESET" : type === "VOLATILE_DIGESTION" ? "DIGESTION" : type === "STRUCTURAL_DISCIPLINE" ? "DISCIPLINE" : "NORMAL",
    natalReliability: natalReliability(company, transitReceptorFit),
    receptorFit: {
      class: transitReceptorFit?.expressionClass || "UNRESOLVED",
      score: Math.round(n(transitReceptorFit?.scores?.expressionScore ?? transitReceptorFit?.expressionScore, 50)),
      confidence: Math.round(n(transitReceptorFit?.scores?.confidenceScore, 50))
    },
    cyclePotential: Math.round(n(cyclePotentialScore ?? replay?.cyclePotentialScore, strategicLeadership)),
    breakState,
    macroEnvironment: {
      environment: macroSnapshot?.environment || null,
      expansion: n(macroSnapshot?.expansion, null),
      pressure: n(macroSnapshot?.pressure, null)
    },
    windows: {
      currentWindow: windowRef({ ...replay, date: replayDate }, "ACTIVE_WINDOW"),
      catalystWindow: catalystWindowRef(catalystScan),
      pressureWindow: windowRef(map?.tacticalRisk, "PRESSURE_CHECK"),
      strategicPressureWindow: windowRef(map?.strategicRisk, "STRATEGIC_PROTECTION_REVIEW"),
      reentryWindow: windowRef(map?.accumulationOpen || map?.strategicAccumulation, "REENTRY_REVIEW"),
      strategicBuildWindow: windowRef(map?.strategicAccumulation || map?.strategicOpportunity, "STRATEGIC_BUILD_REVIEW"),
      fullBuildWindow: windowRef(map?.strategicOpportunity, "FULL_BUILD_UPGRADE_REVIEW"),
      longCycleWindow: windowRef(map?.longRangeCycle, "LONG_CYCLE_BACKGROUND")
    },
    evidence: {
      contacts: replay?.transitDetails || [],
      clusters: replay?.activeClusters || [],
      environmentSignature: replay?.environmentSignature || null,
      breakEvidence: breakState.evidence
    },
    invariants: {
      containsCapitalLanguage: false,
      futureCannotRewritePresent: true,
      historicalCanChangeAstronomicalFacts: false
    }
  };
}
