export function runMomentumEngine({
  astro_window,
  pressure_score,
  conviction,
  m_score
}) {

  // ========================================
  // DEFAULT
  // ========================================

  let momentum_state = "EXHAUSTED";
  let momentum_score = 0;

  // ========================================
  // EARLY IGNITION
  // ========================================

  if (
    astro_window === "OPEN" &&
    pressure_score === "STABLE" &&
    m_score >= 8 &&
    conviction === "HIGH CONVICTION"
  ) {
    momentum_state = "EARLY IGNITION";
    momentum_score = 9;
  }

  // ========================================
  // CONTROLLED EXPANSION
  // ========================================

  else if (
    astro_window === "OPEN" &&
    pressure_score === "STABLE" &&
    conviction === "STRONG"
  ) {
    momentum_state = "CONTROLLED EXPANSION";
    momentum_score = 6;
  }

  // ========================================
  // BASE BUILDING
  // ========================================

  else if (
    astro_window !== "CLOSED" &&
    pressure_score === "STABLE" &&
    m_score >= 4 &&
    m_score <= 6
  ) {
    momentum_state = "BASE BUILDING";
    momentum_score = 4;
  }

  // ========================================
  // EXTENDED
  // ========================================

  else if (
    astro_window === "OPEN" &&
    pressure_score === "BUILDING PRESSURE"
  ) {
    momentum_state = "EXTENDED";
    momentum_score = 7;
  }

  return {
    momentum_state,
    momentum_score
  };
}
