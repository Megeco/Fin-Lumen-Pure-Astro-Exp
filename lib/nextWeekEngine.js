export function getNextWeekSignal({
  astro_window,
  pmp,
  momentum_state
}) {

  // Strong bullish continuation forming
  if (
    astro_window === "OPEN" &&
    pmp === "HIGH" &&
    momentum_state === "EXPANDING"
  ) {
    return "BULLISH EXPANSION";
  }

  // Early bullish build-up
  if (
    astro_window === "NEUTRAL" &&
    momentum_state === "BUILDING"
  ) {
    return "BUILDING BULLISH";
  }

  // Weakening structure
  if (
    astro_window === "CLOSED" &&
    momentum_state === "WEAKENING"
  ) {
    return "BUILDING BEARISH";
  }

  // Breakdown risk
  if (
    astro_window === "CLOSED" &&
    pmp === "LOW"
  ) {
    return "BEARISH PRESSURE";
  }

  return "STABLE";
}
