export function getAstroEntryWindow(
  stock,
  environment
) {

  const pressure =
    stock
      .pressureLevel ||
    "LOW";

  const expansion =
    stock
      .expansionLevel ||
    "WEAK";

  const ignition =
    stock
      .next_ignition ||
    "";

  // ==========================
  // DAYS
  // ==========================

  let days =
    ignition;

  if (
    !days
  ) {
    days =
      "7 Days";
  }

  // ==========================
  // HIGH PRESSURE
  // LOW EXPANSION
  // ==========================

  if (
    pressure ===
      "HIGH" &&
    expansion ===
      "WEAK"
  ) {

    return `WAIT FOR ~${days}`;
  }

  // ==========================
// SUPER CYCLE
// EARLY OPPORTUNITY
// ==========================

if (

  stock
    .structural_cycle ===
      "SUPER CYCLE LEADER" &&

  (
    expansion ===
      "MODERATE" ||

    expansion ===
      "STRONG"
  )

) {

  return `STAGGER ADD OVER ~${days}`;
}

// ==========================
// MEDIUM PRESSURE
// MODERATE EXPANSION
// ==========================

if (
  pressure ===
    "MEDIUM" &&

  (
    expansion ===
      "MODERATE" ||

    expansion ===
      "WEAK"
  )
) {

  return `SMALL ENTRY IN ~${days}`;
}

  // ==========================
  // HIGH PRESSURE
  // HIGH EXPANSION
  // ==========================

  if (

    (
      pressure ===
        "HIGH" ||

      pressure ===
        "MEDIUM"
    ) &&

    expansion ===
      "STRONG"

  ) {

    return `STAGGER ADD OVER ~${days}`;
  }

  // ==========================
  // LOW PRESSURE
  // STRONG EXPANSION
  // ==========================

  if (
    pressure ===
      "LOW" &&

    expansion ===
      "STRONG"
  ) {

    return `ACCUMULATE AFTER ~${days}`;
  }

  // ==========================
  // DEFAULT
  // ==========================

  return `WAIT FOR ~${days}`;
}
