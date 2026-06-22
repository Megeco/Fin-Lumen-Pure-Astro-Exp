import {
  getElement,
  getSign
} from "./realTransitGenerator.js";

import {
  evaluateFinAstroGrammar
} from "./finAstroGrammar.js";

function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAngle(a, b) {
  const diff = Math.abs(normalizeDegree(a) - normalizeDegree(b));
  return Math.min(diff, 360 - diff);
}

const TRANSIT_RULES = {
  jupiter: [
    {
      aspect: "conjunction",
      angle: 0,
      orb: 6,
      score: 15
    },
    {
      aspect: "trine",
      angle: 120,
      orb: 6,
      score: 12
    },
    {
      aspect: "sextile",
      angle: 60,
      orb: 5,
      score: 8
    },
    {
      aspect: "opposition",
      angle: 180,
      orb: 5,
      score: 4
    }
  ],
  saturn: [
    {
      aspect: "opposition",
      angle: 180,
      orb: 5,
      score: -15
    },
    {
      aspect: "square",
      angle: 90,
      orb: 5,
      score: -12
    },
    {
      aspect: "conjunction",
      angle: 0,
      orb: 4,
      score: -10
    },
    {
      aspect: "trine",
      angle: 120,
      orb: 4,
      score: 4
    }
  ],
  rahu: [
    {
      aspect: "conjunction",
      angle: 0,
      orb: 4,
      score: 12
    },
    {
      aspect: "opposition",
      angle: 180,
      orb: 4,
      score: 10
    },
    {
      aspect: "trine",
      angle: 120,
      orb: 4,
      score: 8
    },
    {
      aspect: "square",
      angle: 90,
      orb: 4,
      score: 6
    }
  ],
  ketu: [
    {
      aspect: "conjunction",
      angle: 0,
      orb: 4,
      score: 6
    },
    {
      aspect: "opposition",
      angle: 180,
      orb: 4,
      score: 5
    },
    {
      aspect: "square",
      angle: 90,
      orb: 4,
      score: -4
    }
  ]
};

const TRANSIT_LABEL = {
  jupiter: "Jupiter",
  saturn: "Saturn",
  rahu: "Rahu",
  ketu: "Ketu",
  eclipse: "Eclipse"
};

function weightedScore(rule, angle) {
  const distance = Math.abs(angle - rule.angle);

  if (distance > rule.orb) {
    return 0;
  }

  const strength = 1 - distance / rule.orb;
  return rule.score * strength;
}

function getNatalPlanets(natal) {
  return natal?.planets || natal || {};
}

function getPlanetEntries(natal) {
  return Object.entries(getNatalPlanets(natal))
    .filter(([, degree]) => typeof degree === "number" && Number.isFinite(degree));
}

function scoreTransit(transitDegree, natalDegree, transitType) {
  const rules = TRANSIT_RULES[transitType] || [];
  const angle = getAngle(transitDegree, natalDegree);

  let best = null;

  for (const rule of rules) {
    const score = weightedScore(rule, angle);

    if (score === 0) {
      continue;
    }

    const candidate = {
      transitType,
      aspect: rule.aspect,
      score,
      angle: Number(angle.toFixed(2)),
      orb: Number(Math.abs(angle - rule.angle).toFixed(2))
    };

    if (!best || Math.abs(candidate.score) > Math.abs(best.score)) {
      best = candidate;
    }
  }

  return best;
}

function addScore(state, score) {
  if (score >= 0) {
    state.expansion += score;
  } else {
    state.pressure += Math.abs(score);
  }
}

function pushUnique(list, seen, value) {
  if (!seen.has(value)) {
    list.push(value);
    seen.add(value);
  }
}

function trackOverlap(overlapIntensity, targetPlanet) {
  if (!targetPlanet) {
    return;
  }

  overlapIntensity[targetPlanet] = (overlapIntensity[targetPlanet] || 0) + 1;
}

function buildNatalProfileFallback(natal) {
  if (natal?.natalProfile) {
    return natal.natalProfile;
  }

  const entries = getPlanetEntries(natal);

  const elementCounts = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0
  };

  for (const [, degree] of entries) {
    elementCounts[getElement(degree)] += 1;
  }

  const sortedElements = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([element]) => element);

  return {
    elementCounts,
    elementBias: sortedElements.slice(0, 2).join("-"),
    dominantPlanets: [],
    sensitivity: {},
    natalArchetype: "Balanced Astro Organism"
  };
}

function buildNatalTemperament(natalProfile) {
  const counts = natalProfile?.elementCounts || {};

  return {
    fireBias: (counts.fire || 0) * 14,
    stabilityBias: (counts.earth || 0) * 15,
    speculativeBias: (counts.air || 0) * 14,
    moonSensitivity: (counts.water || 0) >= 2 ? 80 : 45,
    jupiterAffinity: ((counts.fire || 0) + (counts.water || 0)) * 12,
    rahuAffinity: (counts.air || 0) * 14,
    saturnTolerance: (counts.earth || 0) * 15,
    elementBias: natalProfile?.elementBias || "mixed",
    natalArchetype: natalProfile?.natalArchetype || "Balanced Astro Organism"
  };
}

function moonClimate(moonDegree) {
  const sign = getSign(moonDegree || 0);
  const element = getElement(moonDegree || 0);

  if (element === "water") {
    return {
      transitMoonSign: sign,
      moonEnvironment: "Emotional"
    };
  }

  if (element === "fire") {
    return {
      transitMoonSign: sign,
      moonEnvironment: "Aggressive"
    };
  }

  if (element === "air") {
    return {
      transitMoonSign: sign,
      moonEnvironment: "Narrative"
    };
  }

  return {
    transitMoonSign: sign,
    moonEnvironment: "Practical"
  };
}

function moonBehaviourModifier(moonEnvironment) {
  if (moonEnvironment === "Aggressive") {
    return { volatility: 1.10, sentiment: 1.04, narrative: 1.00, stability: 1.00, label: "Fire Moon: volatility and risk-taking modestly higher" };
  }

  if (moonEnvironment === "Emotional") {
    return { volatility: 1.05, sentiment: 1.10, narrative: 1.00, stability: 0.98, label: "Water Moon: sentiment sensitivity modestly higher" };
  }

  if (moonEnvironment === "Narrative") {
    return { volatility: 1.04, sentiment: 1.02, narrative: 1.10, stability: 1.00, label: "Air Moon: narrative sensitivity modestly higher" };
  }

  return { volatility: 0.90, sentiment: 0.96, narrative: 0.96, stability: 1.08, label: "Earth Moon: chaos dampened; stability modestly higher" };
}

function categorizeVolatility(score) {
  if (score >= 80) {
    return "EXTREME";
  }

  if (score >= 60) {
    return "HIGH";
  }

  if (score >= 35) {
    return "MODERATE";
  }

  return "LOW";
}

function categorizeMultibagger(leadership, volatility, natalTemperament) {
  const ignition =
    leadership * 0.45 +
    volatility * 0.25 +
    natalTemperament.speculativeBias * 0.2 +
    natalTemperament.jupiterAffinity * 0.1;

  if (ignition >= 80) {
    return "EXTREME";
  }

  if (ignition >= 65) {
    return "HIGH";
  }

  if (ignition >= 45) {
    return "MODERATE";
  }

  return "LOW";
}

function phaseFit(leadership, volatility, pressure, natalTemperament) {
  if (leadership >= 70 && volatility >= 60 && natalTemperament.speculativeBias >= 28) {
    return "Cycle 1 Leader";
  }

  if (natalTemperament.stabilityBias >= 45 && pressure <= 75) {
    return "Cycle 2 Leader";
  }

  if (leadership >= 65 && natalTemperament.stabilityBias >= 30) {
    return "Both";
  }

  return "Unclear";
}

function rotationRisk(pressure, volatility, activeClusters, multibaggerProbability) {
  if (
    pressure >= 80 ||
    (volatility >= 75 && activeClusters.some(cluster => cluster.includes("Eclipse"))) ||
    multibaggerProbability === "EXTREME"
  ) {
    return "High";
  }

  if (pressure >= 65 || volatility >= 55) {
    return "Moderate";
  }

  return "Low";
}

function buildReadableView(regime, multibaggerProbability, rotationRiskValue, phaseFitValue) {
  if (regime === "Expansion" && multibaggerProbability === "EXTREME") {
    return `High-asymmetry expansion candidate; ${rotationRiskValue.toLowerCase()} rotation risk; ${phaseFitValue}.`;
  }

  if (regime === "Pressure") {
    return `Pressure-dominant astro environment; watch repair quality and timing; ${rotationRiskValue.toLowerCase()} rotation risk.`;
  }

  if (regime === "Compression") {
    return `Crowded/compressed sky; catalyst behaviour likely more important than ordinary trend.`;
  }

  return `Mixed astro environment; observe for clearer cycle leadership confirmation.`;
}


function signalFamily(transitType, targetPlanet = "") {
  const t = String(transitType || "").toLowerCase();

  if (t.includes("jupiter")) return "jupiter";
  if (t.includes("saturn")) return "saturn";
  if (t.includes("rahu") || t.includes("ketu")) return "nodes";
  if (t.includes("eclipse")) return "eclipse";
  if (t.includes("mars")) return "mars";
  if (t.includes("mercury")) return "mercury";
  if (t.includes("venus")) return "venus";
  return targetPlanet || "general";
}

function diminishingFactor(count) {
  if (count <= 0) return 1;
  if (count === 1) return 0.62;
  if (count === 2) return 0.38;
  if (count === 3) return 0.24;
  return 0.15;
}

function addCalibratedScore(state, score, family, context = {}) {
  const key = `${score >= 0 ? "expansion" : "pressure"}:${family || "general"}`;
  const seenCount = state.familyCounts[key] || 0;
  let factor = diminishingFactor(seenCount);

  if (context.shadow) {
    factor *= 0.32;
  }

  if (context.near) {
    factor *= 0.68;
  }

  const adjusted = score * factor;

  state.familyCounts[key] = seenCount + 1;

  if (score >= 0) {
    state.rawExpansion += score;
    state.expansion += adjusted;
  } else {
    state.rawPressure += Math.abs(score);
    state.pressure += Math.abs(adjusted);
  }

  return adjusted;
}

function compressScore(value, baseline = 50, scale = 42) {
  const delta = value - baseline;
  const compressed = baseline + Math.tanh(delta / scale) * 50;
  return clamp(compressed, 0, 100);
}

function conflictState(expansion, pressure, environmentType) {
  const highExpansion = expansion >= 68;
  const highPressure = pressure >= 62;

  if (highExpansion && highPressure) {
    if (environmentType === "Chaotic Transition") {
      return "HIGH-ENERGY TUG — protect into strength";
    }
    return "HIGH-ENERGY TUG — protect into strength";
  }

  if (highExpansion) return "BUILDING RERATING — add/hold early";
  if (highPressure) return "PRESSURE FIRST — reassess later";
  return "WATCH ONLY — no clean edge";
}

function temperamentVolatilityModifier(natalProfile, natalTemperament) {
  const archetype = String(natalProfile?.natalArchetype || "").toLowerCase();

  if (archetype.includes("rahu") || archetype.includes("narrative")) return 1.32;
  if (archetype.includes("ignition") || archetype.includes("momentum")) return 1.18;
  if (archetype.includes("moon")) return 1.08;
  if (archetype.includes("saturnian")) return 0.82;
  if ((natalTemperament?.stabilityBias || 0) >= 45) return 0.78;
  return 1;
}

function expressionForOrganism(baseExpression, environmentType, natalProfile, historicalResponse) {
  const archetype = String(natalProfile?.natalArchetype || "").toLowerCase();
  const chaos = historicalResponse?.chaosFactor || 0;

  if (environmentType === "Chaotic Transition") {
    if (archetype.includes("saturnian") || archetype.includes("structural")) {
      return "Controlled Compression";
    }
    if (archetype.includes("rahu") || archetype.includes("narrative")) {
      return "Speculative Heat";
    }
    if (archetype.includes("moon")) {
      return "Sentiment Volatility";
    }
    if (chaos >= 70) {
      return "Chaotic Transition";
    }
    return "RALLY WITH CHURN — protect strength";
  }

  return baseExpression;
}

function calibrateHistoricalSimilarity({
  clusterDensity,
  overlapIntensity,
  hasRahu,
  hasEclipse,
  hasSaturn,
  environmentType,
  natalProfile
}) {
  const overlapFamilies = Object.keys(overlapIntensity || {}).length;
  let raw =
    Math.min(28, clusterDensity * 4.2) +
    Math.min(18, overlapFamilies * 5.5) +
    (hasRahu ? 12 : 0) +
    (hasEclipse ? 12 : 0) +
    (hasSaturn ? 8 : 0);

  const archetype = String(natalProfile?.natalArchetype || "").toLowerCase();
  if (archetype.includes("rahu") && hasRahu) raw += 6;
  if (archetype.includes("saturnian") && hasSaturn) raw += 5;
  if (environmentType === "Chaotic Transition") raw += 4;

  // 95+ should be reserved for explicit replay matches, not generic live-environment similarity.
  return Math.round(clamp(42 + raw * 0.72, 0, 92));
}

function validationChecklist(replay) {
  const expression = replay?.historicalResponse?.expressionType || replay?.environmentType || "Mixed";

  let expected = "Observe whether price confirms or rejects the astro environment.";
  if (String(expression).includes("Bullish Tug")) {
    expected = "Expect back-and-forth movement with attempts to lead; confirmation requires follow-through after pressure pockets.";
  } else if (String(expression).includes("Compression")) {
    expected = "Expect range/chop or pressure first; later repair matters more than immediate strength.";
  } else if (String(expression).includes("Speculative") || String(expression).includes("Fragile")) {
    expected = "Expect sharp moves, quick reversals, and sensitivity to narrative/catalyst timing.";
  } else if (String(expression).includes("Orderly")) {
    expected = "Expect steadier persistence, shallower volatility, and cleaner repair after pressure.";
  }

  return {
    status: "Pending chart validation",
    predictedState: expression,
    whatToCheck: [
      "Did price trend, chop, or correct after the replay date?",
      "Did volatility rise during the highlighted catalyst/shadow window?",
      "Did the stock show repair after pressure, or did pressure deepen?",
      "Was the signal early, late, matched, or failed?",
      "Compare against the broader macro astro environment at the same date before judging the stock-specific response."
    ],
    expectedChartBehaviour: expected
  };
}

export function calculateTransitResonance(natal, transitData = {}) {
  const state = {
    expansion: 50,
    pressure: 50,
    rawExpansion: 50,
    rawPressure: 50,
    familyCounts: {}
  };

  const why = {
    jupiterSupport: [],
    saturnPressure: [],
    rahuCatalysts: [],
    ketuSignals: [],
    eclipseHits: []
  };

  const seen = {
    jupiter: new Set(),
    saturn: new Set(),
    rahu: new Set(),
    ketu: new Set(),
    eclipse: new Set()
  };

  const activeClusters = [];
  const transitDetails = [];
  const overlapIntensity = {};
  const planetEntries = getPlanetEntries(natal);
  const natalProfile = buildNatalProfileFallback(natal);
  const natalTemperament = buildNatalTemperament(natalProfile);

  function processTransit(transitType, transitDegree) {
    if (typeof transitDegree !== "number" || !Number.isFinite(transitDegree)) {
      return;
    }

    for (const [targetPlanet, natalDegree] of planetEntries) {
      const scored = scoreTransit(transitDegree, natalDegree, transitType);

      if (!scored) {
        continue;
      }

      const adjustedScore = addCalibratedScore(
        state,
        scored.score,
        signalFamily(transitType, targetPlanet)
      );
      trackOverlap(overlapIntensity, targetPlanet);

      transitDetails.push({
        planet: TRANSIT_LABEL[transitType] || transitType,
        targetPlanet,
        aspect: scored.aspect,
        orb: scored.orb,
        angle: scored.angle,
        score: Number(adjustedScore.toFixed(2)),
        rawScore: Number(scored.score.toFixed(2)),
        transitDegree: Number(normalizeDegree(transitDegree).toFixed(2)),
        natalDegree: Number(normalizeDegree(natalDegree).toFixed(2)),
        transitSign: getSign(transitDegree)
      });

      const reason = `${TRANSIT_LABEL[transitType]} ${scored.aspect} ${targetPlanet}`;

      if (transitType === "jupiter") {
        pushUnique(why.jupiterSupport, seen.jupiter, reason);
      }

      if (transitType === "saturn") {
        pushUnique(why.saturnPressure, seen.saturn, reason);
      }

      if (transitType === "rahu") {
        pushUnique(why.rahuCatalysts, seen.rahu, reason);
      }

      if (transitType === "ketu") {
        pushUnique(why.ketuSignals, seen.ketu, reason);
      }
    }
  }

  processTransit("jupiter", transitData.jupiter);
  processTransit("saturn", transitData.saturn);
  processTransit("rahu", transitData.rahu);
  processTransit("ketu", transitData.ketu);

  const eclipseHits = Array.isArray(transitData.eclipseHits)
    ? transitData.eclipseHits
    : [];

  for (const hit of eclipseHits) {
    const signalStrength = Number(hit.signalStrength || 0);
    const targetPlanet = hit.natalPlanet || hit.targetPlanet;

    const adjustedScore = addCalibratedScore(
      state,
      signalStrength,
      "eclipse",
      { shadow: Math.abs(Number(hit.daysFromReference || 0)) > 3 }
    );
    trackOverlap(overlapIntensity, targetPlanet);

    transitDetails.push({
      planet: "Eclipse",
      type: hit.eclipseType,
      kind: hit.eclipseKind,
      eclipseDate: hit.eclipseDate,
      daysFromReference: hit.daysFromReference,
      targetPlanet,
      aspect: hit.aspect,
      orb: hit.orb,
      score: Number(adjustedScore.toFixed(2)),
      rawScore: signalStrength,
      transitDegree: hit.eclipseDegree,
      natalDegree: hit.natalDegree,
      transitSign: hit.eclipseSign,
      severity: hit.severity
    });

    pushUnique(
      why.eclipseHits,
      seen.eclipse,
      `${hit.eclipseType || "Eclipse"} eclipse ${hit.aspect} ${targetPlanet}`
    );
  }

  const hasJupiter = why.jupiterSupport.length > 0;
  const hasSaturn = why.saturnPressure.length > 0;
  const hasRahu = why.rahuCatalysts.length > 0;
  const hasKetu = why.ketuSignals.length > 0;
  const hasEclipse = why.eclipseHits.length > 0;

  if (hasJupiter && hasRahu) {
    activeClusters.push("Jupiter + Rahu");
  }

  if (hasJupiter && hasEclipse) {
    activeClusters.push("Jupiter + Eclipse");
  }

  if (hasRahu && hasEclipse) {
    activeClusters.push("Rahu + Eclipse");
  }

  if (hasSaturn && hasEclipse) {
    activeClusters.push("Saturn + Eclipse");
  }

  if (hasJupiter && hasSaturn) {
    activeClusters.push("Jupiter + Saturn");
  }

  if (hasSaturn && hasRahu) {
    activeClusters.push("Saturn + Rahu");
  }

  if (hasJupiter && hasRahu && hasEclipse) {
    activeClusters.push("Jupiter + Rahu + Eclipse");
  }

  if (hasSaturn && hasRahu && hasEclipse) {
    activeClusters.push("Saturn + Rahu + Eclipse");
  }

  const clusterDensity = transitDetails.length;

  const shadowWindows = {
    eclipse: hasEclipse,
    saturn: hasSaturn,
    rahu: hasRahu
  };

  const heavyOverlap = Object.entries(overlapIntensity)
    .filter(([, count]) => count >= 2)
    .map(([planet]) => planet);

  const signatureParts = [
    hasJupiter ? "Jupiter" : null,
    hasSaturn ? "Saturn" : null,
    hasRahu ? "Rahu" : null,
    hasKetu ? "Ketu" : null,
    hasEclipse ? "Eclipse" : null
  ].filter(Boolean);

  let environmentSignature = signatureParts.length
    ? signatureParts.join("-")
    : "Quiet Sky";

  if (heavyOverlap.length) {
    environmentSignature += ` / overlap: ${heavyOverlap.join(", ")}`;
  }

  const overlapCount = Object.values(overlapIntensity)
    .reduce((sum, value) => sum + value, 0);

  const rawExpansion = state.rawExpansion;
  const rawPressure = state.rawPressure;
  const expansion = compressScore(state.expansion);
  const pressure = compressScore(state.pressure);
  const conflictDrag = Math.max(0, Math.min(expansion, pressure) - 55) * 0.28;
  const leadership = clamp(expansion - pressure + 50 - conflictDrag, 0, 100);

  const complexityRaw =
    clusterDensity * 5.2 +
    overlapCount * 3.4 +
    (hasRahu ? 10 : 0) +
    (hasEclipse ? 12 : 0) +
    (hasSaturn ? 7 : 0);

  const environmentComplexity = Math.round(
    clamp(100 * (1 - Math.exp(-complexityRaw / 72)), 0, 96)
  );

  const moon = moonClimate(transitData.moon);
  const moonModifier = moonBehaviourModifier(moon.moonEnvironment);
  const volatilityModifier = temperamentVolatilityModifier(natalProfile, natalTemperament);
  const volatilityRaw =
    ((hasRahu ? 22 : 0) +
      (hasEclipse ? 24 : 0) +
      (hasSaturn ? 14 : 0) +
      overlapCount * 2.8) * volatilityModifier * moonModifier.volatility;

  const environmentVolatility = Math.round(
    clamp(100 * (1 - Math.exp(-volatilityRaw / 70)), 0, 98)
  );

  const structuralPressureScore = Math.round(clamp(
    (hasSaturn ? 34 : 0) +
      (hasKetu ? 16 : 0) +
      (hasEclipse ? 28 : 0) +
      Math.max(0, pressure - expansion) * 0.35,
    0,
    100
  ));

  const volatilePressureScore = Math.round(clamp(
    (hasRahu ? 28 : 0) +
      (hasEclipse ? 18 : 0) +
      environmentVolatility * 0.45 +
      (moon.moonEnvironment === "Aggressive" ? 10 : 0) +
      (moon.moonEnvironment === "Emotional" ? 8 : 0),
    0,
    100
  ));

  let environmentType = "Mixed";

  if (environmentVolatility < 25 && !hasSaturn) {
    environmentType = "Calm";
  } else if (hasJupiter && !hasSaturn && !hasRahu) {
    environmentType = "Expansion";
  } else if (hasSaturn && !hasRahu && !hasEclipse) {
    environmentType = "Pressure";
  } else if (hasRahu && hasEclipse) {
    environmentType = "Speculative / Inflection Cluster";
  } else if (hasSaturn && hasRahu) {
    environmentType = "Chaotic Transition";
  } else if (clusterDensity >= 5) {
    environmentType = "Crowded Sky";
  }

  const environmentConflict = conflictState(expansion, pressure, environmentType);

  let regime = "Transition";

  if (expansion >= pressure + 12) {
    regime = "Expansion";
  } else if (pressure >= expansion + 12) {
    regime = "Pressure";
  } else if (clusterDensity >= 3) {
    regime = "Compression";
  }

  let conviction = "Neutral";

  if (leadership >= 80) {
    conviction = "Strong";
  } else if (leadership >= 60) {
    conviction = "Positive";
  } else if (leadership < 40) {
    conviction = "Weak";
  }

  if (pressure > 60 && expansion > 60) {
    conviction = conviction === "Strong" ? "Positive" : conviction === "Positive" ? "Neutral" : conviction;
  }

  const resonanceProfile = {
    speculativeSupport: clamp(
      natalTemperament.speculativeBias * 0.6 +
        (environmentType.includes("Speculative") ? 35 : 0) +
        (moon.moonEnvironment === "Narrative" ? 10 : 0) * moonModifier.narrative,
      0,
      100
    ),
    stabilitySupport: clamp(
      natalTemperament.stabilityBias * 0.7 +
        (environmentType === "Calm" ? 25 : 0) +
        (moon.moonEnvironment === "Practical" ? 10 : 0) * moonModifier.stability,
      0,
      100
    ),
    aggressionFit: clamp(
      natalTemperament.fireBias * 0.7 +
        (moon.moonEnvironment === "Aggressive" ? 20 : 0) +
        (hasJupiter ? 15 : 0),
      0,
      100
    ),
    pressureTolerance: clamp(
      natalTemperament.saturnTolerance * 0.7 +
        (hasSaturn ? 15 : 0),
      0,
      100
    )
  };

  resonanceProfile.environmentFit = Math.round(
    (
      resonanceProfile.speculativeSupport +
      resonanceProfile.stabilitySupport +
      resonanceProfile.aggressionFit
    ) / 3
  );

  let likelyBehaviour = "Mixed Signals";

  if (resonanceProfile.speculativeSupport > 80) {
    likelyBehaviour = "Narrative Mania";
  } else if (resonanceProfile.aggressionFit > 75) {
    likelyBehaviour = "Momentum Expansion";
  } else if (resonanceProfile.stabilitySupport > 75) {
    likelyBehaviour = "Stable Growth";
  } else if (hasSaturn && resonanceProfile.pressureTolerance < 45) {
    likelyBehaviour = "Pressure / Contraction";
  } else if (hasRahu) {
    likelyBehaviour = "Chaotic Opportunity";
  }

  resonanceProfile.likelyBehaviour = likelyBehaviour;

  const historicalResponse = {
    observedSaturnStrength: Math.round(
      resonanceProfile.pressureTolerance * 0.6 +
        natalTemperament.saturnTolerance * 0.4
    ),
    trendPersistence: Math.round(
      resonanceProfile.stabilitySupport * 0.45 +
        resonanceProfile.aggressionFit * 0.35 +
        natalTemperament.jupiterAffinity * 0.2
    ),
    chaosFactor: Math.round(
      clamp(
        natalTemperament.rahuAffinity * 0.45 +
          environmentVolatility * 0.42 +
          (environmentConflict.includes("Tug") ? 7 : 0),
        0,
        100
      )
    )
  };

  let expressionType = "Balanced";

  if (
    historicalResponse.trendPersistence >= 55 &&
    historicalResponse.observedSaturnStrength >= 45 &&
    historicalResponse.chaosFactor < 45
  ) {
    expressionType = "Orderly Compounder";
  } else if (
    historicalResponse.trendPersistence >= 45 &&
    historicalResponse.chaosFactor <= 65
  ) {
    expressionType = "VOLATILE UPSIDE — stagger entry";
  } else if (
    historicalResponse.observedSaturnStrength >= 55 &&
    historicalResponse.trendPersistence >= 35
  ) {
    expressionType = "HOLD CORE — repair underway";
  } else if (
    historicalResponse.chaosFactor >= 60 &&
    historicalResponse.trendPersistence < 50
  ) {
    expressionType = "Chaotic Trender";
  } else {
    expressionType = "WEAK RERATING — do not chase";
  }

  historicalResponse.baseExpressionType = expressionType;
  historicalResponse.expressionType = expressionForOrganism(
    expressionType,
    environmentType,
    natalProfile,
    historicalResponse
  );

  const historicalFingerprint = [
    environmentSignature,
    environmentType,
    environmentConflict,
    clusterDensity,
    Object.keys(overlapIntensity).sort().join("-")
  ].join("|");

  const historicalSimilarity = calibrateHistoricalSimilarity({
    clusterDensity,
    overlapIntensity,
    hasRahu,
    hasEclipse,
    hasSaturn,
    environmentType,
    environmentConflict,
    natalProfile
  });

  const volatilityCategory = categorizeVolatility(environmentVolatility);
  const multibaggerProbability = categorizeMultibagger(
    leadership,
    environmentVolatility,
    natalTemperament
  );
  const phaseFitValue = phaseFit(
    leadership,
    environmentVolatility,
    pressure,
    natalTemperament
  );
  const rotationRiskValue = rotationRisk(
    pressure,
    environmentVolatility,
    activeClusters,
    multibaggerProbability
  );

  const finAstroGrammar = evaluateFinAstroGrammar({
    symbol: natal?.metadata?.symbol,
    ticker: natal?.metadata?.symbol,
    companyName: natal?.metadata?.companyName,
    natalArchetype: natalProfile?.natalArchetype,
    pressureScore: Math.round(pressure),
    expansionScore: Math.round(expansion),
    leadershipProbability: Math.round(leadership),
    regime,
    environmentType,
    environmentSignature,
    catalystWindow: hasEclipse
      ? "Active eclipse shadow"
      : activeClusters.length
        ? activeClusters[0]
        : "No major catalyst cluster",
    transitDetails
  });

  return {
    regime,
    currentRegime: regime,
    expansionScore: Math.round(expansion),
    pressureScore: Math.round(pressure),
    rawExpansionScore: Math.round(rawExpansion),
    rawPressureScore: Math.round(rawPressure),
    calibratedExpansionScore: Math.round(expansion),
    calibratedPressureScore: Math.round(pressure),
    leadershipProbability: Math.round(leadership),
    multibaggerProbability,
    volatility: volatilityCategory,
    catalystWindow: hasEclipse
      ? "Active eclipse shadow"
      : activeClusters.length
        ? activeClusters[0]
        : "No major catalyst cluster",
    rotationRisk: rotationRiskValue,
    conviction,
    phaseFit: phaseFitValue,
    view2026_2028: buildReadableView(
      regime,
      multibaggerProbability,
      rotationRiskValue,
      phaseFitValue
    ),
    activeClusters,
    clusterDensity,
    overlapIntensity,
    shadowWindows,
    environmentSignature,
    environmentComplexity,
    environmentVolatility,
    structuralPressureScore,
    volatilePressureScore,
    environmentType,
    environmentConflict,
    transitMoonSign: moon.transitMoonSign,
    moonEnvironment: moon.moonEnvironment,
    historicalFingerprint,
    historicalSimilarity,
    natalProfile,
    natalTemperament,
    resonanceProfile,
    historicalResponse,
    calibrationNotes: {
      method: "v28.0 calibration engine",
      pressureSplit: "structuralPressureScore and volatilePressureScore are separated",
      moonModifier: moonModifier.label,
      diminishingReturns: true,
      shadowWeighting: "25-35% via context weighting",
      historicalSimilarityCap: 92,
      preservesConflictingSignals: true,
      note: "Historical response is interpreted only with the wider macro environment and natal temperament, not as same-sky-equals-same-outcome."
    },
    replayValidation: validationChecklist({ historicalResponse, environmentType }),
    finAstroGrammar,
    grammarSignal: finAstroGrammar.signal,
    grammarActionBias: finAstroGrammar.actionBias,
    grammarPressureKind: finAstroGrammar.pressure?.pressureKind,
    grammarPressureRole: finAstroGrammar.pressure?.pressureRole,
    transitDetails,
    why
  };
}

export default calculateTransitResonance;
