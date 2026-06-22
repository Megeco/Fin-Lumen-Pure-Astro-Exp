import {
  resolveCompany
} from "./companyResolver.js";

import {
  generateRealNatalChart
} from "./realNatalGenerator.js";

import {
  generateRealTransits,
  getSign
} from "./realTransitGenerator.js";

import {
  calculateRealEclipseHits,
  getRelevantEclipses
} from "./realEclipseEngine.js";

import calculateTransitResonance from "./transitResonance.js";

import {
  scanForwardWindows
} from "./windowScanner.js";

import {
  getRealEphemeris
} from "./realEphemeris.js";

import {
  scanCatalystToNatal
} from "./catalystToNatal.js";

import {
  evaluateTransitReceptorFit
} from "./transitReceptorFitEngine.js";

import {
  evaluateNatalValidation,
  natalValidationSummary
} from "./natalValidationEngine.js";

function todayDate() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T12:00:00Z`);
  const to = new Date(`${toDate}T12:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function pressureLabel(score) {
  if (score >= 80) {
    return "HIGH PRESSURE";
  }

  if (score >= 68) {
    return "ELEVATED";
  }

  if (score >= 56) {
    return "MODERATE";
  }

  return "LOW";
}

function actionFromResonance(resonance) {
  const pressure = resonance.pressureScore || 0;
  const leadership = resonance.leadershipProbability || 0;
  const volatility = resonance.volatility;
  const regime = resonance.currentRegime || resonance.regime;

  if (pressure >= 88 && resonance.rotationRisk === "High") {
    return "EXIT STRENGTH";
  }

  if (pressure >= 78) {
    return "HEAVY TRIM";
  }

  if (pressure >= 68 && leadership < 45) {
    return "TRIM SATELLITE";
  }

  if (leadership >= 85 && pressure < 72 && volatility !== "EXTREME") {
    return "AGGRESSIVE ACCUMULATION";
  }

  if (leadership >= 72 && pressure < 75) {
    return "ACCUMULATE";
  }

  if (leadership >= 60 && pressure < 68) {
    return "STAGGER ADD";
  }

  if (regime === "Compression" || pressure >= 62) {
    return "WATCH CLOSELY";
  }

  return "HOLD CORE";
}

function compactTransitText(details = []) {
  const sorted = [...details]
    .filter(item => item?.planet && item?.targetPlanet)
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
    .slice(0, 4);

  if (!sorted.length) {
    return "No major natal transit hit inside current orb.";
  }

  return sorted
    .map(item => {
      const score = typeof item.score === "number" ? ` (${item.score > 0 ? "+" : ""}${Math.round(item.score)})` : "";
      const orb = typeof item.orb === "number" ? `, orb ${item.orb}°` : "";
      return `${item.planet} ${item.aspect} natal ${item.targetPlanet}${orb}${score}`;
    })
    .join("; ");
}

function behaviourFromResonance(resonance, catalystScan) {
  const regime = resonance.currentRegime || resonance.regime;
  const topTransit = compactTransitText(resonance.transitDetails);
  const catalyst = catalystScan?.best;
  const catalystLine = catalyst
    ? ` Upcoming catalyst read: ${catalyst.expectedResponse}`
    : "";

  if (regime === "Expansion") {
    return `Current response: expansion bias is active. ${topTransit}.${catalystLine}`;
  }

  if (regime === "Pressure") {
    return `Current response: pressure bias is active; repair quality and timing matter. ${topTransit}.${catalystLine}`;
  }

  if (regime === "Compression") {
    return `Current response: crowded/compressed sky; catalyst behaviour may dominate. ${topTransit}.${catalystLine}`;
  }

  return `Current response: mixed sky; wait for clearer natal activation. ${topTransit}.${catalystLine}`;
}

function nextWindowFrom(windows, startDate) {
  const candidates = [
    ...(windows?.catalystWindows || []),
    ...(windows?.expansionWindows || []),
    ...(windows?.pressureWindows || [])
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const candidate = candidates[0] || windows?.bestWindow || null;

  if (!candidate) {
    return {
      label: "No major 24-month window",
      days: "-",
      type: "No major catalyst cluster"
    };
  }

  return {
    label: candidate.environmentSignature || candidate.regime || "Astro window",
    days: daysBetween(startDate, candidate.date),
    type: candidate.activeClusters?.[0] || candidate.catalystWindow || candidate.regime || "Astro window",
    date: candidate.date,
    score: candidate.leadershipProbability
  };
}

function nextExpansionFrom(windows) {
  const map = windows?.windowMap || {};
  const candidate = map.accumulationOpen || map.tacticalOpportunity || map.strategicAccumulation || map.strategicOpportunity || (windows?.expansionWindows || [])[0] || windows?.bestWindow || null;

  if (!candidate) {
    return "No clear expansion window";
  }

  const role = candidate.windowRole || "Expansion window";
  return `${candidate.date}: ${role} / leadership ${candidate.leadershipProbability}`;
}


function scoreCycleAsymmetry(resonance, windows, catalystScan, natalProfile) {
  const best = windows?.bestWindow || {};
  const expansion = (windows?.expansionWindows || [])[0] || best || {};
  const bestLeadership = Number(best.leadershipProbability || 0);
  const expansionLeadership = Number(expansion.leadershipProbability || 0);
  const currentLeadership = Number(resonance.leadershipProbability || 0);
  const catalystScore = Number(catalystScan?.best?.score || 0);
  const clusterLift = Math.min(18, Number(best.clusterDensity || 0) * 2.5);
  const archetype = String(natalProfile?.natalArchetype || "").toLowerCase();

  let archetypeLift = 0;
  if (archetype.includes("rahu") || archetype.includes("narrative")) {
    archetypeLift += 10;
  }
  if (archetype.includes("ignition") || archetype.includes("momentum")) {
    archetypeLift += 9;
  }
  if (archetype.includes("moon")) {
    archetypeLift += 6;
  }
  if (archetype.includes("saturnian")) {
    archetypeLift += 3;
  }

  const score = Math.round(Math.max(
    currentLeadership,
    bestLeadership,
    expansionLeadership
  ) * 0.68 + Math.min(catalystScore, 160) * 0.12 + clusterLift + archetypeLift);

  return Math.max(0, Math.min(100, score));
}

function cyclePotentialLabel(score) {
  if (score >= 85) return "EXTREME";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "MODERATE";
  if (score > 0) return "LOW";
  return "UNASSESSED";
}

function cycleTimingLabel(windows) {
  const map = windows?.windowMap || {};
  const first = map.accumulationOpen || map.strategicAccumulation || map.strategicOpportunity || windows?.nearestUsableWindow || windows?.bestWindow;
  if (!first?.date) return "No cycle window yet";
  const long = map.longRangeCycle?.date ? `; long-range cycle ${map.longRangeCycle.date}` : "";
  return `${first.date}: ${first.windowRole || first.regime || "Window"} / leadership ${first.leadershipProbability}${long}`;
}

function cyclePotentialNote(resonance, windows, catalystScan, cyclePotential) {
  const current = resonance.multibaggerProbability || "UNASSESSED";
  const best = windows?.bestWindow;
  const catalyst = catalystScan?.best;

  if (!best) {
    return `Current asymmetry: ${current}. Cycle potential cannot yet be assessed without forward windows.`;
  }

  if (cyclePotential === current) {
    return `Current asymmetry and forward cycle potential are both ${cyclePotential}. Best observed forward window: ${cycleTimingLabel(windows)}.`;
  }

  return `Current asymmetry: ${current}. Forward cycle potential: ${cyclePotential}, based on best window ${cycleTimingLabel(windows)}${catalyst ? ` and upcoming catalyst ${catalyst.label}` : ""}.`;
}


function convictionFrom(resonance, catalystScan, cycleScore) {
  const cluster = Number(resonance.clusterDensity || 0);
  const catalyst = Number(catalystScan?.best?.score || 0);
  const leadership = Number(resonance.leadershipProbability || 0);

  const score = Math.round(
    leadership * 0.45 +
    Math.min(catalyst, 160) * 0.18 +
    Math.min(cluster * 5, 25) +
    Math.min(cycleScore, 100) * 0.18
  );

  if (score >= 82) return "EXTREME";
  if (score >= 68) return "HIGH";
  if (score >= 52) return "MEDIUM";
  return "LOW";
}

function phaseFitFrom(windows, resonance, cyclePotential) {
  const map = windows?.windowMap || {};
  const first = map.accumulationOpen || map.strategicAccumulation || map.strategicOpportunity || windows?.nearestUsableWindow || windows?.bestWindow;
  const bestDate = first?.date || "";
  const bestLeadership = Number(first?.leadershipProbability || 0);
  const currentLeadership = Number(resonance.leadershipProbability || 0);

  if (currentLeadership >= 70 && ["HIGH", "EXTREME"].includes(cyclePotential)) {
    return "Both / Active Now";
  }

  if (bestDate && bestDate < "2027-07-01" && bestLeadership >= 70) {
    return "Cycle 1 Leader";
  }

  if (bestDate && bestDate >= "2027-07-01" && bestLeadership >= 70) {
    return "Cycle 2 Leader";
  }

  if (map.longRangeCycle?.date && !bestDate) {
    return "Long-range Watch";
  }

  return "Unclear / Watch";
}

function view2026to2028(resonance, windows, catalystScan, cyclePotential, phaseFitValue) {
  const current = resonance.multibaggerProbability || "UNASSESSED";
  const map = windows?.windowMap || {};
  const first = map.accumulationOpen || map.strategicAccumulation || map.strategicOpportunity || windows?.nearestUsableWindow || windows?.bestWindow;
  const long = map.longRangeCycle;
  const catalyst = catalystScan?.best;
  const rotation = resonance.rotationRisk || "Not assessed";

  if (!first && !long) {
    return "Natal chart computed, but no reliable forward cycle window is visible yet.";
  }

  const firstText = first?.date ? `accumulation/usable window opens ${first.date}` : "no near usable window";
  const longText = long?.date ? `; long-range cycle context ${long.date}` : "";

  if (["HIGH", "EXTREME"].includes(cyclePotential)) {
    return `${phaseFitValue}: ${firstText}${longText}. Current asymmetry is ${current}. Watch ${catalyst?.label || "next catalyst"}; rotation risk ${String(rotation).toLowerCase()}.`;
  }

  if (cyclePotential === "MODERATE") {
    return `${phaseFitValue}: selective opportunity only; ${firstText}${longText}. Current asymmetry ${current}; rotation risk ${String(rotation).toLowerCase()}.`;
  }

  return `${phaseFitValue}: not a primary cycle-leadership candidate yet. ${firstText}${longText}. Current asymmetry ${current}.`;
}

function natalSourceFrom(company, natal) {
  const confidence = String(company?.confidence || natal?.metadata?.confidence || "unknown").toUpperCase();
  const birthDate = natal?.metadata?.incorporationDate || company?.incorporationDate || company?.listingDate || null;

  return {
    computed_from_natal: true,
    natal_confidence: confidence,
    natal_source: company?.incorporationDate
      ? "registered incorporation date"
      : company?.listingDate
        ? "listing date"
        : "registry date",
    natal_birth_date: birthDate,
    natal_company_name: company?.companyName || natal?.metadata?.companyName || company?.symbol,
    natal_calculation: natal?.metadata?.calculation || "ephemeris-derived natal chart",
    registry_source: company?.registrySource || "unknown",
    registry_type: company?.registryType || (company?.registrySource === "built-in-registry" ? "CORE" : "USER"),
    natal_locked: Boolean(company?.locked || company?.registrySource === "built-in-registry"),
    data_lock_note: company?.locked || company?.registrySource === "built-in-registry"
      ? "Core registry stock — natal data locked. Edit only in code."
      : "User-added natal data can be edited in the app."
  };
}

function unresolvedAstro(stock, symbol, error) {
  return {
    structural_cycle: "NATAL DATA PENDING",
    current_pressure: "UNKNOWN",
    next_pressure: "UNKNOWN",
    expansion_current: "Not computed",
    next_ignition: "-",
    current_window: "Add natal data",
    action: "WATCH CLOSELY",
    next_event: "Natal chart unavailable",
    days_to_event: "-",
    expected_behaviour:
      "Fin-Lumen has no reliable natal chart for this ticker yet, so stock-specific behaviour is intentionally not inferred.",
    catalyst_label: "Not computed",
    catalyst_strength: "NONE",
    catalyst_readiness: "Add natal data",
    catalyst_response: "Natal chart required before catalyst-to-stock response can be inferred.",
    catalyst_contacts: [],
    expected_drawdown: "Not assessed",
    recovery_window: "Not assessed",
    expansion_quality: "Not assessed",
    phase_risk: "Not assessed",
    leadership_probability: null,
    multibagger_probability: "UNASSESSED",
    current_multibagger_probability: "UNASSESSED",
    cycle_multibagger_potential: "UNASSESSED",
    cycle_potential_score: null,
    cycle_potential_window: "Add natal data",
    cycle_potential_note: "Cycle potential cannot be assessed without a reliable natal chart.",
    environment_signature: "Natal missing",
    cluster_density: null,
    overlap_intensity: {},
    natal_profile: null,
    natal_temperament: null,
    natal_confidence: "NONE",
    natal_source: "missing from natal registry",
    natal_birth_date: null,
    natal_company_name: symbol,
    computed_from_natal: false,
    registry_source: "missing",
    registry_type: "USER",
    natal_locked: false,
    data_quality_note: error || "Company not found in natal registry. Add incorporation/listing date to compute.",
    transit_details: []
  };
}

export async function astroEngine(stock) {
  const ticker = stock?.name || stock?.symbol || "UNKNOWN";
  const date = todayDate();
  const company = await resolveCompany(ticker, stock);

  if (!company?.found) {
    return unresolvedAstro(stock, ticker, company?.error);
  }

  const natal = generateRealNatalChart(company);
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

  const resonance = calculateTransitResonance(natal, {
    ...transits,
    relevantEclipses,
    eclipseHits
  });

  const macro = getRealEphemeris(date);
  const catalystScan = scanCatalystToNatal(natal, macro?.phases || [], {
    daysAhead: 45,
    limit: 8
  });

  const windows = scanForwardWindows(natal, date);
  const next = nextWindowFrom(windows, date);
  const natalSource = natalSourceFrom(company, natal);
  const pressure = pressureLabel(resonance.pressureScore);
  const action = actionFromResonance(resonance);
  const behaviour = behaviourFromResonance(resonance, catalystScan);
  const natalProfile = resonance.natalProfile || natal.natalProfile;
  const cyclePotentialScore = scoreCycleAsymmetry(resonance, windows, catalystScan, natalProfile);
  const cyclePotential = cyclePotentialLabel(cyclePotentialScore);
  const cycleNote = cyclePotentialNote(resonance, windows, catalystScan, cyclePotential);
  const phaseFitValue = phaseFitFrom(windows, resonance, cyclePotential);
  const conviction = convictionFrom(resonance, catalystScan, cyclePotentialScore);
  const cycleView = view2026to2028(resonance, windows, catalystScan, cyclePotential, phaseFitValue);
  const natalValidation = evaluateNatalValidation(company, { selectedChartId: company.selectedChartId || company.preferredChartId });
  const transitReceptorFit = evaluateTransitReceptorFit({
    company,
    natal,
    transits,
    replay: resonance,
    macro
  });

  return {
    structural_cycle: natalProfile?.natalArchetype || "Computed Natal Profile",
    current_pressure: pressure,
    next_pressure: resonance.rotationRisk,
    expansion_current: nextExpansionFrom(windows),
    next_ignition: typeof (catalystScan?.best?.daysRemaining ?? next.days) === "number" ? `${catalystScan?.best?.daysRemaining ?? next.days} Days` : next.days,
    current_window: catalystScan?.best?.readiness || resonance.catalystWindow || next.type,
    action,
    next_event: catalystScan?.best?.label || next.label,
    days_to_event: catalystScan?.best?.daysRemaining ?? next.days,
    catalyst_label: catalystScan?.best?.label || "No near macro catalyst",
    catalyst_date: catalystScan?.best?.date || null,
    catalyst_exact_ist: catalystScan?.best?.exactIst || null,
    catalyst_strength: catalystScan?.best?.strength || "NO DIRECT HIT",
    catalyst_score: catalystScan?.best?.score || 0,
    catalyst_readiness: catalystScan?.best?.readiness || "Monitor only",
    catalyst_response: catalystScan?.best?.expectedResponse || "No stock-specific macro catalyst response detected.",
    catalyst_contacts: catalystScan?.best?.contacts || [],
    catalyst_contact_text: catalystScan?.best?.contactText || "No tight natal contact detected",
    catalyst_candidates: catalystScan?.candidates || [],
    expected_behaviour: behaviour,
    expected_drawdown: resonance.rotationRisk,
    recovery_window: resonance.phaseFit,
    expansion_quality: resonance.multibaggerProbability,
    phase_risk: resonance.volatility,
    leadership_probability: resonance.leadershipProbability,
    multibagger_probability: resonance.multibaggerProbability,
    current_multibagger_probability: resonance.multibaggerProbability,
    cycle_multibagger_potential: cyclePotential,
    cycle_potential_score: cyclePotentialScore,
    cycle_potential_window: cycleTimingLabel(windows),
    cycle_potential_note: cycleNote,
    phase_fit: phaseFitValue,
    conviction_level: conviction,
    view_2026_28: cycleView,
    current_regime_label: resonance.currentRegime || resonance.regime,
    environment_signature: resonance.environmentSignature,
    cluster_density: resonance.clusterDensity,
    overlap_intensity: resonance.overlapIntensity,
    natal_profile: natalProfile,
    natal_temperament: resonance.natalTemperament,
    transit_details: resonance.transitDetails,
    top_transits: compactTransitText(resonance.transitDetails),
    why: resonance.why,
    resonance_profile: resonance.resonanceProfile,
    historical_response: resonance.historicalResponse,
    historical_fingerprint: resonance.historicalFingerprint,
    historical_similarity: resonance.historicalSimilarity,
    transit_moon_sign: resonance.transitMoonSign,
    moon_environment: resonance.moonEnvironment,
    current_regime: resonance.currentRegime || resonance.regime,
    pressure_score: resonance.pressureScore,
    expansion_score: resonance.expansionScore,
    environment_type: resonance.environmentType,
    active_clusters: resonance.activeClusters,
    relevant_eclipses: relevantEclipses,
    eclipse_hits: eclipseHits,
    natal_validation: natalValidation,
    natal_validation_summary: natalValidationSummary(natalValidation),
    displayed_chart_id: natalValidation.displayedChartId || company.selectedChartId || company.preferredChartId,
    selected_chart_id: company.selectedChartId || company.preferredChartId,
    chart_alternate_count: natalValidation.alternateCount,
    transit_receptor_fit: transitReceptorFit,
    transit_receptor_expression: transitReceptorFit.expressionLabel,
    transit_receptor_class: transitReceptorFit.expressionClass,
    transit_receptor_score: transitReceptorFit.scores.expressionScore,
    transit_receptor_confidence: transitReceptorFit.confidenceLabel,
    transit_receptor_reading: transitReceptorFit.reading,
    current_transits: {
      jupiter: {
        degree: transits.positions?.jupiter?.degree,
        sign: transits.positions?.jupiter?.sign
      },
      saturn: {
        degree: transits.positions?.saturn?.degree,
        sign: transits.positions?.saturn?.sign
      },
      rahu: {
        degree: transits.positions?.rahu?.degree,
        sign: transits.positions?.rahu?.sign
      },
      ketu: {
        degree: transits.positions?.ketu?.degree,
        sign: transits.positions?.ketu?.sign
      },
      moon: {
        degree: transits.positions?.moon?.degree,
        sign: getSign(transits.moon)
      }
    },
    ...natalSource
  };
}

export default astroEngine;
