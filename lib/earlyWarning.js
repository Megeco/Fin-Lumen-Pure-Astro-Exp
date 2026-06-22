export function getEarlySignal(data) {

  const action = data.position_action;
  const window = data.astro_window;
  const pmp = data.pmp;

  // 🚀 STRONG UPSIDE
  if (action === "ADD" && window === "OPEN" && pmp === "HIGH") {
    return "BUY ALERT";
  }

  // 👀 EARLY UPSIDE BUILDUP
  if (
    action === "ADD" &&
    (window === "OPEN" || window === "NEUTRAL")
  ) {
    return "WATCH BUY";
  }

  // 🔻 STRONG DOWNSIDE
  if (action === "TRIM" && window === "CLOSED") {
    return "TRIM ALERT";
  }

  // 👀 EARLY DOWNSIDE BUILDUP
  if (
    action === "TRIM" &&
    (window === "NEUTRAL" || window === "CLOSED")
  ) {
    return "WATCH TRIM";
  }

  return "NONE";
}
