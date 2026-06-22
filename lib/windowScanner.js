import calculateTransitResonance from "./transitResonance.js";
import {
  generateRealTransits
} from "./realTransitGenerator.js";
import {
  calculateRealEclipseHits,
  getRelevantEclipses
} from "./realEclipseEngine.js";

function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function daysBetween(startDate, endDate) {
  const a = new Date(`${startDate}T00:00:00Z`);
  const b = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function buildTransitPackage(natal, date) {
  const transits = generateRealTransits(date);
  const relevantEclipses = getRelevantEclipses(date, {
    daysBefore: 30,
    daysAfter: 30
  });
  const eclipseHits = calculateRealEclipseHits(natal, {
    referenceDate: date,
    daysBefore: 30,
    daysAfter: 30,
    eclipses: relevantEclipses,
    orbLimit: 8
  });

  return {
    ...transits,
    relevantEclipses,
    eclipseHits
  };
}


function supportiveSlowContacts(item = {}) {
  return (item.transitDetails || []).filter(c => {
    const planet = String(c?.planet || "").toLowerCase();
    const aspect = String(c?.aspect || "").toLowerCase();
    return ["jupiter", "saturn", "rahu"].includes(planet) &&
      ["conjunction", "trine", "sextile"].includes(aspect) &&
      Number(c?.score || 0) > 0;
  });
}

function applyEpisodeContinuity(scans, historyScans, startDate) {
  let episodeStart = null;
  let lastSupportOffset = null;

  (historyScans || []).forEach(item => {
    const offset = daysBetween(startDate, item.date);
    const grammar = item.finAstroGrammar || {};
    const supportContacts = supportiveSlowContacts(item);
    const deployable = Boolean(grammar.support?.durableExpansion) &&
      Number(item.expansionScore || 0) >= Number(item.pressureScore || 0) - 8 &&
      Number(item.pressureScore || 0) < 82;
    if (deployable || supportContacts.length >= 2) {
      if (episodeStart === null) episodeStart = item.date;
      lastSupportOffset = offset;
    }
  });

  return scans.map((item, index) => {
    const offset = daysBetween(startDate, item.date);
    const supportContacts = supportiveSlowContacts(item);
    const grammar = item.finAstroGrammar || {};
    const deployableNow = Boolean(grammar.support?.durableExpansion) &&
      Number(item.expansionScore || 0) >= Number(item.pressureScore || 0) - 8 &&
      Number(item.pressureScore || 0) < 82;

    const priorRecentSupport = lastSupportOffset !== null && offset - lastSupportOffset <= 120;
    const pressureInsideActiveSupport = priorRecentSupport && supportContacts.length > 0 &&
      Boolean(grammar.pressure?.structuralReset || grammar.flags?.repairWatch || Number(item.pressureScore || 0) >= 68) &&
      Number(item.pressureScore || 0) < 82 &&
      Number(item.pressureScore || 0) <= Number(item.expansionScore || 0) + 8;

    if (deployableNow || supportContacts.length >= 2) {
      if (episodeStart === null) episodeStart = item.date;
      lastSupportOffset = offset;
    }

    const recentSupport = lastSupportOffset !== null && offset - lastSupportOffset <= 120;

    if (!pressureInsideActiveSupport) {
      return {
        ...item,
        episodeContext: {
          active: recentSupport && episodeStart !== null,
          episodeStart,
          pressureInsideActiveSupport: false,
          supportiveSlowContactCount: supportContacts.length
        }
      };
    }

    const severe = Number(item.pressureScore || 0) >= 72 || Boolean(grammar.pressure?.structuralReset);
    const signal = severe
      ? "SEVERE PRESSURE INSIDE ACTIVE EXPANSION — protect strength; cycle not yet terminated"
      : "CONTESTED EXPANSION EPISODE — support persists through pressure";
    const actionBias = severe ? "protect-strength" : "hold-wait";
    const pressureKind = severe ? "severe" : "digestion";
    const pressureRole = severe ? "pressure-inside-support" : "churn";

    const finAstroGrammar = {
      ...grammar,
      signal,
      actionBias,
      notes: [
        ...(grammar.notes || []),
        "A supportive slow-transit episode was already active within the prior 120 days and remains astrologically present. Current pressure is nested inside that episode; it does not terminate the cycle unless hard pressure clearly dominates or support exits operative orb."
      ],
      pressure: {
        ...(grammar.pressure || {}),
        pressureKind,
        pressureRole,
        firstPressureInsideSupport: true
      },
      flags: {
        ...(grammar.flags || {}),
        repairWatch: false,
        futureSupportOnly: false,
        contestedLeadership: true,
        pressureInsideActiveSupport: true
      }
    };

    return {
      ...item,
      finAstroGrammar,
      grammarSignal: signal,
      grammarActionBias: actionBias,
      grammarPressureKind: pressureKind,
      grammarPressureRole: pressureRole,
      episodeContext: {
        active: true,
        episodeStart,
        pressureInsideActiveSupport: true,
        supportiveSlowContactCount: supportContacts.length
      }
    };
  });
}

function peState(item = {}) {
  const pressure = Number(item.pressureScore ?? item.pressure ?? 0);
  const expansion = Number(item.expansionScore ?? item.expansion ?? 0);
  const leadership = Number(item.leadershipProbability ?? item.leadership ?? 0);
  return {
    pressure,
    expansion,
    leadership,
    expansionLead: expansion >= pressure + 8,
    pressureLead: pressure >= expansion + 8,
    highConflict: pressure >= 60 && expansion >= 60 && Math.abs(pressure - expansion) < 18
  };
}

function opportunityScore(item = {}, offsetDays = 0) {
  const st = peState(item);
  const timePenalty = Math.min(14, Math.max(0, offsetDays) / 90);
  return (st.expansion * 0.42) + (st.leadership * 0.46) - (st.pressure * 0.16) - timePenalty;
}

function riskScore(item = {}) {
  const st = peState(item);
  return (st.pressure * 0.65) + Math.max(0, st.pressure - st.expansion) * 0.35;
}

function isDeployableSignal(item = {}) {
  const signal = String(item.grammarSignal || item.finAstroGrammar?.signal || "");
  const bias = String(item.grammarActionBias || item.finAstroGrammar?.actionBias || "");

  if (/REPAIR WATCH|FUTURE SUPPORT|WATCH ONLY|PRESSURE FIRST|BREAK-RISK|AVOID FRESH CHASE|UNSTABLE EXPANSION/i.test(signal)) {
    return false;
  }

  if (/wait|protect|avoid/i.test(bias)) {
    return false;
  }

  return true;
}

function isUsableAccumulation(item = {}) {
  const st = peState(item);

  if (!isDeployableSignal(item)) {
    return false;
  }

  return (
    (st.expansion >= 62 && st.leadership >= 50 && st.pressure < 82) ||
    (st.expansionLead && st.expansion >= 58) ||
    (st.highConflict && st.expansion >= 68 && st.pressure < 78)
  );
}

function isExpansionWindow(item = {}) {
  const st = peState(item);
  return st.expansion >= 70 || st.leadership >= 70 || (st.expansionLead && st.expansion >= 62);
}

function isRiskWindow(item = {}) {
  const st = peState(item);
  const role = String(item.grammarPressureRole || item.finAstroGrammar?.pressure?.pressureRole || "").toLowerCase();
  const kind = String(item.grammarPressureKind || item.finAstroGrammar?.pressure?.pressureKind || "").toLowerCase();

  // v30.04M: pressure inside sector-relevant support is a churn/sizing event,
  // not a mapped break/protection window, unless pressure clearly dominates.
  if ((role === "churn" || kind === "digestion") && !st.pressureLead && st.pressure < 82) {
    return false;
  }

  return st.pressure >= 68 || st.pressureLead || (st.highConflict && st.pressure >= 64);
}

function annotateWindow(item, startDate, type, role) {
  if (!item) return null;
  const offsetDays = daysBetween(startDate, item.date);
  return {
    ...item,
    windowType: type,
    windowRole: role,
    offsetDays
  };
}

function firstInRange(scans, startDate, minDays, maxDays, predicate, type, role) {
  const found = scans.find(item => {
    const off = daysBetween(startDate, item.date);
    return off !== null && off >= minDays && off <= maxDays && predicate(item);
  });
  return annotateWindow(found, startDate, type, role);
}

function bestInRange(scans, startDate, minDays, maxDays, predicate, scorer, type, role) {
  const candidates = scans
    .map(item => ({ item, offset: daysBetween(startDate, item.date) }))
    .filter(({ item, offset }) => offset !== null && offset >= minDays && offset <= maxDays && predicate(item));
  if (!candidates.length) return null;
  candidates.sort((a, b) => scorer(b.item, b.offset) - scorer(a.item, a.offset));
  return annotateWindow(candidates[0].item, startDate, type, role);
}

function buildWindowMap(scans, startDate) {
  const currentCondition = annotateWindow(scans[0], startDate, "current", "Current condition");
  const accumulationOpen = firstInRange(scans, startDate, 0, 730, isUsableAccumulation, "accumulation", "Accumulation window opens");
  const tacticalOpportunity = bestInRange(scans, startDate, 0, 90, isExpansionWindow, opportunityScore, "tactical_opportunity", "Tactical opportunity");
  const tacticalRisk = firstInRange(scans, startDate, 0, 90, isRiskWindow, "tactical_risk", "Tactical risk");
  const strategicAccumulation = firstInRange(scans, startDate, 90, 730, isUsableAccumulation, "strategic_accumulation", "Strategic accumulation window");
  const strategicOpportunity = bestInRange(scans, startDate, 90, 730, isExpansionWindow, opportunityScore, "strategic_opportunity", "Strategic opportunity");
  const strategicRisk = firstInRange(scans, startDate, 90, 730, isRiskWindow, "strategic_risk", "Strategic risk");
  const longRangeCycle = bestInRange(scans, startDate, 730, 1080, isExpansionWindow, opportunityScore, "long_range_cycle", "Long-range cycle");

  let dormancyWindow = null;
  if (accumulationOpen?.offsetDays > 45) {
    dormancyWindow = {
      windowType: "dormancy",
      windowRole: "Dormancy window",
      date: startDate,
      endDate: accumulationOpen.date,
      offsetDays: accumulationOpen.offsetDays,
      pressureScore: currentCondition?.pressureScore,
      expansionScore: currentCondition?.expansionScore,
      leadershipProbability: currentCondition?.leadershipProbability
    };
  }

  const nearestUsableWindow = tacticalOpportunity || accumulationOpen || strategicAccumulation || strategicOpportunity || null;

  return {
    currentCondition,
    accumulationOpen,
    tacticalOpportunity,
    tacticalRisk,
    strategicAccumulation,
    strategicOpportunity,
    strategicRisk,
    dormancyWindow,
    longRangeCycle,
    nearestUsableWindow
  };
}

export function scanForwardWindows(natal, startDate) {
  if (!startDate) {
    throw new Error("startDate is required for scanForwardWindows");
  }

  const scans = [];
  const historyScans = [];

  // v30.04O: establish the slow-transit episode already in force before the replay date.
  for (let i = -120; i < 0; i += 30) {
    const scanDate = formatDate(addDays(startDate, i));
    const transitData = buildTransitPackage(natal, scanDate);
    const resonance = calculateTransitResonance(natal, transitData);
    historyScans.push({
      date: scanDate,
      transits: transitData,
      relevantEclipses: transitData.relevantEclipses,
      eclipseHits: transitData.eclipseHits,
      ...resonance
    });
  }

  // v28.9: scan a full 2–3 year strategic horizon so long-range/multibagger arcs
  // can be shown as context without suppressing earlier accumulation windows.
  for (let i = 0; i <= 1080; i += 30) {
    const scanDate = formatDate(addDays(startDate, i));
    const transitData = buildTransitPackage(natal, scanDate);
    const resonance = calculateTransitResonance(natal, transitData);

    scans.push({
      date: scanDate,
      transits: transitData,
      relevantEclipses: transitData.relevantEclipses,
      eclipseHits: transitData.eclipseHits,
      ...resonance
    });
  }

  const episodeAwareScans = applyEpisodeContinuity(scans, historyScans, startDate);
  scans.splice(0, scans.length, ...episodeAwareScans);

  const windowMap = buildWindowMap(scans, startDate);

  const bestWindow = scans.reduce(
    (best, item) => item.leadershipProbability > best.leadershipProbability ? item : best,
    scans[0]
  );

  const pressureWindows = scans
    .filter(item => item.pressureScore >= 70)
    .slice(0, 8);

  const catalystWindows = scans
    .filter(item =>
      item.clusterDensity >= 3 ||
      item.activeClusters?.length > 0 ||
      item.shadowWindows?.eclipse
    )
    .slice(0, 10);

  const expansionWindows = scans
    .filter(item => item.expansionScore >= 70 || item.leadershipProbability >= 70)
    .slice(0, 10);

  return {
    immediate: scans[0],
    tactical: windowMap.tacticalOpportunity || scans[3],
    strategic: windowMap.strategicOpportunity || scans[12],
    bestWindow,
    nearestUsableWindow: windowMap.nearestUsableWindow,
    windowMap,
    pressureWindows,
    catalystWindows,
    expansionWindows,
    fullScan: scans
  };
}

export default scanForwardWindows;
