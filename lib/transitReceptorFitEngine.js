import { inferSectorProfile } from "./sectorOntology.js";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const low = value => String(value || "").toLowerCase();

const PLANET_IMPORTANCE = {
  sun: 1.15,
  moon: 1.15,
  mercury: 1.05,
  venus: 1.10,
  mars: 1.05,
  jupiter: 1.18,
  saturn: 1.12,
  rahu: 1.05,
  ketu: 0.95
};

const BENEFIC_PLANETS = new Set(["jupiter", "venus", "mercury", "moon", "sun"]);
const STRUCTURAL_PLANETS = new Set(["saturn", "jupiter"]);
const PRESSURE_PLANETS = new Set(["saturn", "ketu", "eclipse"]);
const NODE_PLANETS = new Set(["rahu", "ketu"]);

const SIGN_TRANSIT_THEMES = {
  Aries: ["force", "initiative", "execution", "conflict", "engineering"],
  Taurus: ["resources", "valuation", "materials", "stability", "consumption", "comfort"],
  Gemini: ["information", "transactions", "communication", "technology", "distribution"],
  Cancer: ["nurture", "care", "healing", "protection", "food", "housing", "public-welfare", "domestic-demand"],
  Leo: ["leadership", "visibility", "power", "brands"],
  Virgo: ["health", "analysis", "process", "precision", "services", "research"],
  Libra: ["valuation", "preference", "partnership", "markets"],
  Scorpio: ["resources", "risk", "transformation", "defence", "depth", "security"],
  Sagittarius: ["expansion", "institutions", "knowledge", "globalisation"],
  Capricorn: ["structure", "infrastructure", "discipline", "capital-intensity", "regulation"],
  Aquarius: ["technology", "networks", "systems", "collective-infrastructure", "disruption"],
  Pisces: ["healing", "dissolution", "care", "chemistry", "imagination", "research"]
};

const TRANSIT_FAMILY_THEMES = {
  jupiter: ["expansion", "institutions", "growth", "valuation", "scale", "public-welfare", "healing"],
  saturn: ["structure", "discipline", "execution", "regulation", "debt", "capital-intensity"],
  rahu: ["narrative", "disruption", "foreign", "technology", "speculation", "amplification"],
  ketu: ["detachment", "contraction", "focus", "hidden-risk"],
  eclipse: ["reset", "visibility-shift", "volatility", "threshold"]
};

function overlapCount(a = [], b = []) {
  const bs = new Set((b || []).map(low));
  return (a || []).map(low).filter(item => bs.has(item)).length;
}

function primaryTransit(transits = {}, replay = {}) {
  const positions = transits?.positions || transits?.transits?.positions || {};
  const details = Array.isArray(replay?.transitDetails) ? replay.transitDetails : [];

  const rankedSlow = details
    .filter(contact => ["jupiter", "saturn", "rahu", "ketu", "eclipse"].includes(low(contact?.planet)))
    .sort((a, b) => Math.abs(n(b?.score)) - Math.abs(n(a?.score)));

  const firstJupiter = rankedSlow.find(contact => low(contact?.planet) === "jupiter");
  const dominant = firstJupiter || rankedSlow[0] || null;

  if (dominant) {
    return {
      planet: low(dominant.planet),
      label: dominant.planet,
      sign: dominant.transitSign || dominant.sign || positions?.[low(dominant.planet)]?.sign || null,
      contact: dominant
    };
  }

  if (positions?.jupiter?.sign) {
    return {
      planet: "jupiter",
      label: "Jupiter",
      sign: positions.jupiter.sign,
      contact: null
    };
  }

  return {
    planet: "jupiter",
    label: "Jupiter",
    sign: null,
    contact: null
  };
}

function scoreSectorThemeFit(company, transit, sectorProfile) {
  const sectors = sectorProfile?.sectors?.length ? sectorProfile.sectors : sectorProfile?.primary ? [sectorProfile.primary] : [];
  const signThemes = SIGN_TRANSIT_THEMES[transit.sign] || [];
  const familyThemes = TRANSIT_FAMILY_THEMES[transit.planet] || [];
  const transitThemes = [...signThemes, ...familyThemes];
  if (!sectors.length) {
    return {
      score: 45,
      label: "Unknown sector fit",
      matches: [],
      note: "Sector could not be classified; model keeps the transit neutral rather than assuming support."
    };
  }

  const matches = sectors.map(sector => {
    const themeHits = overlapCount(transitThemes, sector.themes);
    const signHit = (sector.signs || []).includes(transit.sign) ? 1 : 0;
    const planetHit = (sector.planets || []).map(low).includes(transit.planet) ? 1 : 0;

    let raw = 28 + themeHits * 12 + signHit * 18 + planetHit * 16;

    // Cancer/Jupiter should favour healing/domestic themes and not automatically lift defence/industrial force themes.
    if (transit.planet === "jupiter" && transit.sign === "Cancer") {
      if (["pharma", "hospitals", "consumer"].includes(sector.id)) raw += 12;
      if (["defence", "metalsMining", "infrastructure", "electronicsManufacturing"].includes(sector.id)) raw -= 18;
    }

    return {
      sectorId: sector.id,
      sectorLabel: sector.label,
      themeHits,
      signHit: Boolean(signHit),
      planetHit: Boolean(planetHit),
      score: clamp(raw)
    };
  }).sort((a, b) => b.score - a.score);

  const best = matches[0];
  return {
    score: best?.score ?? 45,
    label: best?.score >= 75 ? "High" : best?.score >= 58 ? "Medium" : best?.score >= 40 ? "Low/Neutral" : "Low",
    matches,
    note: best
      ? `${transit.label || transit.planet} in ${transit.sign || "current sign"} has ${best.score >= 58 ? "usable" : "weak"} sector-theme fit with ${best.sectorLabel}.`
      : "No sector-theme match found."
  };
}

function contactWeight(contact) {
  const target = low(contact?.targetPlanet || contact?.natalPlanet);
  const orb = n(contact?.orb, 6);
  const exactness = clamp((6 - Math.min(6, orb)) / 6, 0, 1);
  const planet = low(contact?.planet);
  const score = Math.abs(n(contact?.score || contact?.rawScore));
  const targetBoost = PLANET_IMPORTANCE[target] || 1;
  const sourceBoost = planet === "jupiter" ? 1.18 : planet === "saturn" ? 1.08 : NODE_PLANETS.has(planet) ? 0.95 : 1;
  return score * (0.55 + exactness * 0.75) * targetBoost * sourceBoost;
}

function isSupportContact(contact) {
  const planet = low(contact?.planet);
  const aspect = low(contact?.aspect);
  const score = n(contact?.score);
  if (planet === "saturn" && ["trine", "sextile"].includes(aspect) && score >= 0) return true;
  if (planet === "eclipse") return score > 0 && ["conjunction", "trine", "sextile"].includes(aspect);
  if (NODE_PLANETS.has(planet)) return false; // nodes amplify; they do not create durable support by themselves.
  return score > 0;
}

function isPressureContact(contact) {
  const planet = low(contact?.planet);
  const aspect = low(contact?.aspect);
  const score = n(contact?.score);
  if (["square", "opposition"].includes(aspect) && score < 0) return true;
  if (planet === "saturn" && ["conjunction", "square", "opposition"].includes(aspect)) return true;
  if (planet === "ketu" && score <= 0) return true;
  if (planet === "eclipse" && score < 0) return true;
  return score < 0;
}

function scoreNatalReceptorStrength(replay = {}, transit) {
  const details = Array.isArray(replay?.transitDetails) ? replay.transitDetails : [];
  const planetDetails = details.filter(contact => low(contact?.planet) === transit.planet || (transit.planet === "jupiter" && low(contact?.planet) === "jupiter"));
  const supportDetails = planetDetails.filter(contact => n(contact?.score) > 0);
  const allRelevant = supportDetails.length ? supportDetails : planetDetails;
  const weighted = allRelevant.reduce((sum, contact) => sum + contactWeight(contact), 0);
  const exactCount = allRelevant.filter(contact => n(contact?.orb, 99) <= 1.5).length;
  const distinctTargets = new Set(allRelevant.map(contact => low(contact?.targetPlanet || contact?.natalPlanet)).filter(Boolean)).size;

  const score = clamp(22 + weighted * 3.2 + exactCount * 10 + Math.max(0, distinctTargets - 1) * 7);

  return {
    score,
    label: score >= 75 ? "Strong" : score >= 58 ? "Moderate" : score >= 40 ? "Weak/Usable" : "Weak",
    exactCount,
    distinctTargets,
    topContacts: allRelevant
      .slice()
      .sort((a, b) => contactWeight(b) - contactWeight(a))
      .slice(0, 5)
      .map(contact => ({
        planet: contact.planet,
        targetPlanet: contact.targetPlanet,
        aspect: contact.aspect,
        orb: contact.orb,
        score: contact.score,
        transitSign: contact.transitSign
      })),
    note: allRelevant.length
      ? `${transit.label || transit.planet} has ${score >= 58 ? "meaningful" : "limited"} natal receiving points.`
      : `${transit.label || transit.planet} has no meaningful natal receptor inside the current orb.`
  };
}

function scoreSupportNetwork(replay = {}) {
  const details = Array.isArray(replay?.transitDetails) ? replay.transitDetails : [];
  const support = details.filter(isSupportContact);
  const amplifiers = details.filter(contact => low(contact?.planet) === "rahu" && n(contact?.score) > 0);
  const structural = support.filter(contact => STRUCTURAL_PLANETS.has(low(contact?.planet)));
  const exactSupport = support.filter(contact => n(contact?.orb, 99) <= 1.5);
  const targets = new Set(support.map(contact => low(contact?.targetPlanet || contact?.natalPlanet)).filter(Boolean));
  const supportWeight = support.reduce((sum, contact) => sum + contactWeight(contact), 0);
  const score = clamp(
    18 +
    supportWeight * 2.4 +
    exactSupport.length * 8 +
    Math.max(0, targets.size - 1) * 6 +
    structural.length * 8 +
    Math.min(18, amplifiers.length * 6)
  );

  let label = "Isolated";
  if (score >= 78 && structural.length >= 1 && targets.size >= 2) label = "Institutional / networked";
  else if (score >= 62) label = "Clustered";
  else if (score >= 45) label = "Supported";

  return {
    score,
    label,
    supportWeight: Number(supportWeight.toFixed(2)),
    supportCount: support.length,
    amplifierCount: amplifiers.length,
    exactSupportCount: exactSupport.length,
    distinctTargets: targets.size,
    note: label === "Isolated"
      ? "Support is present but not yet networked enough for a rerating label by itself."
      : `Support is ${label.toLowerCase()}, so the transit has confirmation beyond one contact.`
  };
}

function scorePressureInterference(replay = {}) {
  const details = Array.isArray(replay?.transitDetails) ? replay.transitDetails : [];
  const pressure = details.filter(isPressureContact);
  const exactPressure = pressure.filter(contact => n(contact?.orb, 99) <= 1.5);
  const pressureWeight = pressure.reduce((sum, contact) => sum + contactWeight(contact), 0);
  const sameAxisTargets = new Set();
  for (const p of pressure) {
    const target = low(p?.targetPlanet || p?.natalPlanet);
    if (!target) continue;
    const hasSupportSameTarget = details.some(c => isSupportContact(c) && low(c?.targetPlanet || c?.natalPlanet) === target);
    if (hasSupportSameTarget) sameAxisTargets.add(target);
  }

  const score = clamp(
    n(replay?.structuralPressureScore, 0) * 0.35 +
    n(replay?.pressureScore, 50) * 0.25 +
    pressureWeight * 2.2 +
    exactPressure.length * 10 +
    sameAxisTargets.size * 8
  );

  return {
    score,
    label: score >= 72 ? "High" : score >= 55 ? "Medium-High" : score >= 38 ? "Medium" : "Low",
    pressureWeight: Number(pressureWeight.toFixed(2)),
    pressureCount: pressure.length,
    exactPressureCount: exactPressure.length,
    sameAxisConflicts: [...sameAxisTargets],
    topPressureContacts: pressure
      .slice()
      .sort((a, b) => contactWeight(b) - contactWeight(a))
      .slice(0, 5)
      .map(contact => ({
        planet: contact.planet,
        targetPlanet: contact.targetPlanet,
        aspect: contact.aspect,
        orb: contact.orb,
        score: contact.score,
        transitSign: contact.transitSign
      })),
    note: score >= 55
      ? "Pressure interference is material; supportive transit language should be contested or muted."
      : "Pressure interference is contained."
  };
}

function scoreSectorRotationFit(sectorFit, transit, sectorProfile) {
  const primary = sectorProfile?.primary?.id;
  let score = sectorFit.score;

  if (transit.planet === "jupiter" && transit.sign === "Cancer") {
    if (["pharma", "hospitals", "consumer"].includes(primary)) score += 8;
    if (["defence", "metalsMining"].includes(primary)) score -= 22;
  }

  score = clamp(score);
  return {
    score,
    label: score >= 70 ? "Favoured" : score >= 52 ? "Neutral/Favoured" : score >= 38 ? "Neutral" : "Rotation-away risk",
    note: score < 38
      ? "Current transit family appears to favour a different sector theme unless natal receptor strength compensates."
      : "Sector rotation does not materially oppose the transit expression."
  };
}

function classifyObservedResponse(record) {
  const text = low([
    record?.observedResponse?.classification,
    record?.observedResponse?.sequence,
    record?.review?.notes
  ].filter(Boolean).join(" "));
  const r30 = n(record?.observedResponse?.return30d, null);
  const r60 = n(record?.observedResponse?.return60d, null);
  const r90 = n(record?.observedResponse?.return90d, null);
  const returns = [r30, r60, r90].filter(v => v !== null);
  const avg = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

  if (/strong|leadership|rerat|breakout|soar|rally/.test(text) && avg > 0.03) return { score: 72, label: "Positive historical echo" };
  if (/drawdown|failed|pressure|rotation away|down/.test(text) && avg < 0) return { score: 28, label: "Negative historical echo" };
  if (/mixed|repair|chop|lukewarm|muted/.test(text)) return { score: 48, label: "Mixed/muted historical echo" };
  if (avg > 0.05) return { score: 64, label: "Positive return echo" };
  if (avg < -0.03) return { score: 34, label: "Weak return echo" };
  return { score: 50, label: "Neutral historical echo" };
}

function scoreHistoricalEcho(company, replay = {}, transit, sectorProfile) {
  const registry = getHistoricalRegistry();
  const ticker = low(company?.symbol || company?.ticker || company?.name);
  const details = Array.isArray(replay?.transitDetails) ? replay.transitDetails : [];
  const dominant = transit.contact || details.find(contact => low(contact?.planet) === transit.planet) || null;
  const family = dominant ? `${dominant.planet}->${dominant.targetPlanet}:${dominant.aspect}` : `${transit.label || transit.planet}:${transit.sign || "unknown"}`;
  const signFamily = `${transit.label || transit.planet}:${transit.sign || "unknown"}`;

  const exactCompany = registry.filter(record =>
    low(record?.ticker) === ticker &&
    (record?.transitFamily === family ||
      low(record?.transitEpisode?.peak?.transitSign) === low(transit.sign) ||
      low(record?.transitFamily).includes(transit.planet))
  );

  const sectorIds = new Set((sectorProfile?.sectors || []).map(s => s.id));
  const sectorAnalogues = registry.filter(record =>
    record?.ticker &&
    low(record?.ticker) !== ticker &&
    (
      sectorIds.has(record?.sectorId) ||
      (Array.isArray(record?.sectors) && record.sectors.some(s => sectorIds.has(s)))
    ) &&
    low(record?.transitFamily).includes(transit.planet)
  );

  const evidence = [...exactCompany, ...sectorAnalogues.slice(0, 3)];
  if (!evidence.length) {
    return {
      score: 50,
      label: "No replay memory yet",
      evidenceCount: 0,
      transitFamily: family,
      signFamily,
      records: [],
      note: "No historical response record found; confidence should depend on natal reliability and present receptor strength."
    };
  }

  const classified = evidence.map(record => ({ record, ...classifyObservedResponse(record) }));
  const exactWeight = exactCompany.length ? 0.68 : 0.35;
  const exactAvg = exactCompany.length
    ? exactCompany.map(classifyObservedResponse).reduce((sum, item) => sum + item.score, 0) / exactCompany.length
    : 50;
  const sectorAvg = sectorAnalogues.length
    ? sectorAnalogues.slice(0, 3).map(classifyObservedResponse).reduce((sum, item) => sum + item.score, 0) / Math.min(3, sectorAnalogues.length)
    : 50;

  const score = clamp(exactAvg * exactWeight + sectorAvg * (1 - exactWeight));

  return {
    score,
    label: score >= 65 ? "Positive historical echo" : score <= 38 ? "Weak/negative historical echo" : score >= 55 ? "Mild positive echo" : "Mixed historical echo",
    evidenceCount: evidence.length,
    exactCompanyCount: exactCompany.length,
    sectorAnalogueCount: sectorAnalogues.length,
    transitFamily: family,
    signFamily,
    records: classified.slice(0, 5).map(item => ({
      ticker: item.record.ticker,
      eventDate: item.record.eventDate,
      transitFamily: item.record.transitFamily,
      classification: item.record.observedResponse?.classification,
      label: item.label,
      score: item.score
    })),
    note: exactCompany.length
      ? "Company-specific replay memory is available and contributes to confidence."
      : "Only sector-level replay analogues are available; use as confidence support, not as score truth."
  };
}

function scoreFundamentalTransmission(company = {}, sectorProfile = {}) {
  const text = [
    company.role,
    company.structural_cycle,
    company.sector,
    company.industry,
    company.description,
    company.balanceSheetSensitivity,
    company.earningsVisibility,
    company.capitalIntensity,
    company.demandCyclicality,
    company.debtNotes,
    company.tags?.join(" ")
  ].filter(Boolean).join(" ").toLowerCase();

  let score = 55;
  if (/debt[- ]?light|net cash|cash rich|asset[- ]?light|high roe|compounder|stable|visibility|order book|regulated/.test(text)) score += 12;
  if (/improving|tailwind|export|capex visibility|margin expansion|core/.test(text)) score += 8;
  if (/high debt|leverage|working capital|pledge|asset[- ]?heavy|cyclical|commodity|execution risk|regulatory risk/.test(text)) score -= 12;
  if (/nbfc|finance|real estate|infra|shipyard|defence|power/.test(text)) score -= 3; // not bad; just slower transmission and more Saturn-sensitive.
  if (/pharma|life science|software|platform|consumer|hospital|diagnostic/.test(text)) score += 4;

  const confidence = sectorProfile?.confidence === "low" ? "low" : "medium";
  return {
    score: clamp(score),
    label: score >= 70 ? "Good" : score >= 55 ? "Adequate" : score >= 42 ? "Fragile" : "Weak",
    confidence,
    note: "Lightweight placeholder: replace or enrich with verified balance-sheet, earnings-visibility and debt fields."
  };
}

function natalReliabilityScore(company = {}, natal = {}) {
  const explicitConfidence = low(company.confidence || company.natal_confidence || natal?.metadata?.confidence || "").trim();
  const text = low([company.confidence, company.natal_confidence, natal?.metadata?.confidence, company.sourceNote, company.source, company.registrySource].filter(Boolean).join(" "));
  let score = 55;
  if (/high|audited|verified|mca|exchange|registered/.test(text)) score += 20;
  if (/medium|registry|built-in/.test(text)) score += 8;
  if (/low|unknown|estimated|research|candidate|unverified/.test(text)) score -= 18;
  if (company?.birthTime || natal?.metadata?.birthTime) score += 6;
  if (company?.incorporationDate || natal?.metadata?.incorporationDate || natal?.metadata?.birthDate) score += 6;
  const resolved = clamp(score);
  if (explicitConfidence === "none") return Math.min(resolved, 50);
  if (explicitConfidence === "low") return Math.min(resolved, 54);
  return resolved;
}

function classifyExpression(score, parts) {
  const receptor = parts.natalReceptorStrength.score;
  const sector = parts.sectorThemeFit.score;
  const pressure = parts.pressureInterference.score;
  const network = parts.supportNetworkQuality.score;
  const rotation = parts.sectorRotationFit.score;
  const fundamentals = parts.fundamentalTransmission.score;
  const natalReliability = parts.natalReliability;

  if (pressure >= 72 && network < 58) return "PRESSURE_EXPRESSION";
  if (sector < 38 && receptor < 55 && rotation < 42) return "NON_RESPONSIVE_OR_ROTATION_AWAY";
  if (score >= 75 && sector >= 60 && receptor >= 60 && pressure <= 55 && network >= 55 && fundamentals >= 50 && natalReliability >= 45) return "RERATING_TRANSIT";
  if (score >= 62 && pressure >= 50 && network >= 55) return "CONTESTED_EXPANSION";
  if (score >= 54 && (receptor < 60 || network < 55 || pressure >= 45)) return "SUPPORTIVE_BUT_MUTED";
  if (score >= 58) return "CONSTRUCTIVE_EXPRESSION";
  if (score >= 42) return "WEAK_OR_BACKGROUND";
  return "PRESSURE_OR_ROTATION_AWAY";
}

function expressionLabel(expressionClass) {
  const labels = {
    RERATING_TRANSIT: "Rerating transit",
    CONSTRUCTIVE_EXPRESSION: "Constructive expression",
    SUPPORTIVE_BUT_MUTED: "Supportive but muted",
    CONTESTED_EXPANSION: "Contested expansion",
    NON_RESPONSIVE_OR_ROTATION_AWAY: "Non-responsive / rotation-away",
    PRESSURE_EXPRESSION: "Pressure expression",
    PRESSURE_OR_ROTATION_AWAY: "Pressure / rotation-away",
    WEAK_OR_BACKGROUND: "Weak / background only"
  };
  return labels[expressionClass] || "Mixed / unresolved";
}

export function evaluateTransitReceptorFit({ company = {}, natal = {}, transits = {}, replay = {}, macro = null, fundamentals = null } = {}) {
  const sectorProfile = inferSectorProfile(company);
  const transit = primaryTransit(transits || macro || {}, replay);
  const sectorThemeFit = scoreSectorThemeFit(company, transit, sectorProfile);
  const natalReceptorStrength = scoreNatalReceptorStrength(replay, transit);
  const supportNetworkQuality = scoreSupportNetwork(replay);
  const pressureInterference = scorePressureInterference(replay);
  const sectorRotationFit = scoreSectorRotationFit(sectorThemeFit, transit, sectorProfile);
  const fundamentalTransmission = scoreFundamentalTransmission({ ...company, ...(fundamentals || {}) }, sectorProfile);
  const natalReliability = natalReliabilityScore(company, natal);

  const rawScore =
    0.15 * 72 + // base transit strength: keep major slow transit present, but never let it dominate
    0.20 * sectorThemeFit.score +
    0.25 * natalReceptorStrength.score +
    0.15 * supportNetworkQuality.score +
    0.15 * fundamentalTransmission.score +
    0.10 * sectorRotationFit.score -
    0.25 * pressureInterference.score -
    0.10 * (100 - natalReliability);

  const expressionScore = clamp(Math.round(rawScore));
  const parts = {
    sectorThemeFit,
    natalReceptorStrength,
    supportNetworkQuality,
    pressureInterference,
    sectorRotationFit,
    fundamentalTransmission,
    natalReliability
  };
  const expressionClass = classifyExpression(expressionScore, parts);
  const label = expressionLabel(expressionClass);

  const hardStops = [];
  if (natalReceptorStrength.score < 60) hardStops.push("No rerating label: natal receptor below 60.");
  if (pressureInterference.score > 55) hardStops.push("No clean rerating label: pressure interference above 55.");
  if (sectorThemeFit.score < 40 && natalReceptorStrength.score < 80) hardStops.push("No strong constructive label: sector fit below 40 without exceptional natal compensation.");
  if (natalReliability < 60) hardStops.push("Confidence capped: natal reliability below 60.");
  if (fundamentalTransmission.score < 50) hardStops.push("Investment-strength language capped: fundamental transmission below 50.");

  const confidenceScore = clamp(Math.round(
    natalReliability * 0.45 +
    natalReceptorStrength.score * 0.30 +
    supportNetworkQuality.score * 0.15 +
    Math.max(0, 100 - pressureInterference.score) * 0.10
  ));

  const confidenceLabel = confidenceScore >= 75 ? "High" : confidenceScore >= 60 ? "Medium-High" : confidenceScore >= 45 ? "Medium" : "Low";

  return {
    model: "Transit Receptor Model",
    version: "v32-trm-1",
    principle: "Macro transit creates weather; sector fit creates eligibility; natal receptor creates expression; present astro evidence creates confidence; fundamentals create investability.",
    transit: {
      planet: transit.label || transit.planet,
      sign: transit.sign,
      family: `${transit.label || transit.planet}${transit.sign ? ` in ${transit.sign}` : ""}`,
      dominantContact: transit.contact
        ? {
            planet: transit.contact.planet,
            targetPlanet: transit.contact.targetPlanet,
            aspect: transit.contact.aspect,
            orb: transit.contact.orb,
            score: transit.contact.score,
            transitSign: transit.contact.transitSign
          }
        : null
    },
    sectorProfile: {
      primary: sectorProfile.primary ? { id: sectorProfile.primary.id, label: sectorProfile.primary.label } : null,
      confidence: sectorProfile.confidence,
      sectors: (sectorProfile.sectors || []).map(sector => ({ id: sector.id, label: sector.label }))
    },
    scores: {
      expressionScore,
      confidenceScore,
      sectorThemeFit: Math.round(sectorThemeFit.score),
      natalReceptorStrength: Math.round(natalReceptorStrength.score),
      supportNetworkQuality: Math.round(supportNetworkQuality.score),
      pressureInterference: Math.round(pressureInterference.score),
      sectorRotationFit: Math.round(sectorRotationFit.score),
      fundamentalTransmission: Math.round(fundamentalTransmission.score),
      natalReliability: Math.round(natalReliability)
    },
    expressionClass,
    expressionLabel: label,
    confidenceLabel,
    hardStops,
    components: parts,
    reading: buildReceptorReading({
      transit,
      label,
      expressionClass,
      sectorThemeFit,
      natalReceptorStrength,
      supportNetworkQuality,
      pressureInterference,
      sectorRotationFit,
      historicalEcho,
      fundamentalTransmission,
      natalReliability
    })
  };
}

function buildReceptorReading({
  transit,
  label,
  expressionClass,
  sectorThemeFit,
  natalReceptorStrength,
  supportNetworkQuality,
  pressureInterference,
  sectorRotationFit,
  historicalEcho,
  fundamentalTransmission,
  natalReliability
}) {
  const family = `${transit.label || transit.planet}${transit.sign ? ` in ${transit.sign}` : ""}`;

  if (expressionClass === "RERATING_TRANSIT") {
    return `${family} is not treated as universally bullish; here it qualifies as a ${label.toLowerCase()} because sector fit, natal receptor strength and support-network quality are all present while pressure interference is contained.`;
  }

  if (expressionClass === "SUPPORTIVE_BUT_MUTED") {
    return `${family} is supportive background weather, but the model mutes the reading because receptor/network strength or pressure cleanliness is not sufficient for leadership language.`;
  }

  if (expressionClass === "CONTESTED_EXPANSION") {
    return `${family} has real expansion support, but pressure is active on the same field; read this as execution/digestion rather than clean rerating.`;
  }

  if (expressionClass === "NON_RESPONSIVE_OR_ROTATION_AWAY") {
    return `${family} appears to favour other sector themes unless an exceptional natal receptor compensates; this is the Acutaas/Lupin/BDL safeguard against one-transit-fits-all logic.`;
  }

  if (expressionClass === "PRESSURE_EXPRESSION") {
    return `${family} is expressing mainly through pressure contacts; supportive language is capped until pressure clears or a stronger support network appears.`;
  }

  return `${family} remains a mixed or background influence. Sector fit: ${sectorThemeFit.label}; natal receptor: ${natalReceptorStrength.label}; pressure: ${pressureInterference.label}; historical echo: ${historicalEcho.label}; fundamental transmission: ${fundamentalTransmission.label}; natal reliability ${Math.round(natalReliability)}.`;
}

export default evaluateTransitReceptorFit;
