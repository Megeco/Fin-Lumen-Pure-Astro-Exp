// Fin-Lumen Pure Astro — Fin-Astro Grammar Layer
// Purpose: read transit contact quality before score/action translation.
// This layer is intentionally astrology-first: planet × aspect × natal planet × sector/archetype × macro context.

function lower(value) {
  return String(value || "").toLowerCase();
}

function num(value, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function collectContactText(source = {}) {
  const pieces = [];
  const arrays = [source.topContactText, source.topContacts, source.transitDetails, source.catalystContacts, source.currentContacts];

  arrays.forEach(arr => {
    if (!Array.isArray(arr)) return;
    arr.forEach(contact => {
      if (!contact) return;
      if (typeof contact === "string") pieces.push(contact);
      else pieces.push(contact.text || `${contact.planet || ""} ${contact.aspect || ""} natal ${contact.targetPlanet || ""} ${contact.score || ""}`);
    });
  });

  pieces.push(
    source.ticker,
    source.symbol,
    source.companyName,
    source.name,
    source.natalArchetype,
    source.natal_type,
    source.sector,
    source.industry,
    source.expression,
    source.regime,
    source.environmentSignature,
    source.catalystWindow,
    source.macroOpportunity,
    source.macroRisk,
    source.macroHeadline,
    source.macroStockImplication,
    source.expectedResponse,
    source.expected_behaviour
  );

  return lower(pieces.join(" | "));
}

function detectSector(source = {}, text = collectContactText(source)) {
  const finance = /\b(pfc|rec|power finance|finance|financial|bank|bajajfin|hdfc|icici|sbin|federal|nbfc|credit|lender|capital|finserv|jiofin)\b/i.test(text);
  const marketInfra = /\b(bse|mcx|cdsl|cams|exchange|depository|market infrastructure)\b/i.test(text);
  const defence = /\b(bdl|bel|mazdock|cochin|defence|defense|aerospace|shipyard)\b/i.test(text);
  const it = /\b(infy|tcs|hcltech|kpit|newgen|tech|software|it services|digital)\b/i.test(text);
  const consumer = /\b(titan|trent|dmart|consumer|retail|premium)\b/i.test(text);
  const commodityEnergy = /\b(ongc|oil|gas|coal|vedl|nmdc|hindzinc|commodity|energy|metal|mining)\b/i.test(text);
  const utilitiesPsu = /\b(ntpc|nhpc|sjvn|power grid|pfc|rec|ongc|oil and natural gas|psu|public sector|utility|utilities)\b/i.test(text);
  return { finance, marketInfra, defence, it, consumer, commodityEnergy, utilitiesPsu };
}

function has(text, pattern) {
  return pattern.test(text);
}

export function evaluateFinAstroGrammar(source = {}) {
  const text = collectContactText(source);
  const pressure = num(source.pressureScore ?? source.pressure_score ?? source.pressure, 50);
  const expansion = num(source.expansionScore ?? source.expansion_score ?? source.expansion, 50);
  const leadership = num(source.leadershipProbability ?? source.leadership_probability ?? source.leadership, 50);
  const sector = detectSector(source, text);

  const transitDetails = Array.isArray(source.transitDetails) ? source.transitDetails : [];
  const supportive = transitDetails.filter(c => Number(c?.score) > 0 && /^(conjunction|trine|sextile)$/i.test(String(c?.aspect || "")));
  const hard = transitDetails.filter(c => Number(c?.score) < 0 && /^(square|opposition|conjunction)$/i.test(String(c?.aspect || "")));

  const hasSupportiveContact = (planet, targets, maxOrb = 6) => supportive.some(c =>
    lower(c?.planet) === lower(planet) && targets.includes(lower(c?.targetPlanet)) && Number(c?.orb ?? 99) <= maxOrb
  );
  const hasHardContact = (planet, targets, maxOrb = 6) => hard.some(c =>
    lower(c?.planet) === lower(planet) && targets.includes(lower(c?.targetPlanet)) && Number(c?.orb ?? 99) <= maxOrb
  );

  const softJupiterVenus =
    hasSupportiveContact("jupiter", ["venus", "jupiter", "mercury", "moon", "mars", "sun", "saturn", "rahu"], 5) ||
    hasSupportiveContact("venus", ["jupiter", "venus", "mercury", "moon", "saturn"], 5) ||
    has(text, /jupiter[-\s]venus\s+(sextile|trine|conjunction)/i);

  const institutionalSupport = (sector.finance || sector.utilitiesPsu || sector.marketInfra) && (
    hasSupportiveContact("saturn", ["saturn", "jupiter", "rahu", "mercury"], 4) ||
    hasSupportiveContact("jupiter", ["saturn", "mercury", "jupiter"], 4)
  );

  // Sector resonance may amplify a real benefic/institutional network, but it may not manufacture one.
  // Rahu-only soft contacts are narrative amplification, not finance rerating support.
  const financeSupport = (sector.finance || sector.marketInfra) && (
    hasSupportiveContact("jupiter", ["venus", "jupiter", "mercury", "saturn", "moon"], 5) ||
    hasSupportiveContact("venus", ["jupiter", "venus", "mercury", "saturn"], 5) ||
    institutionalSupport
  );
  const marsExecutionSupport = hasSupportiveContact("jupiter", ["mars"], 5);

  const saturnMercuryHard = has(text, /saturn\s+(square|opposition|conjunction)\s+natal\s+mercury/i);
  const saturnVenusHard = has(text, /saturn\s+(square|opposition|conjunction)\s+natal\s+venus/i);
  const saturnMoonHard = has(text, /saturn\s+(square|opposition|conjunction)\s+natal\s+moon/i);
  const saturnMarsHard = has(text, /saturn\s+(square|opposition|conjunction)\s+natal\s+mars/i);
  const saturnJupiterHard = has(text, /saturn\s+(square|opposition|conjunction)\s+natal\s+jupiter/i);

  const eclipseMoon = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+moon/i);
  const eclipseMercury = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+mercury/i);
  const eclipseVenus = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+venus/i);
  const eclipseMars = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+mars/i);
  const eclipseJupiter = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+jupiter/i);
  const eclipseNodes = has(text, /eclipse\s+(conjunction|square|opposition)\s+natal\s+(rahu|ketu)/i);

  const rahuMoon = has(text, /rahu\s+(conjunction|trine|square|opposition)\s+natal\s+moon/i);
  const rahuMars = has(text, /rahu\s+(conjunction|trine|square|opposition)\s+natal\s+mars/i);
  const rahuVenusJupiter = has(text, /rahu\s+(conjunction|trine|sextile|opposition)\s+natal\s+(venus|jupiter)/i);
  const rahuMercury = has(text, /rahu\s+(conjunction|trine|square|opposition)\s+natal\s+mercury/i);
  const marsNodeHard = has(text, /(mars|rahu|ketu)\s+(square|opposition|conjunction)\s+natal\s+(mars|rahu|ketu)/i);

  const valuationPressure = saturnVenusHard || saturnJupiterHard || eclipseVenus || eclipseJupiter;
  const narrativePressure = saturnMercuryHard || eclipseMercury || rahuMercury;
  const sentimentPressure = saturnMoonHard || eclipseMoon || rahuMoon;
  const executionPressure = saturnMarsHard || eclipseMars || marsNodeHard || rahuMars;
  const structuralReset = (eclipseJupiter || eclipseMars || eclipseNodes || (saturnMercuryHard && pressure >= 70) || (saturnMarsHard && pressure >= 70));
  const volatileExpansion = rahuMoon || rahuMars || rahuVenusJupiter || rahuMercury || eclipseMoon || eclipseMars;
  const contestedMars = marsExecutionSupport && (rahuMars || eclipseMars || marsNodeHard);

  const earlyWindow = leadership >= 58 && expansion >= 68;
  const ordinaryChurn = pressure >= 58 && pressure < 78 && !structuralReset;
  const durableExpansion = softJupiterVenus || financeSupport || institutionalSupport || marsExecutionSupport;
  const supportAbsorbsPressure = durableExpansion && pressure < 80 && !structuralReset;
  const firstPressureInsideSupport = durableExpansion && ordinaryChurn && expansion >= pressure - 5;

  const sameAxisJupiterSaturnConflict = supportive.some(s =>
    lower(s?.planet) === "jupiter" && ["jupiter", "venus", "mercury", "saturn"].includes(lower(s?.targetPlanet)) && Number(s?.orb ?? 99) <= 1.5 &&
    hard.some(h => lower(h?.planet) === "saturn" && lower(h?.targetPlanet) === lower(s?.targetPlanet) && Number(h?.orb ?? 99) <= 2.5)
  );
  const exactBeneficSupport = supportive.some(c =>
    ["jupiter", "venus"].includes(lower(c?.planet)) && Number(c?.orb ?? 99) <= 1.0 && Number(c?.score ?? 0) >= 5
  );

  const futureSupportOnly = leadership < 50 && expansion >= 58 && !exactBeneficSupport;
  const pressureDominatesSupport = pressure >= 80 && (structuralReset || (!durableExpansion && (narrativePressure || executionPressure || valuationPressure)));
  const activeContestedExpansion =
    durableExpansion && expansion >= pressure - 5 && pressure < 80 && !pressureDominatesSupport &&
    (sameAxisJupiterSaturnConflict || (exactBeneficSupport && (valuationPressure || sentimentPressure || narrativePressure)));
  const repairWatch = !activeContestedExpansion && !supportAbsorbsPressure && (
    futureSupportOnly || (leadership < 55 && (valuationPressure || narrativePressure || executionPressure) && !financeSupport)
  );
  const unstableExpansion = expansion >= 66 && pressure >= 62 && !supportAbsorbsPressure && !financeSupport && (structuralReset || (volatileExpansion && (narrativePressure || executionPressure)));
  const financeReratingWithChurn = financeSupport && expansion >= 58 && pressure < 80 && !structuralReset && leadership >= 50;
  const earlyFinanceRerating = financeReratingWithChurn && earlyWindow && expansion >= pressure + 8;
  const contestedLeadership = (durableExpansion || contestedMars) && pressure >= 58 && pressure < 80 && !pressureDominatesSupport && leadership >= 50;

  let signal = "WATCH ONLY — no clean edge";
  let actionBias = "watch";
  let pressureKind = ordinaryChurn ? "digestion" : "neutral";
  let pressureRole = ordinaryChurn ? "churn" : "neutral";
  const notes = [];

  if (earlyFinanceRerating) {
    signal = "EARLY FINANCE RERATING — stagger through churn";
    actionBias = "stagger-add";
    pressureKind = "digestion";
    pressureRole = "churn";
    notes.push("Early finance-sector Jupiter/Venus or Jupiter/Mercury support: first pressure windows are sizing/churn control unless structural pressure dominates.");
  } else if (financeReratingWithChurn) {
    signal = "RALLY WITH CHURN — finance rerating support under pressure";
    actionBias = "hold-stagger";
    pressureKind = "digestion";
    pressureRole = "churn";
    notes.push("Finance/lender Jupiter-Venus or Venus/Jupiter support can sustain rerating through ordinary churn.");
  } else if (activeContestedExpansion) {
    signal = "ACTIVE CONTESTED EXPANSION — support is live; pressure governs pace";
    actionBias = "hold-stagger";
    pressureKind = "structural-test";
    pressureRole = "contested-expansion";
    notes.push("Exact benefic support is active now. Hard Saturn pressure reduces pace and confidence but does not convert the present into future-only support unless the hard network dominates.");
  } else if (repairWatch) {
    signal = "REPAIR GATE — future support exists, current leadership weak";
    actionBias = "wait";
    pressureKind = structuralReset ? "reset" : "repair";
    pressureRole = structuralReset ? "break" : "contamination";
    notes.push("Forward support is visible, but current natal contact quality is not deployable yet.");
  } else if (pressureDominatesSupport) {
    signal = "PRESSURE FIRST — hard natal pressure dominates support";
    actionBias = "protect";
    pressureKind = "structural";
    pressureRole = "break";
    notes.push("Hard Saturn/eclipse/Mars pressure dominates the specific supportive contacts.");
  } else if (unstableExpansion) {
    signal = "UNSTABLE EXPANSION — avoid fresh chase";
    actionBias = "avoid-chase";
    pressureKind = structuralReset ? "reset" : "volatile";
    pressureRole = structuralReset ? "break" : "contamination";
    notes.push("Expansion is driven through volatile or pressured contacts; treat as reversal-prone, not clean accumulation.");
  } else if (contestedLeadership) {
    signal = "CONTESTED LEADERSHIP — hold core, stagger only carefully";
    actionBias = "hold-wait";
    pressureKind = "digestion";
    pressureRole = firstPressureInsideSupport ? "churn" : "contamination";
    notes.push("Support and pressure touch the field together; existing exposure can survive, fresh capital waits for cleaner absorption.");
  } else if (durableExpansion && expansion >= pressure - 8 && expansion >= 62) {
    signal = "RALLY WITH CHURN — durable support under pressure";
    actionBias = "hold-stagger";
    pressureKind = "digestion";
    pressureRole = firstPressureInsideSupport ? "churn" : "digestion";
    notes.push("Benefic/institutional support is present; pressure reduces confidence but does not erase direction.");
  }

  return {
    text,
    sector,
    support: { softJupiterVenus, financeSupport, institutionalSupport, marsExecutionSupport, durableExpansion, supportAbsorbsPressure, exactBeneficSupport },
    pressure: { valuationPressure, narrativePressure, sentimentPressure, executionPressure, structuralReset, ordinaryChurn, pressureDominatesSupport, pressureKind, pressureRole, firstPressureInsideSupport },
    volatile: { volatileExpansion, contestedMars },
    flags: { financeReratingWithChurn, earlyFinanceRerating, contestedLeadership, activeContestedExpansion, sameAxisJupiterSaturnConflict, unstableExpansion, repairWatch, futureSupportOnly },
    signal,
    actionBias,
    notes
  };
}
