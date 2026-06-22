export function getStockSensitivity(
  stock
) {

  let pressure = 0;
  let expansion = 0;

  const cycle =
    stock
      .structural_cycle ||
    "";

  const expansionPhase =
    stock
      .expansion_current ||
    "";

  const ignition =
    stock
      .next_ignition ||
    "";

  const behaviour =
    stock
      .expected_behaviour ||
    "";

  // ==========================
  // STRUCTURAL CYCLE
  // ==========================

  if (
    cycle ===
    "SUPER CYCLE LEADER"
  ) {

    pressure -= 2;
    expansion += 3;
  }

  else if (
    cycle ===
    "STRUCTURAL LEADER"
  ) {

    pressure -= 1;
    expansion += 2;
  }

  else if (
    cycle ===
    "ROTATIONAL"
  ) {

    pressure += 2;
    expansion -= 1;
  }

  else if (
    cycle ===
    "EXIT CYCLE"
  ) {

    pressure += 4;
    expansion -= 2;
  }

  // ==========================
  // EXPANSION STATE
  // ==========================

  if (
    expansionPhase ===
    "COMPRESSING"
  ) {

    pressure += 2;
  }

  if (
    expansionPhase ===
    "EXPANDING"
  ) {

    expansion += 2;
  }

  // ==========================
  // IGNITION TIMING
  // ==========================

  if (
    ignition.includes(
      "7 Days"
    )
  ) {

    expansion += 2;
  }

  else if (
    ignition.includes(
      "10 Days"
    )
  ) {

    expansion += 1;
  }

  // ==========================
  // EXPECTED BEHAVIOUR
  // ==========================

  if (
    behaviour.includes(
      "Pressure likely absorbed"
    )
  ) {

    pressure -= 2;
  }

  if (
    behaviour.includes(
      "Higher volatility likely"
    )
  ) {

    pressure += 2;
  }

  if (
    behaviour.includes(
      "Temporary pressure phase"
    )
  ) {

    pressure -= 1;
  }

  // ==========================
  // FINAL LEVELS
  // ==========================

  let pressureLevel =
    "LOW";

  if (
    pressure >= 6
  ) {
    pressureLevel =
      "HIGH";
  }

  else if (
    pressure >= 3
  ) {
    pressureLevel =
      "MEDIUM";
  }

  let expansionLevel =
    "WEAK";

  if (
    expansion >= 6
  ) {
    expansionLevel =
      "STRONG";
  }

  else if (
    expansion >= 3
  ) {
    expansionLevel =
      "MODERATE";
  }

  return {

    pressure,

    pressureLevel,

    expansion,

    expansionLevel
  };
}
