export function expansionProfileEngine({

  structural_cycle,
  current_pressure,
  next_ignition,
  pressure_response,
  ignition_speed

}) {

  // ====================================
  // DEFAULTS
  // ====================================

  let expected_drawdown =
    "0–10%";

  let recovery_window =
    "1–2 weeks";

  let expansion_quality =
    "MODERATE";

  let phase_risk =
    "LOW";

  let action =
    "HOLD CORE";

  // ====================================
  // WATCH CLOSELY
  // ====================================

  if (

    current_pressure ===
      "DISTRIBUTION" ||

    current_pressure ===
      "MANAGED PRESSURE"

  ) {

    expected_drawdown =
      "8–15%";

    recovery_window =
      "2–4 weeks";

    expansion_quality =
      "MODERATE";

    phase_risk =
      "MEDIUM";

    action =
      "WATCH CLOSELY";
  }

  // ====================================
  // HIGH DISTRIBUTION
  // ====================================

  if (
    current_pressure ===
    "HIGH DISTRIBUTION"
  ) {

    expected_drawdown =
      "15–25%";

    recovery_window =
      "4–8 weeks";

    expansion_quality =
      "STRONG";

    phase_risk =
      "HIGH";

    action =
      "TRIM SATELLITE";
  }

  // ====================================
  // SUPER CYCLE
  // ====================================

  if (
    structural_cycle ===
    "SUPER CYCLE LEADER"
  ) {

    expansion_quality =
      "EXPLOSIVE";

    if (
      current_pressure ===
      "HIGH DISTRIBUTION"
    ) {

      action =
        "TRIM SATELLITE";
    }

    else {

      action =
        "HOLD CORE";
    }
  }

  // ====================================
  // EXIT CYCLE
  // ====================================

  if (
    structural_cycle ===
    "EXIT CYCLE"
  ) {

    expected_drawdown =
      "35%+";

    recovery_window =
      "6–18 months";

    expansion_quality =
      "WEAK";

    phase_risk =
      "EXTREME";

    action =
      "EXIT STRENGTH";
  }

  // ====================================
// SUPER CYCLE OVERRIDE
// ====================================

if (

  (
    structural_cycle ===
      "SUPER CYCLE LEADER" ||

    structural_cycle ===
      "STRUCTURAL LEADER"
  ) &&

  ignition_speed ===
    "FAST" &&

  current_pressure ===
    "HIGH DISTRIBUTION"

) {

  expected_drawdown =
    "20–35%";

  recovery_window =
    "2–6 weeks";

  expansion_quality =
    "STRONG";

  phase_risk =
    "HIGH";

  action =
    "HEAVY TRIM";
}
  
  // ====================================
  // FAST IGNITION
  // ====================================

  if (
    ignition_speed ===
    "FAST"
  ) {

    recovery_window =
      "1–3 weeks";
  }

  // ====================================
  // SLOW IGNITION
  // ====================================

  if (
    ignition_speed ===
    "SLOW"
  ) {

    recovery_window =
      "2–6 months";

    if (
      phase_risk ===
      "HIGH"
    ) {

      action =
        "HEAVY TRIM";
    }
  }

  // ====================================
  // RETURN
  // ====================================

  return {

    expected_drawdown,

    recovery_window,

    expansion_quality,

    phase_risk,

    action

  };
}
