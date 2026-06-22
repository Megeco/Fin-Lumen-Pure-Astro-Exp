export function adjustAction(
  stock
) {

  const structuralCycle =
    stock
      .structural_cycle ||
    "";

  const pressureLevel =
    stock
      .pressureLevel ||
    "LOW";

  // ==========================
  // EXIT CYCLE
  // ==========================

  if (
    structuralCycle ===
    "EXIT CYCLE"
  ) {

    return "EXIT STRENGTH";
  }

  // ==========================
  // ROTATIONAL
  // ==========================

  if (
    structuralCycle ===
    "ROTATIONAL"
  ) {

    if (
      pressureLevel ===
      "HIGH"
    ) {

      return "HEAVY TRIM";
    }

    return "TRIM SATELLITE";
  }

  // ==========================
  // SUPER CYCLE
  // ==========================

  if (
    structuralCycle ===
    "SUPER CYCLE LEADER"
  ) {

    if (
      pressureLevel ===
      "HIGH"
    ) {

      return "WATCH CLOSELY";
    }

    return "HOLD CORE";
  }

  // ==========================
  // STRUCTURAL LEADER
  // ==========================

  if (
    structuralCycle ===
    "STRUCTURAL LEADER"
  ) {

    if (
      pressureLevel ===
      "HIGH"
    ) {

      return "TRIM SATELLITE";
    }

    return "WATCH CLOSELY";
  }

  return "WATCH CLOSELY";
}
