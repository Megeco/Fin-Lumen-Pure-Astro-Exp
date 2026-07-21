const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const low = v => String(v || "").toLowerCase();
const dateOf = item => item?.date || item?.dateOnly || item?.windowDate || null;
const signalOf = item => item?.finAstroGrammar?.signal || item?.grammarSignal || item?.environmentConflict || item?.signal || "UNRESOLVED";
const actionOf = item => item?.finAstroGrammar?.actionBias || item?.grammarActionBias || "watch";
const contactsOf = item => Array.isArray(item?.transitDetails) ? item.transitDetails : [];
const scoreAbs = c => Math.abs(n(c?.score));
const dayMs = 86400000;

function dayDiff(a, b) {
  const x = new Date(`${a}T00:00:00Z`).getTime();
  const y = new Date(`${b}T00:00:00Z`).getTime();
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / dayMs) : null;
}

function classifyContact(c) {
  const planet = low(c?.planet);
  const aspect = low(c?.aspect);
  const score = n(c?.score);
  if (planet === "rahu" || planet === "ketu") return "amplifier";
  if (planet === "eclipse" && ["conjunction", "trine", "sextile"].includes(aspect) && score > 0) return "support";
  if (["square", "opposition"].includes(aspect) && score < 0) return "pressure";
  if (score > 0) return "support";
  if (score < 0) return "pressure";
  return "mixed";
}

function contactStats(item) {
  const contacts = contactsOf(item);
  const groups = { support: [], pressure: [], amplifier: [], mixed: [] };
  contacts.forEach(c => groups[classifyContact(c)].push(c));
  Object.values(groups).forEach(list => list.sort((a,b) => scoreAbs(b) - scoreAbs(a)));
  return {
    groups,
    supportWeight: groups.support.reduce((s,c) => s + scoreAbs(c), 0),
    pressureWeight: groups.pressure.reduce((s,c) => s + scoreAbs(c), 0),
    amplifierWeight: groups.amplifier.reduce((s,c) => s + scoreAbs(c), 0),
    exactSupport: groups.support.filter(c => n(c.orb, 99) <= 1.5).length,
    exactPressure: groups.pressure.filter(c => n(c.orb, 99) <= 1.5).length,
    strongDirectSupports: groups.support.filter(c => scoreAbs(c) >= 4 && n(c.orb, 99) <= 2.5).length,
    distinctTargets: new Set(groups.support.map(c => low(c.targetPlanet))).size
  };
}

function classifyDirection(item) {
  const e = n(item?.expansionScore, 50);
  const p = n(item?.pressureScore, 50);
  const lead = n(item?.leadershipProbability, 50);
  const stats = contactStats(item);
  if (e >= 65 && e >= p + 7 && stats.supportWeight >= stats.pressureWeight * 1.15) return "UP";
  if (item?.episodeContext?.active && e >= 58 && stats.supportWeight > 0) return p >= e + 7 ? "UP / CONTESTED" : "UP-BIASED";
  if (p >= 68 && p >= e + 10 && stats.pressureWeight > stats.supportWeight * 1.2) return "DOWN / PRESSURE-LED";
  if (Math.abs(e - p) <= 8 || (lead < 60 && e < 62)) return "SIDEWAYS / UNRESOLVED";
  return e > p ? "UP-BIASED" : "DOWN-BIASED";
}

function classifyPressure(item) {
  const p = n(item?.pressureScore, 50);
  const stats = contactStats(item);
  if (p >= 75 && stats.pressureWeight >= stats.supportWeight * 1.25 && stats.exactPressure >= 1) return "HIGH / BREAK CANDIDATE";
  if (p >= 66 || stats.pressureWeight >= 10) return "HIGH / RESET RISK";
  if (p >= 56 || stats.pressureWeight >= 5) return "MEDIUM / DIGESTION";
  return "LOW";
}

function localFuture(item, allFuture, days = 120) {
  const base = dateOf(item);
  if (!base) return [];
  return allFuture.filter(x => {
    const d = dayDiff(base, dateOf(x));
    return d !== null && d > 0 && d <= days;
  });
}

function breakEvidence(item, allFuture = [], horizonDays = 120) {
  const stats = contactStats(item);
  const future = localFuture(item, allFuture, horizonDays);
  const supportAfter = future.some(x => n(x?.expansionScore, 0) >= 65 && contactStats(x).supportWeight >= 5);
  const pressurePersistence = future.filter(x => n(x?.pressureScore, 0) >= 68 && contactStats(x).pressureWeight >= 8).length >= 2;
  const evidence = [];
  if (stats.exactPressure >= 1) evidence.push("exact hard pressure");
  if (stats.pressureWeight > stats.supportWeight * 1.35) evidence.push("hard pressure dominates direct support");
  if (pressurePersistence) evidence.push("hard pressure persists locally");
  if (future.length && !supportAfter && (stats.exactPressure >= 1 || stats.pressureWeight >= 5 || n(item?.pressureScore, 50) >= 66)) evidence.push("no strong local reinforcement after pressure");
  const persistentConfirmation = pressurePersistence || (!supportAfter && future.length >= 2);
  return {
    complete: evidence.length >= 3 && persistentConfirmation,
    evidence,
    horizonDays,
    label: evidence.length >= 3 ? "BREAK EVIDENCE PRESENT" : evidence.length ? "BREAK EVIDENCE INCOMPLETE" : "NO BREAK EVIDENCE"
  };
}

function acceleration(item) {
  const stats = contactStats(item);
  const e = n(item?.expansionScore, 50);
  const lead = n(item?.leadershipProbability, 50);
  const density = n(item?.clusterDensity, 0);
  let score = 0;
  score += Math.max(0, e - 55) * 1.2;
  score += Math.max(0, lead - 55) * 0.7;
  score += Math.min(20, stats.supportWeight);
  score += Math.min(12, stats.amplifierWeight);
  score += stats.exactSupport * 5;
  score += Math.min(12, stats.distinctTargets * 3);
  score += Math.min(12, density * 1.5);
  score -= Math.min(22, stats.pressureWeight * 0.8);
  score = Math.round(Math.max(0, Math.min(100, score)));
  const concentrated = stats.exactSupport >= 2 || (density >= 6 && stats.strongDirectSupports >= 2);
  const verticalEligible = score >= 72 && concentrated && stats.strongDirectSupports >= 2 && lead >= 62 && stats.pressureWeight <= stats.supportWeight * 0.9;
  let band = "LOW";
  if (verticalEligible) band = "EXTREME / VERTICAL-MOVE POTENTIAL";
  else if (score >= 48) band = "HIGH";
  else if (score >= 30) band = "MODERATE";
  return { score, band, concentrated, verticalEligible, strongDirectSupports: stats.strongDirectSupports };
}

function opportunityClass(item, priorState = null) {
  const direction = classifyDirection(item);
  const accel = acceleration(item);
  const lead = n(item?.leadershipProbability, 50);
  const afterReset = priorState && ["HIGH / RESET RISK", "HIGH / BREAK CANDIDATE"].includes(priorState.pressure);
  if (direction.startsWith("DOWN")) return "RELIEF / REPAIR ONLY";
  if (afterReset && direction.startsWith("UP")) return "RECOVERY / RE-IGNITION TEST";
  if (accel.band.startsWith("EXTREME")) return "ACCELERATION WINDOW";
  if (direction === "UP" && lead >= 70) return "EXPANSION CONTINUATION";
  if (direction.startsWith("UP")) return "TACTICAL LIFT / BUILDING EXPANSION";
  return "NO CLEAN OPPORTUNITY CLASS";
}

function tacticalState(present) {
  const dir = classifyDirection(present);
  const pressure = classifyPressure(present);
  const e = n(present?.expansionScore, 50);
  const stats = contactStats(present);
  if (dir === "UP" && e >= 68 && stats.supportWeight > stats.pressureWeight * 1.2) return "ENTER / ADD NOW";
  if (dir.startsWith("UP") && pressure !== "HIGH / BREAK CANDIDATE") return "HOLD / PART-SIZED ENTRY";
  if (dir.startsWith("DOWN")) return "AVOID / USE RALLY TO REDUCE";
  return "WAIT FOR DATED TRIGGER";
}

function episodeStateMachine(timeline) {
  let state = "UNRESOLVED";
  let confirmedBreakDate = null;
  let priorPressure = null;
  return timeline.map((item, index) => {
    const direction = classifyDirection(item);
    const pressure = classifyPressure(item);
    const breakCheck = breakEvidence(item, timeline.slice(index + 1), 120);
    const accel = acceleration(item);
    const stats = contactStats(item);

    if (breakCheck.complete && pressure.startsWith("HIGH") && (direction.startsWith("DOWN") || stats.pressureWeight > stats.supportWeight * 1.35)) {
      state = "BREAK / ACTIVE DE-RATING";
      confirmedBreakDate = item.date;
    } else if (confirmedBreakDate) {
      if (direction.startsWith("UP") && accel.score >= 55 && stats.strongDirectSupports >= 2) state = "POST-BREAK RE-IGNITION TEST";
      else if (direction.startsWith("UP")) state = "POST-BREAK RELIEF / REPAIR";
      else if (direction.startsWith("SIDEWAYS")) state = "POST-BREAK DORMANCY / RANGE";
      else state = "ACTIVE DE-RATING / REPAIR PENDING";
    } else if (index === 0 && pressure.startsWith("HIGH") && direction.startsWith("SIDEWAYS")) {
      state = "PRESSURE-TO-EXPANSION TRANSITION";
    } else if (direction === "UP" && accel.band.startsWith("EXTREME")) {
      state = "ACCELERATION WINDOW";
    } else if (direction.startsWith("UP") && pressure.startsWith("HIGH")) {
      state = "ACTIVE EXPANSION / RESET TEST";
    } else if (direction.startsWith("UP")) {
      state = priorPressure?.startsWith("HIGH") ? "RECOVERY / RE-IGNITION TEST" : "ACTIVE EXPANSION / CONTINUATION";
    } else if (direction.startsWith("SIDEWAYS")) {
      state = priorPressure?.startsWith("HIGH") ? "POST-RESET RANGE / DORMANCY WATCH" : "MID-CYCLE RANGE / LOW PRODUCTIVITY";
    } else if (direction.startsWith("DOWN")) {
      state = "PRESSURE-LED DECLINE";
    }
    priorPressure = pressure;
    return { date: item.date, state, confirmedBreakDate, direction, pressure, breakCheck };
  });
}

function strategicState(timeline) {
  const phases = episodeStateMachine(timeline);
  const future = timeline.slice(1);
  const futurePhases = phases.slice(1);
  const confirmedBreak = futurePhases.find(x => x.state === "BREAK / ACTIVE DE-RATING");
  const postBreak = futurePhases.some(x => x.state.startsWith("POST-BREAK") || x.state.startsWith("ACTIVE DE-RATING"));
  if (confirmedBreak || postBreak) return "EXPANSION THEN BREAK / POST-BREAK REPAIR";

  const upItems = future.filter(x => classifyDirection(x).startsWith("UP"));
  const down = future.filter(x => classifyDirection(x).startsWith("DOWN")).length;
  const highPressure = future.filter(x => classifyPressure(x).startsWith("HIGH")).length;
  const durableUp = upItems.filter(x => n(x?.leadershipProbability, 0) >= 75 && contactStats(x).supportWeight >= 8).length;
  const cleanReinforcement = upItems.filter(x => !classifyPressure(x).startsWith("HIGH") && acceleration(x).score >= 45).length;
  const runway = durableUp >= 3 && cleanReinforcement >= 3 && highPressure <= 1 && down === 0;
  if (runway) return "RERATING / LEADERSHIP RUNWAY";
  if (upItems.length >= 1 && highPressure >= 1) return "ACTIVE EXPANSION WITH MAJOR RESET RISK";
  if (down >= 2 && upItems.length <= 1) return "STRUCTURAL EROSION / DE-RATING RISK";
  const sideways = future.filter(x => classifyDirection(x).startsWith("SIDEWAYS")).length;
  if (sideways >= Math.max(2, upItems.length + down)) return "RANGE-BOUND / DORMANT CAPITAL";
  if (upItems.length >= 1 && down >= 1) return "CONTESTED CYCLE — OPPORTUNITY WITH RESET RISK";
  return "UNRESOLVED STRATEGIC STATE";
}

function currentDormancyState(present, nearFuture) {
  const active = Boolean(present?.episodeContext?.active);
  const e = n(present?.expansionScore, 50);
  const p = n(present?.pressureScore, 50);
  const dir = classifyDirection(present);
  const productiveNear = nearFuture.some(x => n(x?.expansionScore, 0) >= 65 && classifyDirection(x).startsWith("UP"));
  if (active && e >= 58 && dir.startsWith("UP")) return { type: "NO CURRENT DORMANCY", contradiction: true, reason: "Active episode and usable expansion are already present." };
  if (!active && e < 58 && !productiveNear) return { type: "PRE-IGNITION DORMANCY", contradiction: false, reason: "No productive current or near-term expansion window is active." };
  if (dir.startsWith("SIDEWAYS") && Math.abs(e - p) <= 9) return { type: "CURRENT LOW-PRODUCTIVITY / RANGE WATCH", contradiction: false, reason: "Present astrology is balanced or weakly activated; no reset is assumed before it occurs." };
  return { type: "NO CURRENT DORMANCY CONFIRMED", contradiction: false, reason: "Present evidence does not establish a dormant state." };
}

function futureDormancyPhases(timeline) {
  const phases = [];
  for (let i = 1; i < timeline.length; i++) {
    const item = timeline[i];
    const prev = timeline[i - 1];
    const dir = classifyDirection(item);
    const pressure = classifyPressure(item);
    const prevPressure = classifyPressure(prev);
    if (dir.startsWith("SIDEWAYS") && pressure !== "HIGH / RESET RISK") {
      phases.push({ date: item.date, type: prevPressure.startsWith("HIGH") ? "POST-RESET RANGE WATCH" : "MID-CYCLE RANGE WATCH" });
    }
  }
  return phases;
}

function nearestMajorRisk(present, timeline, phases) {
  const base = dateOf(present);
  const candidates = [];
  for (let i = 1; i < timeline.length; i++) {
    const item = timeline[i];
    const d = dayDiff(base, dateOf(item));
    if (d === null || d <= 0) continue;
    const pressure = classifyPressure(item);
    const br = breakEvidence(item, timeline.slice(i + 1), 120);
    const phase = phases?.[i]?.state || "";
    const stats = contactStats(item);
    const majorReset = pressure.startsWith("HIGH") && (br.complete || stats.exactPressure >= 1 || stats.pressureWeight >= stats.supportWeight * 1.2);
    if (br.complete || /BREAK|DE-RATING/.test(phase) || majorReset) {
      candidates.push({
        date: dateOf(item),
        days: d,
        pressure,
        label: br.complete || /BREAK|DE-RATING/.test(phase) ? "BREAK / ACTIVE DE-RATING RISK" : "MAJOR RESET RISK",
        evidence: br.evidence || [],
        phase
      });
    }
  }
  return candidates.sort((a, b) => a.days - b.days)[0] || null;
}

function nextAccelerationWindow(present, timeline) {
  const base = dateOf(present);
  const candidates = [];
  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    const d = dayDiff(base, dateOf(item));
    if (d === null || d < 0) continue;
    const accel = acceleration(item);
    const cls = opportunityClass(item, i > 0 ? { pressure: classifyPressure(timeline[i - 1]) } : null);
    if (accel.score >= 55 || cls === "ACCELERATION WINDOW") {
      candidates.push({ date: dateOf(item), days: d, band: accel.band, score: accel.score, opportunityClass: cls });
    }
  }
  return candidates.sort((a, b) => a.days - b.days)[0] || null;
}

function inferCycleLocation(present, timeline, phases, strategic) {
  const firstPhase = phases?.[0]?.state || "UNRESOLVED";
  if (/BREAK|DE-RATING/.test(firstPhase)) return "BROKEN / DE-RATING";
  if (/POST-BREAK/.test(firstPhase)) return "POST-BREAK REPAIR / DORMANCY";
  if (/ACCELERATION/.test(firstPhase)) return "ACTIVE ACCELERATION";
  if (/RANGE|DORMANCY|LOW PRODUCTIVITY/.test(firstPhase)) return "RANGE / LOW-PRODUCTIVITY";
  const futureBreak = phases?.find((x, i) => i > 0 && /BREAK|DE-RATING/.test(x.state));
  const accelAhead = nextAccelerationWindow(present, timeline);
  if (futureBreak) return "LATE-CYCLE / PROTECTABLE EXPANSION";
  if (accelAhead && accelAhead.days <= 180 && classifyDirection(present).startsWith("UP")) return "ACTIVE RERATING / PRE-ACCELERATION";
  if (strategic === "RERATING / LEADERSHIP RUNWAY") return "RERATING RUNWAY";
  if (classifyDirection(present).startsWith("UP")) return "ACTIVE EXPANSION / CHURN";
  return "UNRESOLVED CYCLE LOCATION";
}

function capitalHorizonVerdicts(present, timeline, strategic, currentDormancy) {
  const phases = episodeStateMachine(timeline);
  const majorRisk = nearestMajorRisk(present, timeline, phases);
  const accelAhead = nextAccelerationWindow(present, timeline);
  const dir = classifyDirection(present);
  const tactical = tacticalState(present);
  const cycleLocation = inferCycleLocation(present, timeline, phases, strategic);
  const activeNoDormancy = currentDormancy?.type === "NO CURRENT DORMANCY" || currentDormancy?.type === "NO CURRENT DORMANCY CONFIRMED";

  let tacticalVerdict = tactical;
  let tacticalNote = "Tie tactical action to the current 30–60 day astrology, not to the cleanest later strategic window.";
  if (dir.startsWith("UP") && activeNoDormancy && tactical === "WAIT FOR DATED TRIGGER") {
    tacticalVerdict = "PART-SIZED / SELECTIVE PARTICIPATION";
    tacticalNote = "Active support is present; this is not dormancy, even if a cleaner trigger lies later.";
  }

  let strategicVerdict = "CONDITIONAL";
  let strategicNote = "Strategic capital requires runway through the first major pressure gate, not merely one supportive transit.";
  if (majorRisk && majorRisk.days <= 180) {
    strategicVerdict = "TACTICAL ONLY — NO FRESH STRATEGIC CAPITAL";
    strategicNote = `Major ${majorRisk.label.toLowerCase()} appears within ${majorRisk.days} days (${majorRisk.date}); protect/exit discipline is required before any longer hold.`;
  } else if (majorRisk && majorRisk.days <= 365) {
    strategicVerdict = "CONDITIONAL — PROTECTION DATE REQUIRED";
    strategicNote = `Runway is usable only with review/protection before ${majorRisk.date} (${majorRisk.label}).`;
  } else if (strategic === "RERATING / LEADERSHIP RUNWAY" && !majorRisk) {
    strategicVerdict = "YES — BUILD / HOLD CORE";
    strategicNote = "Support persists across the sampled horizon without a mapped major break gate.";
  } else if (/STRUCTURAL EROSION|RANGE-BOUND/.test(strategic) || /BROKEN|POST-BREAK/.test(cycleLocation)) {
    strategicVerdict = "AVOID / REPAIR ONLY";
    strategicNote = "Do not classify post-break or range support as strategic accumulation until re-ignition is confirmed across multiple checkpoints.";
  } else if (dir.startsWith("UP") && activeNoDormancy) {
    strategicVerdict = majorRisk ? "CONDITIONAL — ACTIVE MANAGEMENT" : "CONDITIONAL BUILD";
    strategicNote = majorRisk ? `Active support exists, but capital must be reviewed before ${majorRisk.date}.` : "Active support exists, but this is not yet a confirmed passive runway.";
  }

  let passiveVerdict = "CONDITIONAL";
  let passiveNote = "Passive long-term approval needs a 12–24 month runway with manageable pressure gates.";
  if (majorRisk && majorRisk.days <= 365) {
    passiveVerdict = "NO — NOT PASSIVE LONG-TERM";
    passiveNote = `A major reset/break gate appears within 12 months (${majorRisk.date}); do not convert tactical participation into a passive hold.`;
  } else if (majorRisk && majorRisk.days <= 540) {
    passiveVerdict = "CONDITIONAL — REVIEW BEFORE PRESSURE";
    passiveNote = `Longer hold is possible only with a dated review before ${majorRisk.date}.`;
  } else if (strategic === "RERATING / LEADERSHIP RUNWAY" && !majorRisk) {
    passiveVerdict = "YES — LONGER RUNWAY VISIBLE";
    passiveNote = "No major break gate is mapped inside the sampled strategic horizon.";
  } else if (/BROKEN|POST-BREAK|RANGE-BOUND|STRUCTURAL EROSION/.test(`${cycleLocation} ${strategic}`)) {
    passiveVerdict = "NO — DORMANCY / DE-RATING RISK";
    passiveNote = "Treat support as relief or repair until a fresh sustained episode is established.";
  }

  return {
    tactical: { horizon: "30–60 days", verdict: tacticalVerdict, note: tacticalNote },
    strategic: { horizon: "3–12 months", verdict: strategicVerdict, note: strategicNote },
    passiveLongTerm: { horizon: "12–24 months", verdict: passiveVerdict, note: passiveNote },
    breakHorizon: majorRisk,
    nextAcceleration: accelAhead,
    cycleLocation,
    guardrail: "A stock can be tactically attractive, strategically conditional, and unsuitable for passive long-term capital at the same time."
  };
}

function windowSelectorGuardrails(present, timeline, currentDormancy, windows) {
  const map = windows?.windowMap || {};
  const dormancyLabel = map?.dormancyWindow?.label || map?.dormancyWindow?.text || "";
  const hasFalseDormancy = Boolean(currentDormancy?.contradiction && dormancyLabel);
  const laterAcceleration = nextAccelerationWindow(present, timeline);
  const productiveNow = classifyDirection(present).startsWith("UP") && (present?.episodeContext?.active || n(present?.expansionScore, 0) >= 58);
  return {
    falseDormancyVeto: hasFalseDormancy,
    productiveNow,
    laterAcceleration,
    rule: "A later cleanest/primary acceleration window cannot erase an active current or near-term productive window.",
    correctedWindowLanguage: hasFalseDormancy || productiveNow
      ? "Current phase should be active churn / selective participation / pressure-before-acceleration, not dormancy."
      : "No current-window override detected."
  };
}

function modelDisagreements(present, timeline, windows) {
  const flags = [];
  const sig = low(signalOf(present));
  const dir = classifyDirection(present);
  const currentDorm = currentDormancyState(present, localFuture(present, timeline.slice(1), 120));
  const modelDorm = low(windows?.windowMap?.dormancyWindow?.label || windows?.windowMap?.dormancyWindow?.text || "");
  if (dir.startsWith("UP") && /watch only|repair watch|future support/.test(sig)) flags.push("CURRENT_SUPPORT_SUPPRESSED");
  if (currentDorm.contradiction && (modelDorm || /dormant/.test(sig))) flags.push("DORMANCY_CONTRADICTION");
  if (/break/.test(sig) && !breakEvidence(present, timeline.slice(1), 120).complete) flags.push("BREAK_WITHOUT_TERMINATION");
  if (acceleration(present).band.startsWith("EXTREME") && !/vertical|high-velocity|acceleration/.test(sig)) flags.push("ACCELERATION_FLATTENED");
  if (/ENTER|ADD/.test(tacticalState(present)) && /watch|stagger/.test(low(actionOf(present)))) flags.push("TACTICAL_ACTION_TOO_DEFENSIVE");
  if (timeline.length >= 3) flags.push("CHECK_CHRONOLOGICAL_STORY");
  return flags;
}

function stateKey(item) {
  return `${classifyDirection(item)}|${classifyPressure(item)}|${opportunityClass(item)}`;
}

function makeTimeline(replayDate, replay, windows, forwardDays = 730) {
  const map = windows?.windowMap || {};
  const horizonEnd = new Date(`${replayDate}T00:00:00Z`).getTime() + n(forwardDays, 730) * dayMs;
  const inHorizon = item => {
    const d = dateOf(item);
    return d && new Date(`${d}T00:00:00Z`).getTime() <= horizonEnd;
  };
  const keySource = [
    { role: "Present foundation", date: replayDate, item: replay },
    { role: "Tactical opportunity", item: map.tacticalOpportunity || windows?.tactical },
    { role: "Tactical risk", item: map.tacticalRisk },
    { role: "Strategic accumulation", item: map.strategicAccumulation },
    { role: "Strategic opportunity", item: map.strategicOpportunity || windows?.strategic || windows?.bestWindow },
    { role: "Strategic risk", item: map.strategicRisk }
  ].filter(x => x.item && inHorizon(x.item));

  const scans = Array.isArray(windows?.fullScan) ? windows.fullScan.filter(inHorizon) : [];
  const transitions = [];
  let lastKey = null;
  scans.forEach((item, idx) => {
    const key = stateKey(item);
    if (idx === 0 || key !== lastKey) transitions.push({ ...item, role: idx === 0 ? "Present foundation" : "Intermediate phase" });
    lastKey = key;
  });

  const combined = [
    ...keySource.map(x => ({ ...x.item, role: x.role, date: x.date || dateOf(x.item) })),
    ...transitions.map(x => ({ ...x, date: dateOf(x) }))
  ].filter(x => x.date);
  const byDate = new Map();
  combined.sort((a,b) => String(a.date).localeCompare(String(b.date))).forEach(x => {
    const existing = byDate.get(x.date);
    if (!existing || existing.role === "Intermediate phase") byDate.set(x.date, x);
  });
  return [...byDate.values()].slice(0, 12);
}

function coherentStory(timeline, currentDormancy, futureDormancy, strategic) {
  const phases = timeline.map((x, idx) => {
    const pressure = classifyPressure(x);
    const prior = idx > 0 ? { pressure: classifyPressure(timeline[idx - 1]) } : null;
    const cls = opportunityClass(x, prior);
    if (idx === 0) return `${x.date}: ${classifyDirection(x)}; ${tacticalState(x)}.`;
    if (pressure.startsWith("HIGH")) return `${x.date}: ${pressure.toLowerCase()}; ${breakEvidence(x, timeline.slice(idx + 1), 120).label.toLowerCase()}.`;
    return `${x.date}: ${cls.toLowerCase()}.`;
  });
  const futureDormText = futureDormancy.length ? ` Future dormancy watch: ${futureDormancy.map(x => `${x.date} ${x.type}`).join("; ")}.` : "";
  return `${phases.join(" ")} Strategic research state: ${strategic}. Current dormancy state: ${currentDormancy.type}.${futureDormText}`;
}

function receptorFitCapitalGate(transitReceptorFit, capitalHorizon) {
  if (!transitReceptorFit) return capitalHorizon;
  const cls = String(transitReceptorFit.expressionClass || "");
  const gate = transitReceptorFit.capitalActionGate || null;
  const near = transitReceptorFit.pressureInterference?.nearFieldGate || null;
  const next = JSON.parse(JSON.stringify(capitalHorizon || {}));
  const blockFresh = ["PRESSURE_EXPRESSION", "NON_RESPONSIVE_OR_ROTATION_AWAY", "WEAK_OR_NON_RESPONSIVE"].includes(cls);
  const muted = cls === "SUPPORTIVE_BUT_MUTED";
  const contested = cls === "CONTESTED_EXPANSION";
  if (blockFresh) {
    next.tactical = { ...(next.tactical || {}), verdict: "NO FRESH ENTRY — PROTECT / OBSERVE", note: `${transitReceptorFit.expressionLabel}: ${transitReceptorFit.interpretation}` };
    next.strategic = { ...(next.strategic || {}), verdict: "AVOID FRESH STRATEGIC CAPITAL", note: "Transit receptor fit does not convert the macro transit into investable stock-specific expression." };
    next.passiveLongTerm = { ...(next.passiveLongTerm || {}), verdict: "NO — NOT PASSIVE LONG-TERM", note: "Company-specific transit expression is pressure/non-responsive until a new receptor window appears." };
  } else if (muted) {
    next.tactical = { ...(next.tactical || {}), verdict: "HOLD / WAIT — SUPPORTIVE BUT MUTED", note: `${transitReceptorFit.expressionLabel}: sector weather exists, but natal receptor strength is not enough for leadership entry.` };
    if (String(next.strategic?.verdict || "").includes("YES")) next.strategic.verdict = "CONDITIONAL — COMPANY-SPECIFIC TRIGGER REQUIRED";
  } else if (contested) {
    next.tactical = { ...(next.tactical || {}), verdict: near?.severity && near.severity !== "CLEAR" ? "HOLD / PROTECT FIRST" : "HOLD / PART-SIZED ONLY", note: `${transitReceptorFit.expressionLabel}: support exists but pressure interference prevents clean rerating language.` };
    if (near?.severity && near.severity !== "CLEAR") {
      next.breakHorizon = next.breakHorizon || { date: near.date, days: near.days, pressure: near.severity, label: near.severity, evidence: [near.reason], phase: "NEAR-FIELD PROTECTION" };
    }
  }
  next.transitReceptorGate = {
    expressionClass: cls,
    expressionLabel: transitReceptorFit.expressionLabel,
    expressionScore: transitReceptorFit.expressionScore,
    capitalActionGate: gate,
    nearFieldGate: near
  };
  return next;
}

function tacticalStateAfterReceptorFit(baseTactical, transitReceptorFit) {
  if (!transitReceptorFit) return baseTactical;
  const cls = String(transitReceptorFit.expressionClass || "");
  if (["PRESSURE_EXPRESSION", "NON_RESPONSIVE_OR_ROTATION_AWAY", "WEAK_OR_NON_RESPONSIVE"].includes(cls)) return "NO FRESH ENTRY — PROTECT / OBSERVE";
  if (cls === "SUPPORTIVE_BUT_MUTED") return "HOLD / WAIT — SUPPORTIVE BUT MUTED";
  if (cls === "CONTESTED_EXPANSION") return transitReceptorFit.pressureInterference?.nearFieldGate?.severity !== "CLEAR" ? "HOLD / PROTECT FIRST" : "HOLD / PART-SIZED ONLY";
  return baseTactical;
}

export function buildReplayValidationIntelligence({ replayDate, replay, windows, macroSnapshot, natalResearch, forwardDays = 730, transitReceptorFit = null }) {
  const timeline = makeTimeline(replayDate, replay, windows, forwardDays);
  const present = timeline[0] || replay;
  const currentDormancy = currentDormancyState(present, localFuture(present, timeline.slice(1), 120));
  const futureDormancy = futureDormancyPhases(timeline);
  const strategic = strategicState(timeline);
  const baseCapitalHorizon = capitalHorizonVerdicts(present, timeline, strategic, currentDormancy);
  const capitalHorizon = receptorFitCapitalGate(transitReceptorFit, baseCapitalHorizon);
  const windowGuardrails = windowSelectorGuardrails(present, timeline, currentDormancy, windows);
  const accel = acceleration(present);
  const breakCheck = breakEvidence(present, timeline.slice(1), 120);
  const rawDirection = classifyDirection(present);
  const researchDirection = rawDirection.startsWith("DOWN") && !breakCheck.complete && strategic.startsWith("RERATING") ? "UP / CONTESTED" : rawDirection;
  const researchTacticalBase = researchDirection === "UP / CONTESTED" ? "HOLD CORE / WAIT FRESH" : tacticalState(present);
  const researchTactical = tacticalStateAfterReceptorFit(researchTacticalBase, transitReceptorFit);
  return {
    mode: "RESEARCH_DISPLAY_ONLY",
    productionImpact: "none",
    version: "v31.5.3-capital-horizon-window-guardrails",
    chartContext: {
      selectedChartId: natalResearch?.selectedChartId || null,
      preferredChartId: natalResearch?.preferredChartId || null,
      candidateCount: natalResearch?.candidateCount || 0,
      requestedForwardDays: n(forwardDays, 730)
    },
    currentResearchReading: {
      direction: researchDirection,
      pressure: classifyPressure(present),
      tacticalState: researchTactical,
      strategicState: strategic,
      capitalHorizon,
      windowSelectorGuardrails: windowGuardrails,
      opportunityClass: opportunityClass(present, null),
      accelerationPotential: accel,
      dormancy: currentDormancy,
      futureDormancyPhases: futureDormancy,
      breakAssessment: breakCheck,
      macroContext: {
        environment: macroSnapshot?.environment || null,
        pressure: macroSnapshot?.pressure ?? null,
        expansion: macroSnapshot?.expansion ?? null
      },
      transitReceptorFit
    },
    modelReading: {
      signal: signalOf(present),
      actionBias: actionOf(present),
      expansion: present?.expansionScore ?? null,
      pressure: present?.pressureScore ?? null,
      leadership: present?.leadershipProbability ?? null
    },
    disagreements: modelDisagreements(present, timeline, windows),
    chronologicalStory: `${coherentStory(timeline, currentDormancy, futureDormancy, strategic)} Capital horizon: Tactical ${capitalHorizon.tactical.verdict}; Strategic ${capitalHorizon.strategic.verdict}; Passive long-term ${capitalHorizon.passiveLongTerm.verdict}.`,
    episodePhases: episodeStateMachine(timeline),
    timeline: timeline.map((item, index) => ({
      date: item.date,
      role: item.role,
      modelSignal: signalOf(item),
      direction: classifyDirection(item),
      pressure: classifyPressure(item),
      episodeState: episodeStateMachine(timeline)[index]?.state || "UNRESOLVED",
      opportunityClass: opportunityClass(item, index > 0 ? { pressure: classifyPressure(timeline[index - 1]) } : null),
      accelerationPotential: acceleration(item),
      breakAssessment: breakEvidence(item, timeline.slice(index + 1), 120)
    })),
    methodologyNote: "Research-only, horizon-bounded interpretation derived from existing replay astrology and sampled forward windows. Episode states inherit chronologically: support after a confirmed break begins as repair or re-ignition, not automatic continuation. Break confirmation requires local persistence. Capital horizon verdicts separate tactical, strategic, and passive long-term capital. Transit Receptor Fit classifies macro transit weather through sector eligibility, natal receptor strength, pressure interference, historical echo and company-specific expression. It does not change production scores, natal preference, or window selection."
  };
}
