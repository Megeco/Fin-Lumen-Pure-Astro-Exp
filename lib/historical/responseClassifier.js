function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

export function classifyObservedResponse(metrics = {}, volatilityScale = 1) {
  const r30 = num(metrics.return30d), r90 = num(metrics.return90d), r180 = num(metrics.return180d);
  const g90 = num(metrics.maxGain90d), dd90 = Math.abs(num(metrics.maxDrawdown90d));
  const rel90 = num(metrics.relativeReturn90d);
  const v = Math.max(0.6, volatilityScale || 1);
  if (g90 >= 0.18 * v && r90 < 0 && dd90 >= 0.20 * v) return { classification: "blowoff-reversal", sequence: "initial-lift_then-break" };
  if (r90 >= 0.18 * v && dd90 <= 0.14 * v && rel90 >= 0) return { classification: "durable-expansion", sequence: "persistent-advance" };
  if (r30 >= 0.10 * v && Math.abs(r90) < 0.08 * v) return { classification: "tactical-lift", sequence: "lift_then-stall" };
  if (r90 <= -0.18 * v && dd90 >= 0.22 * v) return { classification: "structural-break", sequence: "decline_and_weak-recovery" };
  if (r90 < -0.08 * v && r180 > 0.08 * v) return { classification: "repair-after-pressure", sequence: "pressure_then-recovery" };
  if (Math.abs(r90) < 0.08 * v && Math.abs(rel90) < 0.06 * v) return { classification: "dormancy", sequence: "low-productivity-range" };
  if (r90 > 0 && dd90 >= 0.15 * v) return { classification: "rally-with-churn", sequence: "volatile-advance" };
  if (r90 > 0.08 * v) return { classification: "contested-expansion", sequence: "advance_with-friction" };
  if (r90 < -0.08 * v) return { classification: "compression", sequence: "persistent-pressure" };
  return { classification: "mixed", sequence: "no-clear-dominant-expression" };
}
