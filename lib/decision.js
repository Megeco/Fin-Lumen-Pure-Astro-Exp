// Fin-Lumen v29.1
// Rulebook-aligned action mapping. Danger no longer means automatic trim;
// expansion/pressure balance and hard break-risk context must agree.

export function getAction(
  atScore = 0,
  trend = "",
  dzScore = 0,
  expansion = 0,
  pressure = 0
) {
  const a = Number(atScore) || 0;
  const d = Number(dzScore) || 0;
  const e = Number(expansion) || 0;
  const p = Number(pressure) || 0;
  const t = String(trend || "").toUpperCase();

  // Hard break risk: only when danger is high and pressure exceeds expansion.
  if (d >= 8 && p > e) {
    return "HEAVY TRIM — protect capital";
  }

  // Expansion active: participate, with churn language if pressure is also high.
  if (e >= 70) {
    if (p >= 60) {
      return "RALLY WITH CHURN — participate carefully";
    }
    return "STAGGER ADD — early window forming";
  }

  // Old callers may not pass expansion/pressure. Preserve sensible behaviour.
  if (a >= 8 && t === "PEAKING" && d >= 7) {
    return "HOLD WINNER — protect only vertical excess";
  }

  if (a >= 5.5) {
    return "WATCH CLOSELY — trigger forming";
  }

  return "WATCHLIST ONLY — not deployable yet";
}

export default getAction;
