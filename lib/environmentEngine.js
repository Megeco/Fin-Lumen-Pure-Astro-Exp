function textOf(value) {
  return String(value || "").toLowerCase();
}

function hasAny(text, items) {
  return items.some(item => text.includes(item));
}

function classifyAspectTone(text) {
  if (hasAny(text, ["trine", "sextile", "support", "soft"])) return "soft";
  if (hasAny(text, ["square", "opposition", "hard", "conjunction"])) return "hard";
  return "mixed";
}

function levelFromScore(score, thresholds, labels) {
  if (score >= thresholds[2]) return labels[2];
  if (score >= thresholds[1]) return labels[1];
  if (score >= thresholds[0]) return labels[0];
  return labels[3];
}

export function calculateEnvironment(currentEvent = {}) {
  const drivers = textOf(currentEvent?.drivers || currentEvent?.label || currentEvent?.notes || "");
  const tone = classifyAspectTone(drivers);

  let structuralPressure = 0;
  let structuralStability = 0;
  let volatilePressure = 0;
  let expansionSupport = 0;
  let durabilitySupport = 0;
  let breakRisk = 0;
  let dormancyRisk = 0;

  // Saturn is no longer treated as automatic danger. A soft Saturn aspect
  // is digestive/stabilising pressure unless a hard cluster overrides it.
  if (drivers.includes("saturn")) {
    if (tone === "soft") {
      structuralStability += 5;
      durabilitySupport += 4;
      dormancyRisk += 1;
    } else if (tone === "hard") {
      structuralPressure += 3;
      durabilitySupport += 1;
      dormancyRisk += 2;
    } else {
      structuralPressure += 1;
      structuralStability += 2;
    }
  }

  if (drivers.includes("jupiter")) {
    if (tone === "hard") {
      expansionSupport += 2;
      volatilePressure += 1;
    } else {
      expansionSupport += 4;
      durabilitySupport += drivers.includes("saturn") ? 2 : 1;
    }
  }

  if (drivers.includes("venus")) {
    expansionSupport += tone === "hard" ? 1 : 2;
  }

  if (drivers.includes("mercury")) {
    expansionSupport += tone === "hard" ? 1 : 2;
    volatilePressure += tone === "hard" ? 1 : 0;
  }

  if (drivers.includes("mars")) {
    volatilePressure += tone === "soft" ? 2 : 3;
    if (drivers.includes("saturn") && tone === "soft") {
      structuralStability += 2;
      durabilitySupport += 1;
    }
  }

  if (drivers.includes("rahu")) {
    volatilePressure += 3;
    expansionSupport += drivers.includes("jupiter") ? 2 : 1;
  }

  if (drivers.includes("ketu")) {
    structuralPressure += 2;
    dormancyRisk += 2;
  }

  if (drivers.includes("pluto")) {
    structuralPressure += 4;
    volatilePressure += 2;
  }

  if (drivers.includes("eclipse")) {
    volatilePressure += 2;
    if (tone === "hard" || hasAny(drivers, ["opposition", "square", "conjunction"])) {
      structuralPressure += 3;
      breakRisk += 3;
    } else {
      expansionSupport += 1;
    }
  }

  // Contextual cluster conditions.
  if (drivers.includes("jupiter") && drivers.includes("venus")) {
    expansionSupport += 2;
  }

  if (drivers.includes("jupiter") && drivers.includes("rahu")) {
    expansionSupport += 2;
    volatilePressure += 2;
  }

  if (drivers.includes("saturn") && drivers.includes("rahu")) {
    structuralPressure += 2;
    volatilePressure += 2;
  }

  if (drivers.includes("mars") && drivers.includes("pluto")) {
    volatilePressure += 3;
    breakRisk += 2;
  }

  const pressureScore = Math.round(structuralPressure + volatilePressure + breakRisk);
  const expansionScore = Math.round(expansionSupport + structuralStability * 0.5 + durabilitySupport * 0.5);

  const pressureLevel = levelFromScore(
    pressureScore,
    [4, 9, 13],
    ["MEDIUM", "HIGH", "EXTREME", "LOW"]
  );

  const expansionLevel = levelFromScore(
    expansionScore,
    [4, 9, 13],
    ["MODERATE", "STRONG", "IGNITION", "WEAK"]
  );

  let environment = `${pressureLevel} PRESSURE / ${expansionLevel} EXPANSION`;
  if (structuralStability >= structuralPressure && expansionSupport >= 4) {
    environment = `DISCIPLINED ${expansionLevel} EXPANSION`;
  }
  if (breakRisk >= 5) {
    environment = `BREAK-RISK / ${expansionLevel} EXPANSION`;
  }

  let recommendation = "HOLD CORE — normal volatility";
  if (breakRisk >= 5 || (pressureLevel === "EXTREME" && expansionLevel === "WEAK")) {
    recommendation = "TRIM SATELLITE — protect excess";
  } else if (pressureLevel === "HIGH" && expansionLevel === "STRONG") {
    recommendation = "RALLY WITH CHURN — protect strength";
  } else if (pressureLevel === "LOW" && expansionLevel === "IGNITION") {
    recommendation = "ACCUMULATE — strong window active";
  } else if (expansionSupport >= 4 && structuralStability >= 3) {
    recommendation = "STAGGER ADD — disciplined window forming";
  }

  return {
    pressureScore,
    pressureLevel,
    expansionScore,
    expansionLevel,
    environment,
    recommendation,
    structuralPressure: Math.round(structuralPressure),
    structuralStability: Math.round(structuralStability),
    volatilePressure: Math.round(volatilePressure),
    expansionSupport: Math.round(expansionSupport),
    durabilitySupport: Math.round(durabilitySupport),
    breakRisk: Math.round(breakRisk),
    dormancyRisk: Math.round(dormancyRisk),
    conditionBasis: "condition_scoring_v29_1"
  };
}

export default calculateEnvironment;
