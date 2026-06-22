export function getCompanyNatalProfile(
  stock
) {
  const cycle =
    stock?.structural_cycle ||
    "STRUCTURAL LEADER";

  const pressure =
    stock?.current_pressure ||
    "LOW";

  // Existing stocks still work
  // New stocks get defaults

  return {
    structural_cycle:
      cycle,

    pressure_level:
      pressure,

    expected_behaviour:
      stock?.expected_behaviour ||
      "Temporary pressure phase",

    next_event:
      stock?.next_event ||
      "Post-Crisis Stabilisation",

    expansion_phase:
      stock?.expansion_phase ||
      "Recovery Phase",

    next_ignition:
      stock?.next_ignition ||
      "9 Days"
  };
}
