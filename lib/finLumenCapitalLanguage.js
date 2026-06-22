const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export const TRM_BLOCK_FRESH_CLASSES = new Set([
  "PRESSURE_EXPRESSION",
  "NON_RESPONSIVE_OR_ROTATION_AWAY",
  "WEAK_OR_NON_RESPONSIVE",
  "WEAK_OR_BACKGROUND",
  "PRESSURE_OR_ROTATION_AWAY"
]);

export const TRM_MUTED_CLASSES = new Set([
  "SUPPORTIVE_BUT_MUTED",
  "WEAK_OR_BACKGROUND"
]);

export const TRM_CONTESTED_CLASSES = new Set([
  "CONTESTED_EXPANSION"
]);

export function trmScore(transitReceptorFit, key, fallback = 0) {
  return n(transitReceptorFit?.scores?.[key], fallback);
}

export function trmComponent(transitReceptorFit, key) {
  return transitReceptorFit?.components?.[key] || null;
}

export function trmReading(transitReceptorFit) {
  return transitReceptorFit?.reading || transitReceptorFit?.interpretation || "";
}

export function trmExpressionScore(transitReceptorFit, fallback = 0) {
  return trmScore(transitReceptorFit, "expressionScore", fallback);
}

export function trmNatalReliability(transitReceptorFit, fallback = 0) {
  return trmScore(transitReceptorFit, "natalReliability", fallback);
}

export function softenCapitalVerdict(verdict = "") {
  const raw = String(verdict || "").trim();
  const upper = raw.toUpperCase();

  if (!upper) return "Observe; insufficient evidence for allocation language.";
  if (upper.includes("NO FRESH ENTRY")) return "Fresh allocation not favoured; protect/observe.";
  if (upper.includes("AVOID FRESH STRATEGIC CAPITAL")) return "Fresh strategic allocation not favoured.";
  if (upper.includes("BLOCK FRESH")) return "Fresh allocation blocked by receptor/cycle risk.";
  if (upper.includes("NO — NOT PASSIVE")) return "Not suitable for passive long-term capital at this window.";
  if (upper.includes("NO — DORMANCY") || upper.includes("DE-RATING")) return "Passive capital restraint; dormancy/de-rating risk.";
  if (upper.includes("HOLD / WAIT")) return "Hold or wait; supportive but not leadership-grade.";
  if (upper.includes("HOLD / PROTECT")) return "Hold only with capital-protection discipline.";
  if (upper.includes("HOLD / PART")) return "Selective participation only.";
  if (upper.includes("TACTICAL ONLY")) return "Tactical-only participation; avoid converting into strategic capital.";
  if (upper.includes("CONDITIONAL — PROTECTION")) return "Conditional allocation; review/protect before the mapped pressure date.";
  if (upper.includes("CONDITIONAL — COMPANY")) return "Conditional allocation; company-specific trigger required.";
  if (upper.includes("CONDITIONAL BUILD")) return "Gradual foundation-building conditions.";
  if (upper.includes("CONDITIONAL")) return "Conditional allocation; evidence is mixed or incomplete.";
  if (upper.includes("PART-SIZED") || upper.includes("SELECTIVE")) return "Selective participation only.";
  if (upper.includes("YES — BUILD") || upper.includes("BUILD / HOLD")) return "Build/hold conditions supportive.";
  if (upper.includes("YES — LONGER")) return "Longer runway visible, subject to periodic review.";
  if (upper.includes("WAIT")) return "Wait for cycle confirmation.";
  if (upper.includes("PROTECT")) return "Capital-protection posture.";
  if (upper.includes("HOLD")) return "Hold conditions only.";
  return raw;
}

export function allocationPosture(capitalHorizon = {}) {
  const strategic = String(capitalHorizon?.strategic?.verdict || "").toUpperCase();
  const tactical = String(capitalHorizon?.tactical?.verdict || "").toUpperCase();
  const passive = String(capitalHorizon?.passiveLongTerm?.verdict || "").toUpperCase();

  if (strategic.includes("YES") && !passive.includes("NO")) return "Strategic allocation supportive";
  if (tactical.includes("PART") || tactical.includes("SELECTIVE")) return "Selective participation";
  if (strategic.includes("CONDITIONAL")) return "Conditional allocation";
  if (strategic.includes("NO") || strategic.includes("AVOID") || passive.includes("NO")) return "Capital restraint";
  if (tactical.includes("PROTECT") || tactical.includes("NO FRESH")) return "Capital-protection posture";
  return "Observe / unresolved";
}

export default {
  TRM_BLOCK_FRESH_CLASSES,
  TRM_MUTED_CLASSES,
  TRM_CONTESTED_CLASSES,
  trmScore,
  trmComponent,
  trmReading,
  trmExpressionScore,
  trmNatalReliability,
  softenCapitalVerdict,
  allocationPosture
};
