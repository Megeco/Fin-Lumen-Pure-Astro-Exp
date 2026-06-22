// Fin-Lumen v29.1
// Rulebook-aligned astro scoring.
// Pressure is no longer treated as automatically bearish. Structural pressure,
// volatile pressure, expansion, and stock personality are scored separately.

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function levelToScore(level, type = "pressure") {
  const text = String(level || "").toUpperCase();
  if (type === "expansion") {
    if (text === "IGNITION") return 80;
    if (text === "STRONG") return 70;
    if (text === "MODERATE") return 50;
    if (text === "WEAK") return 25;
    return 0;
  }
  if (text === "EXTREME") return 85;
  if (text === "HIGH") return 70;
  if (text === "MEDIUM") return 50;
  if (text === "LOW") return 25;
  return 0;
}

function stockPersonality(stock = {}) {
  return String(
    stock?.structural_cycle ||
    stock?.personality ||
    stock?.sectorPersonality ||
    stock?.sector ||
    ""
  ).toUpperCase();
}

export function getAstroEnvironmentScore(
  stock = {},
  environment = {},
  sensitivity = {}
) {
  const expansion = n(
    environment?.expansionScore ??
    environment?.expansionSupport ??
    levelToScore(environment?.expansionLevel, "expansion")
  );

  const pressure = n(
    environment?.pressureScore ??
    levelToScore(environment?.pressureLevel, "pressure")
  );

  const structuralPressure = n(
    environment?.structuralPressure ??
    environment?.structuralPressureScore ??
    pressure * 0.6
  );

  const volatilePressure = n(
    environment?.volatilePressure ??
    environment?.volatilePressureScore ??
    pressure * 0.4
  );

  const cycle = stockPersonality(stock);

  let score = 5;

  // Expansion helps.
  score += expansion * 0.04;

  // Structural pressure hurts, but less brutally than the old engine.
  score -= structuralPressure * 0.025;

  // Volatile pressure is conditional. Narrative/growth/structural leaders and
  // market-infrastructure style names can still lead through constructive chaos.
  const isNarrative = [
    "SUPER CYCLE LEADER",
    "STRUCTURAL LEADER",
    "NARRATIVE",
    "NARRATIVE-GROWTH",
    "TECH",
    "TECH / NARRATIVE",
    "MARKET INFRASTRUCTURE",
    "EXCHANGE",
    "FINANCIAL PLUMBING",
    "INSTITUTIONAL + MOMENTUM HYBRID"
  ].some(label => cycle.includes(label));

  if (volatilePressure > 0) {
    score += isNarrative
      ? volatilePressure * 0.01
      : -volatilePressure * 0.015;
  }

  // Conflict reduces cleanliness/confidence, not direction.
  if (expansion >= 65 && pressure >= 60) {
    score -= 0.5;
  }

  // Strong expansion with contained pressure deserves a visible lift.
  if (expansion >= 70 && pressure <= 65) {
    score += 1;
  }

  // Hard structural pressure still matters when expansion is weak.
  if (structuralPressure >= 70 && expansion < 60) {
    score -= 1.5;
  }

  const pressureSensitivity = String(sensitivity?.pressureLevel || "").toUpperCase();
  if (pressureSensitivity === "LOW") score += 0.4;
  if (pressureSensitivity === "HIGH" && structuralPressure >= 60) score -= 0.4;

  score = Math.max(1, Math.min(10, score));
  score = Number(score.toFixed(1));

  const breakdown = {
    expansion: Number((expansion * 0.04).toFixed(2)),
    structuralPressure: Number((-structuralPressure * 0.025).toFixed(2)),
    volatilePressure: Number((isNarrative ? volatilePressure * 0.01 : -volatilePressure * 0.015).toFixed(2)),
    conflict: expansion >= 65 && pressure >= 60 ? -0.5 : 0,
    strongExpansion: expansion >= 70 && pressure <= 65 ? 1 : 0,
    hardPressure: structuralPressure >= 70 && expansion < 60 ? -1.5 : 0,
    personality: isNarrative ? "pressure_tolerant" : "normal_pressure_tolerance"
  };

  let explanation = "Balanced astro setup.";
  if (score >= 7.5) {
    explanation = "Constructive expansion environment; use normal risk discipline.";
  } else if (score >= 6) {
    explanation = "Usable setup; pressure is present but not automatically disqualifying.";
  } else if (score >= 4.5) {
    explanation = "Mixed setup; require window timing and pressure typing before action.";
  } else {
    explanation = "Weak setup; pressure or durability issues dominate unless a clearer window appears.";
  }

  return {
    score,
    breakdown,
    explanation,
    calibrationBasis: "astro_score_rulebook_v29_1"
  };
}

export default getAstroEnvironmentScore;
