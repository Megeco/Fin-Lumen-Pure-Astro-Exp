const SLOW = new Set(["Jupiter", "Saturn", "Rahu", "Ketu", "Mars", "Eclipse"]);
const HARD = new Set(["square", "opposition"]);
const SOFT = new Set(["trine", "sextile"]);

function textOf(c = {}) {
  return c.text || `${c.planet || "Transit"} ${c.aspect || "contact"} natal ${c.targetPlanet || "point"}`;
}
function scoreOf(c = {}) { return Number(c.score) || 0; }
function absScore(c = {}) { return Math.abs(scoreOf(c)); }
function norm(v) { return String(v || "").toLowerCase(); }
function dateOf(x = {}) { return x.date || x.dateOnly || x.transits?.date || null; }
function contactsOf(x = {}) { return (x.transitDetails || x.topContacts || []).filter(c => SLOW.has(c?.planet)); }
function familyOf(c = {}) { return `${c.planet}->${c.targetPlanet}:${c.aspect}`; }
function uniqueContacts(list = []) {
  const seen = new Set();
  return list.filter(c => {
    const k = familyOf(c);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function phaseLabel(x = {}) {
  return x.grammarSignal || x.finAstroGrammar?.signal || x.signal || x.environmentConflict || x.regime || "Mixed episode";
}

// Role is intentionally interpretive rather than score-sign-only.
// Rahu/Ketu and hard Jupiter contacts are frequently amplifiers/conflicts, not clean support.
function roleOf(c = {}) {
  const p = norm(c.planet);
  const t = norm(c.targetPlanet);
  const a = norm(c.aspect);
  const s = scoreOf(c);

  if (p === "eclipse") {
    if (HARD.has(a)) return "pressure";
    if (a === "conjunction" && ["rahu", "ketu", "mars", "saturn", "moon"].includes(t)) return "amplifier";
    return s > 0.25 ? "support" : s < -0.25 ? "pressure" : "amplifier";
  }
  if (p === "saturn") {
    if (HARD.has(a) || s < -0.25) return "pressure";
    if (SOFT.has(a) && s > 0.25) return "support";
    return "mixed";
  }
  if (p === "rahu" || p === "ketu") {
    if (HARD.has(a) || a === "conjunction" || a === "opposition") return "amplifier";
    return s < -0.25 ? "pressure" : "amplifier";
  }
  if (p === "jupiter") {
    if (HARD.has(a)) return "mixed";
    if ((SOFT.has(a) || a === "conjunction") && s > 0.25) return "support";
    return s < -0.25 ? "pressure" : "mixed";
  }
  if (p === "mars") {
    if (HARD.has(a) || s < -0.25) return "pressure";
    if (SOFT.has(a) && s > 0.25) return "support";
    return "amplifier";
  }
  if (s > 0.25) return "support";
  if (s < -0.25) return "pressure";
  return "mixed";
}

function ranked(contacts = [], role) {
  return contacts.filter(c => roleOf(c) === role).sort((a,b) => absScore(b) - absScore(a));
}
function driver(c = {}) {
  return {
    text: textOf(c),
    score: Number.isFinite(Number(c.score)) ? Number(c.score) : null,
    orb: Number.isFinite(Number(c.orb)) ? Number(c.orb) : null,
    family: familyOf(c),
    role: roleOf(c)
  };
}
function interactionSummary(groups = {}, pressureScore, expansionScore) {
  const lead = Number(expansionScore) - Number(pressureScore);
  const hasSupport = groups.support?.length;
  const hasPressure = groups.pressure?.length;
  const hasAmp = groups.amplifier?.length;
  const hasMixed = groups.mixed?.length;
  let direction = "Balanced contact field.";
  if (Number.isFinite(lead)) {
    if (lead >= 12) direction = `Expansion leads pressure by ${Math.round(lead)} points.`;
    else if (lead <= -12) direction = `Pressure leads expansion by ${Math.round(Math.abs(lead))} points.`;
    else direction = `Expansion and pressure are within ${Math.round(Math.abs(lead))} points.`;
  }
  const texture = hasSupport && hasPressure
    ? "Support and hard pressure overlap."
    : hasSupport ? "Support is present without mapped hard pressure."
    : hasPressure ? "Hard pressure is present without mapped direct support."
    : "No decisive direct support/pressure network is mapped.";
  const modifiers = [hasAmp ? "amplifiers are active" : null, hasMixed ? "mixed/conflict contacts remain" : null].filter(Boolean).join("; ");
  return `${direction} ${texture}${modifiers ? ` ${modifiers}.` : ""}`;
}
function macroDrivers(snapshot = {}) {
  const events = Array.isArray(snapshot.activeNow) ? snapshot.activeNow : [];
  const pressure = events.filter(e => ["pressure", "reset"].includes(norm(e.tone))).slice(0,4).map(e => e.label);
  const expansion = events.filter(e => norm(e.tone) === "expansion").slice(0,4).map(e => e.label);
  const amplifiers = events.filter(e => ["volatility", "transition"].includes(norm(e.tone))).slice(0,4).map(e => e.label);
  return { pressure, expansion, amplifiers };
}
function checkpoint(data = {}, role, replay, macroSnapshot) {
  const cs = uniqueContacts(contactsOf(data));
  const groups = {
    support: ranked(cs, "support"),
    pressure: ranked(cs, "pressure"),
    amplifier: ranked(cs, "amplifier"),
    mixed: ranked(cs, "mixed")
  };
  const stockPressure = data?.pressureScore ?? (role === "Present foundation" ? replay?.pressureScore : null);
  const stockExpansion = data?.expansionScore ?? (role === "Present foundation" ? replay?.expansionScore : null);
  return {
    contacts: cs,
    groups,
    stockPressure,
    stockExpansion,
    supportWeight: groups.support.reduce((n,c) => n + absScore(c), 0),
    pressureWeight: groups.pressure.reduce((n,c) => n + absScore(c), 0),
    amplifierWeight: groups.amplifier.reduce((n,c) => n + absScore(c), 0),
    mixedWeight: groups.mixed.reduce((n,c) => n + absScore(c), 0),
    interaction: interactionSummary(groups, stockPressure, stockExpansion),
    macro: role === "Present foundation" ? {
      environment: macroSnapshot?.environment || null,
      pressure: macroSnapshot?.pressure ?? null,
      expansion: macroSnapshot?.expansion ?? null,
      drivers: macroDrivers(macroSnapshot)
    } : null
  };
}

export function buildEpisodeInteractionDisplay({ replayDate, replay, windows, macroSnapshot, historicalRegistry = [], ticker }) {
  const present = checkpoint(replay, "Present foundation", replay, macroSnapshot);
  const map = windows?.windowMap || {};
  const candidates = [
    { role: "Present foundation", data: replay, date: replayDate },
    { role: "Tactical opportunity", data: map.tacticalOpportunity || windows?.tactical },
    { role: "Tactical risk", data: map.tacticalRisk },
    { role: "Strategic pressure", data: map.strategicRisk },
    { role: "Strategic opportunity", data: map.strategicOpportunity || windows?.strategic || windows?.bestWindow },
    { role: "Strategic accumulation", data: map.strategicAccumulation },
    { role: "Long-range context", data: map.longRangeCycle || windows?.longRangeCycle }
  ].filter(x => x.data && (x.date || dateOf(x.data)));

  const seenDates = new Set();
  const timeline = candidates.map(x => {
    const d = x.date || dateOf(x.data);
    const cp = checkpoint(x.data, x.role, replay, macroSnapshot);
    return {
      date: d,
      role: x.role,
      state: phaseLabel(x.data),
      stockState: {
        pressure: cp.stockPressure,
        expansion: cp.stockExpansion,
        environment: x.data?.environmentType || x.data?.regime || null,
        pressureDrivers: cp.groups.pressure.slice(0,5).map(driver),
        expansionDrivers: cp.groups.support.slice(0,5).map(driver),
        amplifierDrivers: cp.groups.amplifier.slice(0,5).map(driver),
        mixedDrivers: cp.groups.mixed.slice(0,5).map(driver)
      },
      macro: cp.macro,
      interaction: cp.interaction,
      weights: {
        support: Number(cp.supportWeight.toFixed(2)),
        pressure: Number(cp.pressureWeight.toFixed(2)),
        amplifier: Number(cp.amplifierWeight.toFixed(2)),
        mixed: Number(cp.mixedWeight.toFixed(2))
      }
    };
  }).filter(x => x.date && !seenDates.has(x.date) && seenDates.add(x.date)).sort((a,b) => String(a.date).localeCompare(String(b.date)));

  const presentFamilies = new Set(present.contacts.map(familyOf));
  const currentClusters = replay?.activeClusters || [];
  const currentRole = replay?.finAstroGrammar?.pressure?.pressureRole || replay?.grammarPressureRole || null;
  const currentMacroP = Number(macroSnapshot?.pressure);
  const currentMacroE = Number(macroSnapshot?.expansion);

  const prior = historicalRegistry
    .filter(e => String(e?.ticker || "").toLowerCase() === String(ticker || "").toLowerCase())
    .filter(e => String(e?.eventDate || "") < String(replayDate || ""))
    .map(e => {
      let score = 0;
      const similarities = [];
      const differences = [];
      if (presentFamilies.has(e.transitFamily)) { score += 42; similarities.push("same company and exact contact family"); }
      else differences.push("no exact current contact-family match");

      const eventClusters = e.clusters || e.macroContext?.clusters || [];
      const overlap = eventClusters.filter(c => currentClusters.includes(c));
      if (overlap.length) { score += Math.min(18, overlap.length * 6); similarities.push(`shared clusters: ${overlap.join(", ")}`); }
      else if (currentClusters.length) differences.push("no shared recorded cluster");

      if (e.priorAstroState && currentRole && e.priorAstroState === currentRole) {
        score += 10; similarities.push("same episode-state label");
      } else if (e.priorAstroState && currentRole) differences.push(`episode state differs (${e.priorAstroState} vs ${currentRole})`);

      if (e.macroPressure != null && Number.isFinite(currentMacroP)) {
        const pd = Math.abs(Number(e.macroPressure) - currentMacroP);
        const ed = e.macroExpansion != null && Number.isFinite(currentMacroE) ? Math.abs(Number(e.macroExpansion) - currentMacroE) : null;
        if (pd <= 10 && (ed == null || ed <= 10)) { score += 12; similarities.push("similar macro pressure/expansion range"); }
        else differences.push("macro pressure/expansion context differs or is incomplete");
      } else differences.push("prior macro context unavailable");

      const companion = e.companionTransitFamilies || e.macroContext?.companionTransitFamilies || [];
      const companionOverlap = companion.filter(f => presentFamilies.has(f));
      if (companionOverlap.length) { score += Math.min(18, companionOverlap.length * 6); similarities.push(`shared companion contacts: ${companionOverlap.join(", ")}`); }
      else differences.push("no recorded companion-contact reinforcement match");

      return { ...e, analogueScore: Math.min(100, score), similarityReasons: similarities, differenceReasons: differences };
    })
    .filter(e => e.analogueScore > 0)
    .sort((a,b) => b.analogueScore - a.analogueScore)
    .slice(0,5);

  const future = timeline.slice(1);
  const supportWeight = future.reduce((n,p) => n + (p.weights?.support || 0), 0);
  const pressureWeight = future.reduce((n,p) => n + (p.weights?.pressure || 0), 0);
  const supportCheckpoints = future.filter(p => (p.weights?.support || 0) > 0).length;
  const pressureCheckpoints = future.filter(p => (p.weights?.pressure || 0) > 0).length;
  let continuity;
  if (supportWeight > pressureWeight * 1.2 && supportCheckpoints >= pressureCheckpoints) {
    continuity = "Support remains recurrent across the sampled forecast and carries greater weighted direct-contact strength than hard pressure.";
  } else if (pressureWeight > supportWeight * 1.2 && pressureCheckpoints >= supportCheckpoints) {
    continuity = "Hard pressure remains recurrent across the sampled forecast and carries greater weighted direct-contact strength than support.";
  } else {
    continuity = "Support and hard pressure remain contested across the sampled forecast; amplifiers and mixed contacts determine expression.";
  }

  return {
    mode: "DISPLAY_ONLY",
    productionImpact: "none",
    methodology: "Relational episode display across present macro context, current natal contacts, and sampled forward windows.",
    presentStructure: {
      macroEnvironment: macroSnapshot?.environment || null,
      macroPressure: macroSnapshot?.pressure ?? null,
      macroExpansion: macroSnapshot?.expansion ?? null,
      macroDrivers: macroDrivers(macroSnapshot),
      stockPressure: replay?.pressureScore ?? null,
      stockExpansion: replay?.expansionScore ?? null,
      expansionDrivers: present.groups.support.slice(0,5).map(driver),
      pressureDrivers: present.groups.pressure.slice(0,5).map(driver),
      amplifierDrivers: present.groups.amplifier.slice(0,5).map(driver),
      mixedDrivers: present.groups.mixed.slice(0,5).map(driver),
      episodeStart: replay?.episodeContext?.episodeStart || null,
      active: Boolean(replay?.episodeContext?.active),
      summary: present.interaction
    },
    forecastContinuity: {
      summary: continuity,
      weightedSupport: Number(supportWeight.toFixed(2)),
      weightedPressure: Number(pressureWeight.toFixed(2)),
      supportCheckpoints,
      pressureCheckpoints,
      caution: "This is a sampled interaction map. Exact orb-entry, exact-pass, orb-exit and uninterrupted support-gap logic remain a later ephemeris-continuum upgrade."
    },
    timeline,
    historicalEpisodeAnalogues: prior,
    archiveRecordCount: historicalRegistry.length
  };
}
