import {
  generateRealTransits,
  getElement,
  getSign,
  nextSignIngress,
  nextRetrogradeTransitions,
  ephemerisMetadata,
  getBodyPosition,
  parseUtcDate
} from "./realTransitGenerator.js";
import {
  getRelevantEclipses
} from "./realEclipseEngine.js";

function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function angleDiff(a, b) {
  const diff = Math.abs(normalizeDegree(a) - normalizeDegree(b));
  return Math.min(diff, 360 - diff);
}

function aspectOrb(a, b, target) {
  return Math.abs(angleDiff(a, b) - target);
}

function addDaysUtc(date, days) {
  const d = parseUtcDate(date);
  d.setTime(d.getTime() + days * 86400000);
  return d;
}

function daysBetween(start, end) {
  return (parseUtcDate(end).getTime() - parseUtcDate(start).getTime()) / 86400000;
}

function directedAspectOrb(a, b, target) {
  const direct = aspectOrb(a, b, target);
  const mirror = target === 0 || target === 180 ? direct : aspectOrb(a, b, 360 - target);
  return Math.min(direct, mirror);
}

const MACRO_ASPECTS = [
  { name: "conjunction", angle: 0, orb: 6, type: "amplification" },
  { name: "sextile", angle: 60, orb: 4, type: "support" },
  { name: "square", angle: 90, orb: 5, type: "pressure" },
  { name: "trine", angle: 120, orb: 5, type: "support" },
  { name: "opposition", angle: 180, orb: 5, type: "pressure" }
];

const MACRO_PAIRS = [
  ["jupiter", "venus"],
  ["jupiter", "mercury"],
  ["jupiter", "mars"],
  ["jupiter", "saturn"],
  ["jupiter", "rahu"],
  ["saturn", "rahu"],
  ["saturn", "venus"],
  ["saturn", "mercury"],
  ["mars", "saturn"],
  ["mars", "rahu"],
  ["venus", "rahu"],
  ["mercury", "rahu"],
  ["sun", "rahu"]
];

const MACRO_PRESSURE_THRESHOLDS = {
  extreme: 45,
  high: 28,
  pressure: 15
};

const SOURCE_WEIGHTS = {
  direct: 1.0,
  cluster: 0.35,
  shadow: 0.25,
  overlap: 0.15,
  transition: 0.35
};

function weightedTransitionScore(events) {
  return (events || [])
    .filter(item => item?.type === "transition")
    .reduce((sum, item) => sum + Number(item.strength || 0) * SOURCE_WEIGHTS.transition, 0);
}

function weightedOverlapIntensity(overlap = {}) {
  return Object.fromEntries(
    Object.entries(overlap).map(([planet, count]) => [
      planet,
      Number((Number(count || 0) * SOURCE_WEIGHTS.overlap).toFixed(2))
    ])
  );
}

function weightedClusterScore(clusters = []) {
  return Number(
    clusters
      .reduce((sum, cluster) => sum + Number(cluster.density || 0) * SOURCE_WEIGHTS.cluster, 0)
      .toFixed(2)
  );
}

function titlePlanet(planet) {
  return String(planet || "")
    .charAt(0)
    .toUpperCase() + String(planet || "").slice(1);
}

function aspectTone(pair, aspect) {
  const joined = pair.join("-");
  const supportive = ["conjunction", "trine", "sextile"].includes(aspect.name);

  if (joined === "jupiter-venus" && supportive) {
    return "expansion";
  }

  if (joined === "saturn-venus" && ["trine", "sextile"].includes(aspect.name)) {
    return "expansion";
  }

  if (joined === "mars-saturn" && ["trine", "sextile"].includes(aspect.name)) {
    return "transition";
  }

  if (aspect.name === "square" || aspect.name === "opposition") {
    return "pressure";
  }

  if (pair.includes("rahu")) {
    return "volatility";
  }

  if (aspect.type === "support") {
    return "expansion";
  }

  return "transition";
}

function notesForMacroAspect(pair, aspect, degree, sign) {
  const label = `${titlePlanet(pair[0])}-${titlePlanet(pair[1])} ${aspect.name}`;

  if (pair.includes("jupiter") && pair.includes("venus")) {
    return `${label}: expansion, liquidity, valuation/rerating and preference-for-quality themes can strengthen; natal Venus/Jupiter contacts decide which stocks benefit. Exact near ${Number(degree).toFixed(2)}° ${sign}.`;
  }

  if (pair.includes("jupiter") && pair.includes("rahu")) {
    return `${label}: expansion plus amplification; can become leadership or speculative heat depending on natal response.`;
  }

  if (pair.includes("saturn") && pair.includes("rahu")) {
    return `${label}: fear/greed compression, unstable pressure, and churning.`;
  }

  if (pair.includes("saturn") && pair.includes("venus") && ["trine", "sextile"].includes(aspect.name)) {
    return `${label}: disciplined expansion, valuation repair, selective support, and preference for durable quality.`;
  }

  if (pair.includes("mars") && pair.includes("saturn")) {
    return `${label}: force meets restraint; disciplined execution or friction depending on natal response.`;
  }

  return `${label}: macro aspect window; stock-specific natal contacts decide the behaviour.`;
}

function aspectDegreeForPair(pair, date) {
  const p1 = getBodyPosition(pair[0], date);
  const p2 = getBodyPosition(pair[1], date);
  return {
    p1,
    p2,
    midpoint: ((p1.degree + p2.degree) / 2) % 360
  };
}

function findNextMacroAspect(pair, aspect, startDate, scanDays = 120) {
  const start = parseUtcDate(startDate);
  let best = null;

  for (let step = 0; step <= scanDays * 4; step += 1) {
    const dayOffset = step / 4;
    const date = addDaysUtc(start, dayOffset);
    const p1 = getBodyPosition(pair[0], date);
    const p2 = getBodyPosition(pair[1], date);
    const orb = directedAspectOrb(p1.degree, p2.degree, aspect.angle);

    if (!best || orb < best.orb) {
      best = {
        date,
        orb,
        p1,
        p2,
        dayOffset
      };
    }
  }

  if (!best || best.orb > aspect.orb) {
    return null;
  }

  let low = addDaysUtc(best.date, -0.75);
  let high = addDaysUtc(best.date, 0.75);

  for (let i = 0; i < 48; i += 1) {
    const m1 = new Date(low.getTime() + (high.getTime() - low.getTime()) / 3);
    const m2 = new Date(high.getTime() - (high.getTime() - low.getTime()) / 3);
    const m1Pos = aspectDegreeForPair(pair, m1);
    const m2Pos = aspectDegreeForPair(pair, m2);
    const m1Orb = directedAspectOrb(m1Pos.p1.degree, m1Pos.p2.degree, aspect.angle);
    const m2Orb = directedAspectOrb(m2Pos.p1.degree, m2Pos.p2.degree, aspect.angle);

    if (m1Orb < m2Orb) {
      high = m2;
    } else {
      low = m1;
    }
  }

  const exact = new Date((low.getTime() + high.getTime()) / 2);

  if (exact < start) {
    return null;
  }

  const pos = aspectDegreeForPair(pair, exact);
  const exactOrb = directedAspectOrb(pos.p1.degree, pos.p2.degree, aspect.angle);

  if (exactOrb > aspect.orb) {
    return null;
  }

  const daysTill = (exact.getTime() - start.getTime()) / 86400000;
  const tone = aspectTone(pair, aspect);
  const degree = pos.p1.degree;
  const sign = pos.p1.sign;

  return {
    label: `${titlePlanet(pair[0])}-${titlePlanet(pair[1])} ${aspect.name}`,
    name: `${pair[0]}-${pair[1]} ${aspect.name}`,
    planets: pair,
    aspect: aspect.name,
    angle: aspect.angle,
    date: exact.toISOString().split("T")[0],
    exactUtc: exact.toISOString(),
    exactIst: new Date(exact.getTime() + 5.5 * 3600000)
      .toISOString()
      .replace("Z", "+05:30"),
    daysRemaining: Number(daysTill.toFixed(2)),
    daysTill: Number(daysTill.toFixed(2)),
    timing: daysTill <= 7 ? "NEAR" : "UPCOMING",
    type: tone,
    resultingEnvironment: tone === "expansion" ? "EXPANSION / RERATING" : tone === "pressure" ? "PRESSURE / REVIEW" : tone === "volatility" ? "AMPLIFICATION / VOLATILITY" : "ASPECT SHIFT",
    notes: notesForMacroAspect(pair, aspect, degree, sign),
    source: "direct Swiss Ephemeris aspect scan + local refinement",
    eventPrecision: "direct-swiss-refined",
    precisionNote: "Every scan and refinement point is calculated directly with swe_calc_ut and SEFLG_SWIEPH.",
    orb: Number(exactOrb.toFixed(3)),
    sign,
    degree: Number(degree.toFixed(4)),
    p1: pos.p1,
    p2: pos.p2
  };
}

function buildUpcomingAspectCandidates(today) {
  const candidates = [];

  for (const pair of MACRO_PAIRS) {
    for (const aspect of MACRO_ASPECTS) {
      const hit = findNextMacroAspect(pair, aspect, today, pair.includes("mercury") || pair.includes("venus") ? 90 : 180);

      if (hit) {
        candidates.push(hit);
      }
    }
  }

  const byKey = new Map();

  for (const item of candidates.sort((a, b) => a.daysRemaining - b.daysRemaining)) {
    const key = item.label;

    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()].sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function buildCurrentMacroAspects(transits, today) {
  const events = [];

  for (const pair of MACRO_PAIRS) {
    const p1 = transits.positions?.[pair[0]];
    const p2 = transits.positions?.[pair[1]];

    if (!p1 || !p2) {
      continue;
    }

    for (const aspect of MACRO_ASPECTS) {
      const orb = directedAspectOrb(p1.degree, p2.degree, aspect.angle);

      if (orb <= Math.min(aspect.orb, 3.5)) {
        const tone = aspectTone(pair, aspect);
        const strength = Math.max(4, Math.round((aspect.orb - orb + 1) * 2));

        events.push(
          event(
            `${titlePlanet(pair[0])}-${titlePlanet(pair[1])} ${aspect.name}`,
            tone,
            strength,
            notesForMacroAspect(pair, aspect, p1.degree, p1.sign),
            today,
            "ACTIVE",
            0,
            {
              planets: pair,
              aspect: aspect.name,
              orb: Number(orb.toFixed(3)),
              source: "active ephemeris provider current aspect calculation"
            }
          )
        );
      }
    }
  }

  return events;
}

function planetOverlapFromEvents(events) {
  const overlap = {};

  for (const item of events || []) {
    for (const planet of item.planets || []) {
      overlap[planet] = (overlap[planet] || 0) + 1;
    }
  }

  return overlap;
}

function buildEventClusters(events, windowDays = 7) {
  const dated = dedupeEvents(events || [])
    .filter(item => typeof item.daysRemaining === "number")
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const clusters = [];

  for (let i = 0; i < dated.length; i += 1) {
    const base = dated[i];
    const members = dedupeEvents(dated.filter(item => Math.abs(item.daysRemaining - base.daysRemaining) <= windowDays));

    if (members.length >= 2) {
      const key = members.map(item => eventRootKey(item)).sort().join("|");

      if (!clusters.some(cluster => cluster.key === key)) {
        clusters.push({
          key,
          centerDate: base.date,
          centerDaysRemaining: base.daysRemaining,
          density: members.length,
          labels: members.map(item => item.label),
          windowDays,
          summary: `${members.length} macro events within ±${windowDays} days of ${base.date}`
        });
      }
    }
  }

  return clusters.slice(0, 8);
}

function buildShadowWindows(today, activeEvents, phases) {
  const all = [...(activeEvents || []), ...(phases || [])];

  const eclipse = all.find(item => String(item.label || "").toLowerCase().includes("eclipse") && Math.abs(Number(item.daysRemaining ?? 999)) <= 30);
  const mercury = all.find(item => String(item.label || "").toLowerCase().includes("mercury") && String(item.label || "").toLowerCase().includes("retrograde") && Math.abs(Number(item.daysRemaining ?? 999)) <= 14);
  const saturn = all.find(item => String(item.label || "").toLowerCase().includes("saturn") && String(item.label || "").toLowerCase().includes("retrograde") && Math.abs(Number(item.daysRemaining ?? 999)) <= 21);
  const aspect = all.find(item => Array.isArray(item.planets) && Math.abs(Number(item.daysRemaining ?? 999)) <= 7);

  return {
    eclipse: Boolean(eclipse),
    mercuryStation: Boolean(mercury),
    saturnStation: Boolean(saturn),
    aspect: Boolean(aspect),
    activeLabels: [...new Set([eclipse, mercury, saturn, aspect]
      .filter(Boolean)
      .map(item => item.label))]
  };
}

function buildMacroSignature(activeEvents, phases, eventClusters) {
  const focus = dedupeEvents([...(activeEvents || []), ...(phases || []).filter(item => Number(item.daysRemaining ?? 999) <= 14)])
    .map(item => item.label)
    .filter(Boolean)
    .slice(0, 6);

  if (!focus.length) {
    return eventClusters?.length
      ? `Cluster approaching: ${eventClusters[0].labels.slice(0, 3).join(" + ")}`
      : "Quiet macro sky";
  }

  return focus.join(" / ");
}

function phaseLabel(days) {
  const abs = Math.abs(days);

  if (abs <= 3) {
    return "PEAK";
  }

  if (days < 0) {
    return "SEPARATING";
  }

  return "APPLYING";
}

function todayIso(date) {
  return (
    date ||
    new Date()
      .toISOString()
      .split("T")[0]
  );
}

function moonClimate(moonDegree) {
  const element = getElement(moonDegree);

  if (element === "water") {
    return "Emotional";
  }

  if (element === "fire") {
    return "Aggressive";
  }

  if (element === "air") {
    return "Narrative";
  }

  return "Practical";
}

function event(label, type, strength, notes, date, phase, daysRemaining, extra = {}) {
  return {
    label,
    type,
    strength,
    notes,
    phase,
    daysRemaining,
    date,
    ...extra
  };
}

function eventIdentity(item) {
  const label = String(item?.label || item?.name || "").toLowerCase().trim();
  const date = String(item?.date || "").slice(0, 10);
  const aspect = String(item?.aspect || "").toLowerCase();
  const planets = Array.isArray(item?.planets) ? item.planets.join("-").toLowerCase() : "";
  return [label, date, aspect, planets].filter(Boolean).join("|");
}

function eventRootKey(item) {
  const label = String(item?.label || item?.name || "").toLowerCase().trim();
  const aspect = String(item?.aspect || "").toLowerCase();
  const planets = Array.isArray(item?.planets) ? item.planets.join("-").toLowerCase() : "";
  return [label, aspect, planets].filter(Boolean).join("|");
}

function dedupeEvents(events, { activeRoots = new Set(), dropActiveDuplicates = false } = {}) {
  const seen = new Set();
  const output = [];

  for (const item of events || []) {
    const root = eventRootKey(item);

    if (dropActiveDuplicates && activeRoots.has(root)) {
      continue;
    }

    const key = eventIdentity(item) || root;
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

function normalizeStaticEvent(item) {
  if (!item) return null;
  const lower = String(item.label || item.name || "").toLowerCase();
  let type = item.type;
  let resultingEnvironment = item.resultingEnvironment;
  let label = item.label;
  let name = item.name;
  let notes = item.notes;

  if (item.kind === "eclipse" || lower.includes("eclipse")) {
    const eclipseKind = item.eclipseKind || item.type || (lower.includes("solar") ? "solar" : lower.includes("lunar") ? "lunar" : "eclipse");
    const eclipseType = item.eclipseType || `${String(eclipseKind).charAt(0).toUpperCase()}${String(eclipseKind).slice(1)} Eclipse`;
    const sign = item.sign || "unknown sign";
    const degreeValue = Number(item.degree ?? item.siderealLongitude);
    const degreeText = Number.isFinite(degreeValue) ? degreeValue.toFixed(2) : "unknown";

    label = item.label || `${eclipseType.replace(/\b\w/g, c => c.toUpperCase())} in ${sign}`;
    name = item.name && !String(item.name).includes("undefined") ? item.name : eclipseType;
    resultingEnvironment = item.resultingEnvironment || (String(eclipseKind).toLowerCase() === "solar" ? "RESET / VISIBILITY" : "CULMINATION / VOLATILITY");
    notes = item.notes && !String(item.notes).includes("undefined")
      ? item.notes
      : `${label} at ${degreeText}° ${sign}.`;
  }

  if (lower.includes("saturn-venus") && (lower.includes("trine") || lower.includes("sextile"))) {
    type = "expansion";
    resultingEnvironment = "DISCIPLINED EXPANSION / VALUATION REPAIR";
  }

  if (lower.includes("mars-saturn") && (lower.includes("trine") || lower.includes("sextile"))) {
    type = "transition";
    resultingEnvironment = "DISCIPLINED EXECUTION / FRICTION TEST";
  }

  return {
    ...item,
    label,
    name,
    notes,
    type,
    resultingEnvironment,
    eventPrecision: item.eventPrecision || "direct-swiss-refined",
    precisionNote: item.precisionNote || "Timestamp is derived from direct Swiss Ephemeris calculations."
  };
}


function hardenEclipseEvent(item) {
  if (!item) return item;
  const lower = String(item.label || item.name || item.eclipseType || "").toLowerCase();
  const isEclipse = item.kind === "eclipse" || lower.includes("eclipse") || item.eclipseKind || item.eclipseType;
  if (!isEclipse) return item;

  const kindRaw = String(item.eclipseKind || item.type || (lower.includes("solar") ? "solar" : lower.includes("lunar") ? "lunar" : "eclipse")).toLowerCase();
  const kind = kindRaw.includes("solar") ? "solar" : kindRaw.includes("lunar") ? "lunar" : "eclipse";
  const typeText = String(item.eclipseType || (kind === "solar" ? "Solar Eclipse" : kind === "lunar" ? "Lunar Eclipse" : "Eclipse"));
  const prettyType = typeText
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
  const sign = item.sign || "unknown sign";
  const degreeValue = Number(item.degree ?? item.siderealLongitude ?? item.longitude);
  const degreeText = Number.isFinite(degreeValue) ? degreeValue.toFixed(2) : "unknown";
  const cleanLabel = (item.label && !String(item.label).toLowerCase().includes("undefined"))
    ? item.label
    : `${prettyType} in ${sign}`;

  return {
    ...item,
    label: cleanLabel,
    name: cleanLabel,
    notes: `${cleanLabel} at ${degreeText}° ${sign}.`,
    resultingEnvironment: item.resultingEnvironment || (kind === "solar" ? "RESET / VISIBILITY" : "CULMINATION / VOLATILITY"),
    eventPrecision: item.eventPrecision || "direct-swiss-exact",
    precisionNote: item.precisionNote || "Eclipse maximum is returned directly by Swiss Ephemeris."
  };
}

function hardenEclipseEvents(events) {
  return (events || []).map(hardenEclipseEvent);
}

function buildAspectEvents(transits, today) {
  const activeEvents = [];

  const jupiterRahuConj = aspectOrb(transits.jupiter, transits.rahu, 0);
  const jupiterRahuTrine = aspectOrb(transits.jupiter, transits.rahu, 120);
  const saturnRahuConj = aspectOrb(transits.saturn, transits.rahu, 0);
  const saturnRahuSquare = aspectOrb(transits.saturn, transits.rahu, 90);
  const saturnJupiterHard = Math.min(
    aspectOrb(transits.saturn, transits.jupiter, 90),
    aspectOrb(transits.saturn, transits.jupiter, 180)
  );

  if (jupiterRahuConj <= 8 || jupiterRahuTrine <= 6) {
    activeEvents.push(
      event(
        "Jupiter-Rahu amplification",
        "expansion",
        Math.round(18 - Math.min(jupiterRahuConj, jupiterRahuTrine)),
        "Expansion plus amplification; can support leadership or speculative heat depending on natal response.",
        today,
        "ACTIVE",
        0,
        { source: "active ephemeris provider aspect calculation" }
      )
    );
  }

  if (saturnRahuConj <= 8 || saturnRahuSquare <= 6) {
    activeEvents.push(
      event(
        "Saturn-Rahu compression",
        "pressure",
        Math.round(18 - Math.min(saturnRahuConj, saturnRahuSquare)),
        "Fear/greed instability, delays, churning, and pressure on weak structures.",
        today,
        "ACTIVE",
        0,
        { source: "active ephemeris provider aspect calculation" }
      )
    );
  }

  if (saturnJupiterHard <= 7) {
    activeEvents.push(
      event(
        "Jupiter-Saturn tension",
        "transition",
        Math.round(16 - saturnJupiterHard),
        "Expansion and restraint are both active; transition/compression environment.",
        today,
        "ACTIVE",
        0,
        { source: "active ephemeris provider aspect calculation" }
      )
    );
  }

  activeEvents.push(...buildCurrentMacroAspects(transits, today));

  return activeEvents;
}

function currentRetrogradeEvents(transits, today) {
  const events = [];

  for (const planet of ["mercury", "venus", "mars", "jupiter", "saturn"]) {
    const position = transits.positions?.[planet];

    if (!position?.retrograde) {
      continue;
    }

    events.push(
      event(
        `${planet.toUpperCase()} retrograde active`,
        planet === "mercury" ? "volatility" : "transition",
        planet === "mercury" ? 12 : 8,
        `${planet} is retrograde in ${position.sign}; interpret as review, delay, reversal, or internalisation depending on natal contact.`,
        today,
        "ACTIVE",
        0,
        {
          planet,
          sign: position.sign,
          degree: position.degree,
          speedLongitude: position.speedLongitude,
          source: "active ephemeris provider speed calculation"
        }
      )
    );
  }

  return events;
}

function behaviourOutline(environment, activeEvents, transits) {
  const notes = [];

  if (environment === "EXTREME PRESSURE" || environment === "HIGH PRESSURE" || environment === "PRESSURE") {
    notes.push("Pressure-dominant sky: caution, compression, weak structures under stress.");
  } else if (environment === "EXPANSION") {
    notes.push("Expansion-dominant sky: improved risk appetite, leadership search, rerating potential.");
  } else if (environment === "VOLATILE TRANSITION") {
    notes.push("Volatile transition: resets, rotations, false starts, and leadership change are more likely.");
  } else {
    notes.push("Balanced sky: no dominant macro astro force; stock-specific natal activations matter more.");
  }

  if (activeEvents.some(e => e.label?.includes("MERCURY") && e.label?.includes("retrograde"))) {
    notes.push("Mercury retrograde is active: expect narrative confusion, data/communication revisions, and choppy decision-making.");
  }

  if (activeEvents.some(e => e.label?.toLowerCase().includes("eclipse"))) {
    notes.push("Eclipse shadow is active: inflection/reset energy is present; natal planet contacts should be checked stock-by-stock.");
  }

  if (transits?.positions?.jupiter?.sign) {
    notes.push(`Jupiter is in ${transits.positions.jupiter.sign}: expansion themes are filtered through this sign.`);
  }

  if (transits?.positions?.saturn?.sign) {
    notes.push(`Saturn is in ${transits.positions.saturn.sign}: pressure/restructuring themes are filtered through this sign.`);
  }

  return notes;
}


function formatDays(days) {
  if (days === null || days === undefined || Number.isNaN(Number(days))) {
    return "timing unknown";
  }

  const value = Number(days);

  if (Math.abs(value) < 0.25) {
    return "active now";
  }

  if (value < 0) {
    return `${Math.abs(value).toFixed(1)} days ago`;
  }

  return `in ${value.toFixed(1)} days`;
}

function toneForEvent(eventItem) {
  const type = String(eventItem?.type || "").toLowerCase();
  const label = String(eventItem?.label || "").toLowerCase();
  const result = String(eventItem?.resultingEnvironment || "").toLowerCase();

  if (label.includes("saturn-venus") && (label.includes("trine") || label.includes("sextile"))) {
    return "expansion";
  }

  if (label.includes("mars-saturn") && (label.includes("trine") || label.includes("sextile"))) {
    return "transition";
  }

  if (type.includes("pressure") || result.includes("pressure") || label.includes("hard")) {
    return "pressure";
  }

  if (type.includes("volatility") || result.includes("volatility") || label.includes("retrograde") || label.includes("lunar")) {
    return "volatility";
  }

  if (type.includes("reset") || result.includes("reset") || label.includes("eclipse")) {
    return "reset";
  }

  if (type.includes("expansion") || result.includes("expansion") || label.includes("jupiter")) {
    return "expansion";
  }

  if (type.includes("transition") || result.includes("shift") || label.includes("ingress") || label.includes("saturn")) {
    return "transition";
  }

  return "monitoring";
}

function actionForEnvironment(environment, pressure, expansion, volatility) {
  if (environment === "EXTREME PRESSURE" || pressure >= MACRO_PRESSURE_THRESHOLDS.extreme) {
    return "🟠 HEAVY TRIM";
  }

  if (environment === "HIGH PRESSURE" || pressure >= MACRO_PRESSURE_THRESHOLDS.high) {
    return "⚫ WATCH CLOSELY";
  }

  if (environment === "PRESSURE" || pressure >= MACRO_PRESSURE_THRESHOLDS.pressure || volatility >= 30) {
    return "⚫ WATCH CLOSELY";
  }

  if (environment === "EXPANSION" && expansion >= 25) {
    return "🟢 ACCUMULATE";
  }

  if (environment === "VOLATILE TRANSITION") {
    return "⚫ WATCH CLOSELY";
  }

  return "🔵 HOLD CORE";
}

function behaviourForTone(tone, item) {
  const label = String(item?.label || "");
  const lower = label.toLowerCase();

  if (lower.includes("saturn-venus") && (lower.includes("trine") || lower.includes("sextile"))) {
    return "Disciplined expansion: valuation repair, selective support, and preference for durable quality where natal Venus/Saturn contacts are receptive.";
  }

  if (lower.includes("mars-saturn") && (lower.includes("trine") || lower.includes("sextile"))) {
    return "Execution test: force meets restraint; constructive only where natal structure can absorb the pressure.";
  }

  if (tone === "pressure") {
    return "Compression, caution, forced review, weaker structures under stress.";
  }

  if (tone === "volatility") {
    return "Choppy decision-making, reversals, headline noise, delayed confirmation.";
  }

  if (tone === "reset") {
    return "Reset/inflection window; natal contacts decide whether this becomes breakout, climax, or reversal.";
  }

  if (tone === "expansion") {
    return "Expansion window; leadership search, rerating, and confidence can improve where natal support exists.";
  }

  if (tone === "transition") {
    return "Sign or direction shift; market behaviour can rotate as the planetary filter changes.";
  }

  return label ? `${label}: monitor for stock-specific natal response.` : "Stable conditions; stock-specific natal activations matter most.";
}


function macroCatalystPriority(item) {
  if (!item) return 0;
  const label = String(item.label || item.name || "").toLowerCase();
  const kind = String(item.kind || "").toLowerCase();
  const planet = String(item.planet || "").toLowerCase();
  const planets = Array.isArray(item.planets) ? item.planets.map(p => String(p).toLowerCase()) : [];
  const days = Number(item.daysRemaining ?? item.daysTill ?? 999);
  let score = 0;

  const has = (...names) => names.every(name => label.includes(name) || planets.includes(name));

  // v28.0: choose the next regime-changing catalyst, not merely the first chronological event.
  if (label.includes("eclipse")) score += 120;
  if (has("saturn", "jupiter") || has("jupiter", "saturn")) score += 105;
  if (has("jupiter", "rahu") || has("jupiter", "ketu")) score += 98;
  if (has("mars", "saturn") || has("saturn", "mars")) score += 88;
  if (kind === "ingress" || label.includes("ingress")) {
    score += ["jupiter", "saturn", "rahu", "ketu"].includes(planet) ? 76 : 18;
  }
  if (label.includes("retrograde") || label.includes("direct begins") || label.includes("station")) score += 58;

  if (label.includes("jupiter") && (label.includes("venus") || label.includes("mercury") || label.includes("mars"))) score += 42;
  if (label.includes("saturn") && (label.includes("mercury") || label.includes("venus"))) score += 38;
  if (label.includes("rahu") || label.includes("ketu")) score += 34;
  if (label.includes("square") || label.includes("opposition")) score += 25;
  if (label.includes("conjunction")) score += 20;
  if (label.includes("trine") || label.includes("sextile")) score += 10;

  // Keep near catalysts visible, but do not let chronology override regime importance.
  if (Number.isFinite(days)) {
    if (days <= 7) score += 18;
    else if (days <= 30) score += 10;
    else if (days <= 90) score += 3;
  }

  return score;
}

function selectNextMacroCatalyst(phases, activeRoots = new Set()) {
  const upcoming = (phases || [])
    .filter(item => !activeRoots.has(eventRootKey(item)))
    .filter(item => Number(item.daysRemaining ?? item.daysTill ?? 999) > 0.25);

  if (!upcoming.length) return null;

  const major = upcoming
    .map(item => ({ item, priority: macroCatalystPriority(item) }))
    .filter(entry => entry.priority >= 70)
    .sort((a, b) => b.priority - a.priority || Number(a.item.daysRemaining ?? a.item.daysTill ?? 999) - Number(b.item.daysRemaining ?? b.item.daysTill ?? 999));

  return (major[0]?.item) || upcoming[0] || null;
}


function formatNarrativeShift(item) {
  if (!item) return null;
  const tone = toneForEvent(item);
  return {
    label: item.label || item.name,
    date: item.date,
    exactUtc: item.exactUtc,
    exactIst: item.exactIst,
    daysRemaining: item.daysRemaining ?? item.daysTill,
    resultingEnvironment: item.resultingEnvironment,
    notes: item.notes,
    tone,
    likelyBehaviour: behaviourForTone(tone, item),
    source: item.source || "ephemeris-derived",
    eventPrecision: item.eventPrecision || null,
    precisionNote: item.precisionNote || null
  };
}

function buildMacroEventCards(activeEvents, phases) {
  const activeCards = activeEvents.map(item => {
    const tone = toneForEvent(item);

    return {
      label: item.label,
      tone,
      phase: item.phase || "ACTIVE",
      date: item.date,
      daysRemaining: item.daysRemaining ?? 0,
      strength: item.strength ?? 0,
      notes: item.notes,
      behaviour: behaviourForTone(tone, item),
      source: item.source || "ephemeris-derived",
      eventPrecision: item.eventPrecision || null,
      precisionNote: item.precisionNote || null
    };
  });

  const incomingCards = phases.slice(0, 6).map(item => {
    const tone = toneForEvent(item);

    return {
      label: item.label || item.name,
      tone,
      phase: item.timing || "UPCOMING",
      date: item.date,
      exactUtc: item.exactUtc,
      exactIst: item.exactIst,
      daysRemaining: item.daysRemaining ?? item.daysTill,
      resultingEnvironment: item.resultingEnvironment,
      notes: item.notes,
      behaviour: behaviourForTone(tone, item),
      source: item.source || "ephemeris-derived",
      eventPrecision: item.eventPrecision || null,
      precisionNote: item.precisionNote || null
    };
  });

  return {
    activeCards,
    incomingCards
  };
}

function buildMacroNarrative(environment, pressure, expansion, volatility, activeEvents, phases, transits) {
  const activeRoots = new Set((activeEvents || []).map(eventRootKey));
  const nextShift = selectNextMacroCatalyst(phases, activeRoots);
  const mainActive = activeEvents[0] || null;
  const focus = mainActive || nextShift;
  const focusTone = toneForEvent(focus || {});
  const jupiterSign = transits?.positions?.jupiter?.sign || "-";
  const saturnSign = transits?.positions?.saturn?.sign || "-";
  const mercuryPosition = transits?.positions?.mercury;

  const headline =
    activeEvents.length > 0
      ? `${environment}: ${activeEvents.slice(0, 2).map(item => item.label).join(" + ")}`
      : `${environment}: stable macro sky, stock-specific natal contacts dominate`;

  const likelyBehaviour =
    focus
      ? behaviourForTone(focusTone, focus)
      : "No dominant macro cluster is active; individual natal charts matter more than broad macro force.";

  const mercuryLine = mercuryPosition?.retrograde
    ? `Mercury is retrograde in ${mercuryPosition.sign}: narrative review, revisions, and false signals need extra patience.`
    : `Mercury is direct in ${mercuryPosition?.sign || "-"}: narrative flow is cleaner unless a station/retrograde window is approaching.`;

  return {
    headline,
    expectedPosition: environment,
    likelyBehaviour,
    recommendedPosture: actionForEnvironment(environment, pressure, expansion, volatility),
    currentFocus: focus?.label || "Stable Window",
    currentTone: focusTone,
    timing: focus ? formatDays(focus.daysRemaining ?? focus.daysTill ?? 0) : "active now",
    context: [
      `Jupiter in ${jupiterSign}: expansion is filtered through ${jupiterSign}.`,
      `Saturn in ${saturnSign}: pressure/restructuring is filtered through ${saturnSign}.`,
      mercuryLine
    ],
    nextShift: formatNarrativeShift(nextShift)
  };
}

function buildIngressCandidates(today) {
  return [
    nextSignIngress("jupiter", today, 730),
    nextSignIngress("saturn", today, 1095),
    nextSignIngress("rahu", today, 730)
  ].filter(Boolean);
}

function buildRetrogradeCandidates(today) {
  return [
    ...nextRetrogradeTransitions("mercury", today, 365),
    ...nextRetrogradeTransitions("venus", today, 730),
    ...nextRetrogradeTransitions("mars", today, 730),
    ...nextRetrogradeTransitions("jupiter", today, 730),
    ...nextRetrogradeTransitions("saturn", today, 730)
  ];
}

function buildUpcomingEclipseCandidates(today) {
  return getRelevantEclipses(today, {
    daysBefore: 0,
    daysAfter: 365
  }).map(eclipse => ({
    label: `${eclipse.type === "solar" ? "Solar" : "Lunar"} eclipse in ${eclipse.sign}`,
    name: `${eclipse.type} eclipse`,
    date: eclipse.date,
    exactUtc: eclipse.exactUtc,
    exactIst: eclipse.exactIst,
    daysRemaining: Math.max(0, eclipse.daysFromReference),
    daysTill: Math.max(0, eclipse.daysFromReference),
    timing: eclipse.daysFromReference <= 30 ? "NEAR" : "UPCOMING",
    resultingEnvironment: eclipse.type === "solar" ? "RESET / VISIBILITY" : "CULMINATION / VOLATILITY",
    notes: `${eclipse.label || `${eclipse.type === "solar" ? "Solar" : "Lunar"} Eclipse in ${eclipse.sign}`} at ${Number(eclipse.siderealLongitude ?? eclipse.degree).toFixed(2)}° ${eclipse.sign}.`,
    source: eclipse.source,
    eventPrecision: eclipse.eventPrecision,
    precisionNote: eclipse.precisionNote
  }));
}



function shortMeaningForEvent(item) {
  const label = String(item?.label || item?.name || "Macro event");
  const text = `${item?.type || ""} ${item?.resultingEnvironment || ""} ${label}`.toLowerCase();

  if (label.toLowerCase().includes("jupiter-venus")) {
    return "Opportunity: rerating, liquidity, preference for quality, and valuation expansion where natal Venus/Jupiter is receptive.";
  }

  if (label.toLowerCase().includes("saturn-venus") && (label.toLowerCase().includes("trine") || label.toLowerCase().includes("sextile"))) {
    return "Opportunity: disciplined expansion, valuation repair, and selective support where natal Venus/Saturn contacts are receptive.";
  }

  if (text.includes("mercury") && text.includes("retrograde")) {
    return "Risk: review, mixed messages, delayed confirmation, and narrative reversals.";
  }

  if (text.includes("saturn") && (text.includes("square") || text.includes("pressure") || text.includes("retrograde"))) {
    return "Risk: compression, caution, delays, and stress-testing of weak structures.";
  }

  if (text.includes("eclipse")) {
    return "Catalyst: reset/inflection window; stock natal contacts decide breakout vs reversal.";
  }

  if (text.includes("rahu")) {
    return "Amplifier: narrative heat and volatility; response depends strongly on natal planet touched.";
  }

  if (text.includes("jupiter") || text.includes("expansion")) {
    return "Opportunity: expansion and leadership search where natal support is present.";
  }

  if (text.includes("venus")) {
    return "Opportunity: valuation, desirability, and capital preference themes.";
  }

  return "Monitor: macro event is active/near; stock-specific natal contacts decide the behaviour.";
}

function eventTimeLabel(item) {
  const days = Number(item?.daysRemaining ?? item?.daysTill ?? 0);

  if (!Number.isFinite(days)) {
    return item?.date || "timing pending";
  }

  if (Math.abs(days) < 0.25) {
    return "active now";
  }

  if (days < 0) {
    return `${Math.abs(days).toFixed(1)} days ago`;
  }

  return `in ${days.toFixed(1)} days`;
}

function rankOpportunity(item) {
  const tone = toneForEvent(item || {});
  const label = String(item?.label || "").toLowerCase();
  let score = 0;

  if (tone === "expansion") score += 40;
  if (label.includes("jupiter")) score += 18;
  if (label.includes("venus")) score += 12;
  if (label.includes("trine") || label.includes("sextile") || label.includes("conjunction")) score += 8;

  const days = Number(item?.daysRemaining ?? item?.daysTill ?? 999);
  if (days <= 7) score += 12;
  else if (days <= 30) score += 8;
  else if (days <= 60) score += 3;

  return score;
}

function rankRisk(item) {
  const tone = toneForEvent(item || {});
  const label = String(item?.label || "").toLowerCase();
  let score = 0;

  if (["pressure", "volatility", "reset"].includes(tone)) score += 35;
  if (label.includes("saturn")) score += 14;
  if (label.includes("rahu")) score += 10;
  if (label.includes("retrograde")) score += 10;
  if (label.includes("eclipse")) score += 12;
  if (label.includes("square") || label.includes("opposition")) score += 10;

  const days = Number(item?.daysRemaining ?? item?.daysTill ?? 999);
  if (days <= 7) score += 12;
  else if (days <= 30) score += 8;
  else if (days <= 60) score += 3;

  return score;
}

function formatReadableEvent(item) {
  if (!item) {
    return null;
  }

  return {
    label: item.label || item.name || "Macro event",
    date: item.date || null,
    exactIst: item.exactIst || null,
    timing: eventTimeLabel(item),
    tone: toneForEvent(item),
    meaning: shortMeaningForEvent(item),
    notes: item.notes || null,
    resultingEnvironment: item.resultingEnvironment || null,
    daysRemaining: Number(item.daysRemaining ?? item.daysTill ?? 0),
    source: item.source || null,
    eventPrecision: item.eventPrecision || null,
    precisionNote: item.precisionNote || null
  };
}

function buildMacroReadable(environment, pressure, expansion, volatility, sortedActiveEvents, phases, transits, shadowWindows, eventClusters, environmentSignature) {
  const next30 = phases
    .filter(item => Number(item.daysRemaining ?? item.daysTill ?? 999) <= 30)
    .slice(0, 8)
    .map(formatReadableEvent)
    .filter(Boolean);

  const active = sortedActiveEvents
    .slice(0, 5)
    .map(formatReadableEvent)
    .filter(Boolean);

  const opportunityPool = [...sortedActiveEvents, ...phases]
    .filter(item => rankOpportunity(item) > 0)
    .sort((a, b) => rankOpportunity(b) - rankOpportunity(a));

  const riskPool = [...sortedActiveEvents, ...phases]
    .filter(item => rankRisk(item) > 0)
    .sort((a, b) => rankRisk(b) - rankRisk(a));

  const mainOpportunity = formatReadableEvent(opportunityPool[0]) || {
    label: "No dominant expansion catalyst",
    timing: "today",
    tone: "monitoring",
    meaning: "Expansion is not the main macro force; use stock-specific natal activations for opportunity selection."
  };

  const mainRisk = formatReadableEvent(riskPool[0]) || {
    label: "No dominant macro pressure",
    timing: "today",
    tone: "monitoring",
    meaning: "No major broad pressure cluster is dominant; stock-specific natal pressure still matters."
  };

  const shadowSummary = shadowWindows?.activeLabels?.length
    ? `Shadow/near-window active: ${shadowWindows.activeLabels.slice(0, 4).join(" · ")}.`
    : "No major shadow window is active today.";

  const clusterSummary = eventClusters?.length
    ? `${eventClusters[0].labels.slice(0, 4).join(" + ")} clustered within ±${eventClusters[0].windowDays || 7} days.`
    : "No tight multi-event cluster is dominating the sky.";

  const dominantMessage =
    environment === "EXPANSION"
      ? "Macro tone favours selective accumulation in stocks with supportive natal contacts."
      : environment === "EXTREME PRESSURE" || environment === "HIGH PRESSURE" || environment === "PRESSURE"
        ? "Macro tone favours protection first; pressure can create future entry windows after repair."
        : environment === "VOLATILE TRANSITION"
          ? "Macro tone favours patience; leadership rotation and false starts are more likely."
          : "Macro tone is balanced; stock-specific natal catalysts matter more than broad market force.";

  const stockImplication = `${dominantMessage} Main opportunity: ${mainOpportunity.label}. Main risk: ${mainRisk.label}.`;

  return {
    headline: `${environment}: ${dominantMessage}`,
    todaySky: {
      environment,
      pressure,
      expansion,
      volatility,
      moon: moonClimate(transits.moon),
      jupiter: `${transits.positions?.jupiter?.sign || "-"} ${Number(transits.positions?.jupiter?.degree || 0).toFixed(2)}°`,
      saturn: `${transits.positions?.saturn?.sign || "-"} ${Number(transits.positions?.saturn?.degree || 0).toFixed(2)}°`,
      mercury: `${transits.positions?.mercury?.sign || "-"} ${Number(transits.positions?.mercury?.degree || 0).toFixed(2)}°${transits.positions?.mercury?.retrograde ? " Rx" : ""}`
    },
    mainOpportunity,
    mainRisk,
    next30Days: next30,
    activeNow: active,
    shadowClusterNotes: [
      shadowSummary,
      clusterSummary,
      `Signature: ${environmentSignature}.`
    ],
    stockImplication,
    researchNotes: {
      activeEventCount: sortedActiveEvents.length,
      phaseCount: phases.length,
      opportunityRank: rankOpportunity(opportunityPool[0] || {}),
      riskRank: rankRisk(riskPool[0] || {})
    }
  };
}

export function getRealEphemeris(date) {
  const today = todayIso(date);
  const transits = generateRealTransits(today);
  const activeEvents = buildAspectEvents(transits, today);

  activeEvents.push(...currentRetrogradeEvents(transits, today));

  const nearbyEclipses = getRelevantEclipses(today, {
    daysBefore: 30,
    daysAfter: 45
  });

  for (const eclipse of nearbyEclipses) {
    const absDays = Math.abs(eclipse.daysFromReference);
    const isActive = absDays <= 30;

    activeEvents.push(
      event(
        `${eclipse.type === "solar" ? "Solar" : "Lunar"} eclipse in ${eclipse.sign}`,
        eclipse.type === "solar" ? "reset" : "volatility",
        Math.max(5, Math.round(30 - absDays)),
        `${eclipse.label || `${eclipse.type === "solar" ? "Solar" : "Lunar"} Eclipse in ${eclipse.sign}`} at ${Number(eclipse.siderealLongitude ?? eclipse.degree).toFixed(2)}° ${eclipse.sign}; shadow window ${isActive ? "active" : "approaching"}.`,
        eclipse.date,
        phaseLabel(eclipse.daysFromReference),
        Math.max(0, Math.abs(eclipse.daysFromReference)),
        {
          exactUtc: eclipse.exactUtc,
          exactIst: eclipse.exactIst,
          source: eclipse.source,
          siderealLongitude: eclipse.siderealLongitude
        }
      )
    );
  }

  const upcomingEclipses = buildUpcomingEclipseCandidates(today);

  const ingressCandidates = buildIngressCandidates(today);
  const retrogradeCandidates = buildRetrogradeCandidates(today);
  const aspectCandidates = buildUpcomingAspectCandidates(today);

  const activeRoots = new Set(activeEvents.map(eventRootKey));
  const phases = hardenEclipseEvents(dedupeEvents([
    ...upcomingEclipses.slice(0, 6).map(eclipse => normalizeStaticEvent({
      ...eclipse,
      label: eclipse.label || `${eclipse.eclipseKind === "solar" || eclipse.type === "solar" ? "Solar" : "Lunar"} Eclipse in ${eclipse.sign}`,
      name: eclipse.label || eclipse.eclipseType || `${eclipse.eclipseKind || eclipse.type || ""} eclipse`,
      daysRemaining: eclipse.daysRemaining ?? Math.max(0, eclipse.daysFromReference ?? eclipse.daysTill ?? 0),
      daysTill: eclipse.daysTill ?? eclipse.daysRemaining ?? Math.max(0, eclipse.daysFromReference ?? 0),
      timing: (eclipse.daysRemaining ?? eclipse.daysTill ?? eclipse.daysFromReference ?? 999) <= 30 ? "NEAR" : "UPCOMING",
      resultingEnvironment: eclipse.resultingEnvironment || ((eclipse.eclipseKind || eclipse.type) === "solar" ? "RESET / VISIBILITY" : "CULMINATION / VOLATILITY"),
      notes: eclipse.notes || `${eclipse.label || `${eclipse.eclipseKind === "solar" || eclipse.type === "solar" ? "Solar" : "Lunar"} Eclipse in ${eclipse.sign}`} at ${Number(eclipse.siderealLongitude ?? eclipse.degree).toFixed(2)}° ${eclipse.sign}.`
    })),
    ...ingressCandidates.map(ingress => normalizeStaticEvent({
      ...ingress,
      label: ingress.label || `${ingress.planet.toUpperCase()} ingress ${ingress.from} → ${ingress.to}`,
      name: ingress.name || `${ingress.planet} ingress`,
      daysRemaining: ingress.daysRemaining ?? ingress.daysTill,
      daysTill: ingress.daysTill ?? ingress.daysRemaining,
      timing: "UPCOMING",
      resultingEnvironment: ingress.resultingEnvironment || "SIGN SHIFT",
      notes: ingress.notes || `${ingress.planet} changes sidereal sign from ${ingress.from} to ${ingress.to} at ${ingress.exactUtc}.`
    })),
    ...aspectCandidates.slice(0, 12).map(aspect => normalizeStaticEvent({
      ...aspect,
      timing: aspect.daysRemaining <= 7 ? "NEAR" : "UPCOMING"
    })),
    ...retrogradeCandidates.map(retro => normalizeStaticEvent({
      ...retro,
      label: retro.label || `${retro.planet.toUpperCase()} ${retro.station}`,
      name: retro.name || `${retro.planet} ${retro.station}`,
      daysRemaining: retro.daysRemaining ?? retro.daysTill,
      daysTill: retro.daysTill ?? retro.daysRemaining,
      timing: (retro.daysTill ?? retro.daysRemaining ?? 999) <= 21 ? "NEAR" : "UPCOMING",
      resultingEnvironment: retro.resultingEnvironment || (retro.planet === "mercury" ? "REVIEW / VOLATILITY" : "RETROGRADE SHIFT"),
      notes: retro.notes || `${retro.planet} ${retro.station} in ${retro.sign} at ${Number(retro.degree).toFixed(2)}° sidereal Lahiri.`
    }))
  ].filter(Boolean), { activeRoots, dropActiveDuplicates: true })
    .sort((a, b) => Number(a.daysRemaining ?? a.daysTill ?? 999) - Number(b.daysRemaining ?? b.daysTill ?? 999)));

  const pressure = activeEvents
    .filter(item => ["pressure", "volatility"].includes(item.type))
    .reduce((sum, item) => sum + item.strength, 0);

  const transition = weightedTransitionScore(activeEvents);

  const expansion = activeEvents
    .filter(item => ["expansion", "reset"].includes(item.type))
    .reduce((sum, item) => sum + item.strength, 0);

  const volatility = activeEvents
    .filter(item => ["volatility", "reset", "pressure"].includes(item.type))
    .reduce((sum, item) => sum + Math.ceil(item.strength / 2), 0) + transition;

  let environment = "BALANCED";

  if (pressure >= MACRO_PRESSURE_THRESHOLDS.extreme && expansion <= 28) {
    environment = "EXTREME PRESSURE";
  } else if (pressure >= MACRO_PRESSURE_THRESHOLDS.high) {
    environment = "HIGH PRESSURE";
  } else if (pressure >= MACRO_PRESSURE_THRESHOLDS.pressure) {
    environment = "PRESSURE";
  } else if (expansion >= 20 && volatility < 30) {
    environment = "EXPANSION";
  } else if (volatility >= 30 || transition >= 8) {
    environment = "VOLATILE TRANSITION";
  }

  const normalizedPressure = Number(Math.min(100, pressure).toFixed(1));
  const normalizedExpansion = Number(Math.min(100, expansion).toFixed(1));
  const normalizedVolatility = Number(Math.min(100, volatility).toFixed(1));
  const normalizedTransition = Number(Math.min(100, transition).toFixed(1));
  const sortedActiveEvents = dedupeEvents(activeEvents).sort((a, b) => b.strength - a.strength);
  const macroNarrative = buildMacroNarrative(
    environment,
    normalizedPressure,
    normalizedExpansion,
    normalizedVolatility,
    sortedActiveEvents,
    phases,
    transits
  );
  const eventClusters = buildEventClusters([...sortedActiveEvents, ...phases], 7);
  const shadowWindows = buildShadowWindows(today, sortedActiveEvents, phases);
  const nearEvents = dedupeEvents(phases.filter(item => Number(item.daysRemaining ?? 999) <= 14));
  const macroEventSet = dedupeEvents([...sortedActiveEvents, ...nearEvents]);
  const macroOverlapIntensity = planetOverlapFromEvents(macroEventSet);
  const weightedMacroOverlapIntensity = weightedOverlapIntensity(macroOverlapIntensity);
  const macroClusterDensity = macroEventSet.length;
  const weightedMacroClusterScore = weightedClusterScore(eventClusters);
  const environmentSignature = buildMacroSignature(sortedActiveEvents, phases, eventClusters);
  const macroCards = buildMacroEventCards(sortedActiveEvents, phases);
  const macroReadable = buildMacroReadable(
    environment,
    normalizedPressure,
    normalizedExpansion,
    normalizedVolatility,
    sortedActiveEvents,
    phases,
    transits,
    shadowWindows,
    eventClusters,
    environmentSignature
  );

  const preferredNextShiftEvent = selectNextMacroCatalyst(phases, new Set(sortedActiveEvents.map(eventRootKey)));
  const preferredNextShift = formatNarrativeShift(preferredNextShiftEvent) || macroNarrative.nextShift || null;
  const finalMacroNarrative = {
    ...macroNarrative,
    nextShift: preferredNextShift
  };

  return {
    today,
    metadata: ephemerisMetadata(),
    transits,
    moonClimate: moonClimate(transits.moon),
    moonSign: getSign(transits.moon),
    pressure: normalizedPressure,
    expansion: normalizedExpansion,
    volatility: normalizedVolatility,
    transition: normalizedTransition,
    environment,
    behaviourOutline: [
      finalMacroNarrative.likelyBehaviour,
      ...finalMacroNarrative.context,
      shadowWindows.activeLabels.length ? `Shadow windows active/near: ${shadowWindows.activeLabels.join(", ")}.` : "No major macro shadow window is active today.",
      macroClusterDensity ? `Macro cluster density: ${macroClusterDensity}; signature: ${environmentSignature}.` : `Macro cluster density: 0; signature: ${environmentSignature}.`
    ],
    macroAnalytics: {
      shadowWindows,
      overlapIntensity: macroOverlapIntensity,
      weightedOverlapIntensity: weightedMacroOverlapIntensity,
      clusterDensity: macroClusterDensity,
      weightedClusterScore: weightedMacroClusterScore,
      sourceWeights: SOURCE_WEIGHTS,
      pressureThresholds: MACRO_PRESSURE_THRESHOLDS,
      transitionScore: normalizedTransition,
      eventClusters,
      environmentSignature,
      upcomingAspectCandidates: aspectCandidates.slice(0, 10)
    },
    macroNarrative: finalMacroNarrative,
    macroCards,
    macroReadable,
    activeEvents: sortedActiveEvents,
    phases
  };
}

export default getRealEphemeris;
