const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const lower = v => String(v || "").toLowerCase();
const dateOf = item => item?.date || item?.dateOnly || item?.windowDate || null;

function readingOf(replayValidationIntelligence = {}) {
  return replayValidationIntelligence.currentResearchReading || {};
}

function isMeaningfulRisk(row = {}) {
  const pressure = String(row?.pressure || "").toUpperCase();
  const breakLabel = String(row?.breakAssessment?.label || "").toUpperCase();
  const state = String(row?.episodeState || "").toUpperCase();
  if (breakLabel.startsWith("NO BREAK")) return false;
  if (/BREAK EVIDENCE PRESENT|MAJOR RESET|BREAK CANDIDATE|DE-RATING|TERMINATED/.test(breakLabel + " " + state)) return true;
  if (pressure.startsWith("HIGH") && !/NO BREAK/.test(breakLabel)) return true;
  if (/RESET RISK/.test(pressure) && !/NO BREAK/.test(breakLabel)) return true;
  return false;
}

function firstRiskFromTimeline(timeline = [], afterDate = null) {
  const pool = afterDate ? timeline.filter(row => String(row?.date || "") > String(afterDate)) : timeline;
  return pool.find(isMeaningfulRisk) || null;
}

function strongestAcceleration(timeline = []) {
  return timeline
    .filter(row => row?.accelerationPotential)
    .slice()
    .sort((a, b) => n(b?.accelerationPotential?.score) - n(a?.accelerationPotential?.score))[0] || null;
}

function confidenceFromInputs({ transitReceptorFit, replayValidationIntelligence }) {
  const trmScores = transitReceptorFit?.scores || {};
  const trmConfidence = n(trmScores.confidenceScore, null);
  let confidence = trmConfidence ?? 50;
  const disagreements = replayValidationIntelligence?.disagreements || [];
  confidence -= Math.min(18, disagreements.length * 3);
  const capital = readingOf(replayValidationIntelligence)?.capitalHorizon || {};
  if (capital?.strategic?.verdict === "YES" && capital?.tactical?.verdict === "YES") confidence += 4;
  if (capital?.strategic?.verdict === "NO" && capital?.passiveLongTerm?.verdict === "NO") confidence += 2;
  confidence = Math.round(Math.max(0, Math.min(100, confidence)));
  const label = confidence >= 75 ? "High" : confidence >= 60 ? "Medium-high" : confidence >= 45 ? "Medium" : confidence >= 30 ? "Low-medium" : "Low";
  return { score: confidence, label };
}

function currentState({ replay, transitReceptorFit, replayValidationIntelligence }) {
  const reading = readingOf(replayValidationIntelligence);
  const cls = transitReceptorFit?.expressionClass || null;
  const direction = reading.direction || (n(replay?.expansionScore, 50) >= n(replay?.pressureScore, 50) ? "UP-BIASED" : "PRESSURE-BIASED");
  const pressure = reading.pressure || "UNRESOLVED";
  const strategic = reading.strategicState || "UNRESOLVED";
  if (["PRESSURE_EXPRESSION", "NON_RESPONSIVE_OR_ROTATION_AWAY", "WEAK_OR_NON_RESPONSIVE"].includes(cls)) return `${cls.replaceAll("_", " ")} — ${pressure}`;
  if (cls === "RERATING_TRANSIT") return `RERATING TRANSIT — ${direction} / ${pressure}`;
  if (cls === "CONTESTED_EXPANSION") return `CONTESTED EXPANSION — ${direction} / ${pressure}`;
  if (strategic && strategic !== "UNRESOLVED") return `${strategic} — ${direction} / ${pressure}`;
  return `${direction} / ${pressure}`;
}

function whyBullets({ replay, transitReceptorFit, replayValidationIntelligence }) {
  const reading = readingOf(replayValidationIntelligence);
  const bullets = [];
  if (transitReceptorFit?.expressionLabel) bullets.push(`Transit receptor fit: ${transitReceptorFit.expressionLabel}.`);
  if (transitReceptorFit?.scores) {
    const s = transitReceptorFit.scores;
    bullets.push(`Expression ${n(s.expressionScore, 0)}/100, confidence ${n(s.confidenceScore, 0)}/100, natal reliability ${n(s.natalReliability ?? s.natalReliabilityScore, 0)}/100.`);
  }
  if (reading?.direction || reading?.pressure) bullets.push(`Present reading: ${reading.direction || "unresolved"}; pressure: ${reading.pressure || "unresolved"}.`);
  if (reading?.dormancy?.type) bullets.push(`Dormancy: ${reading.dormancy.type} — ${reading.dormancy.reason || "episode-level check applied"}.`);
  if (Array.isArray(replayValidationIntelligence?.disagreements) && replayValidationIntelligence.disagreements.length) {
    bullets.push(`Model contradiction flags: ${replayValidationIntelligence.disagreements.join(", ")}.`);
  }
  const e = replay?.expansionScore;
  const p = replay?.pressureScore;
  if (e !== undefined || p !== undefined) bullets.push(`Raw stock field: expansion ${e ?? "n/a"}, pressure ${p ?? "n/a"}.`);
  return bullets;
}

function capitalIntentFromActions(actions = {}, current = "") {
  const joined = `${actions?.tactical?.action || ""} ${actions?.strategic?.action || ""} ${actions?.passiveLongTerm?.action || ""} ${current}`;
  if (/PROTECT|BLOCK FRESH|AVOID|PRESSURE EXPRESSION|DOWN \/ PRESSURE-LED|PASSIVE LONG-TERM NO/i.test(joined)) return "DEFENSIVE";
  if (/TACTICAL ONLY|NO FRESH STRATEGIC|NOT PASSIVE/i.test(joined)) return "TACTICAL_ONLY";
  if (/CONDITIONAL|PROTECTION DATE/i.test(joined)) return "CONDITIONAL";
  if (/ENTER|ADD|HOLD \/ PART|RERATING|UP/i.test(joined)) return "CONSTRUCTIVE";
  return "SELECTIVE";
}

function nextGatePhrase(kind, date, row, actions, current) {
  if (!date) return null;
  const intent = capitalIntentFromActions(actions, current);
  const state = row?.pressure || row?.episodeState || row?.state || "mapped transit gate";
  if (kind === "risk") {
    if (intent === "DEFENSIVE") return `Defensive review gate: ${date} — ${state}; re-entry only if pressure has cleared.`;
    return `Protection gate: ${date} — ${state}; protect excess if pressure dominates support.`;
  }
  if (intent === "DEFENSIVE") return `Future recovery/re-entry gate: ${date} — possible upside only after the current pressure phase clears.`;
  if (intent === "TACTICAL_ONLY") return `Next tactical acceleration gate: ${date} — use only if support remains stronger than pressure; not passive approval.`;
  if (intent === "CONDITIONAL") return `Conditional build gate: ${date} — add only if the mapped future astro field confirms support.`;
  if (intent === "CONSTRUCTIVE") return `Upside acceleration gate: ${date} — constructive, but size through staggered deployment.`;
  return `Astro decision gate: ${date} — reassess from the mapped transit structure, not from price confirmation.`;
}

function actionVerdicts({ replayValidationIntelligence, transitReceptorFit }) {
  const reading = readingOf(replayValidationIntelligence);
  const horizon = reading.capitalHorizon || {};
  let tactical = horizon?.tactical?.action || reading.tacticalState || "ASTRO GATE PENDING";
  let strategic = horizon?.strategic?.action || reading.strategicState || "STRATEGIC ASTRO GATE PENDING";
  let passive = horizon?.passiveLongTerm?.action || horizon?.passiveLongTerm?.verdict || "PASSIVE LONG-TERM NOT RESOLVED";
  const cls = transitReceptorFit?.expressionClass;
  if (["PRESSURE_EXPRESSION", "NON_RESPONSIVE_OR_ROTATION_AWAY", "WEAK_OR_NON_RESPONSIVE"].includes(cls)) {
    tactical = "PROTECT / OBSERVE — no fresh tactical entry";
    strategic = "BLOCK FRESH STRATEGIC CAPITAL";
    passive = "PASSIVE LONG-TERM NO";
  }
  return {
    tactical: { verdict: horizon?.tactical?.verdict || null, action: tactical, horizon: "30–60d" },
    strategic: { verdict: horizon?.strategic?.verdict || null, action: strategic, horizon: "3–24m" },
    passiveLongTerm: { verdict: horizon?.passiveLongTerm?.verdict || null, action: passive, horizon: "12–24m+" }
  };
}

export function buildNarrativeSynthesis({ replayDate, replay, windows, macroSnapshot, transitReceptorFit, replayValidationIntelligence, company }) {
  const reading = readingOf(replayValidationIntelligence);
  const timeline = replayValidationIntelligence?.timeline || [];
  const accel = strongestAcceleration(timeline);
  const risk = firstRiskFromTimeline(timeline.slice(1), accel?.date) || firstRiskFromTimeline(timeline.slice(1));
  const confidence = confidenceFromInputs({ transitReceptorFit, replayValidationIntelligence });
  const actions = actionVerdicts({ replayValidationIntelligence, transitReceptorFit });
  const current = currentState({ replay, transitReceptorFit, replayValidationIntelligence });
  const whatChangesNext = [];
  const accelPhrase = nextGatePhrase("acceleration", accel?.date, accel, actions, current);
  const riskPhrase = nextGatePhrase("risk", risk?.date, risk, actions, current);
  if (accelPhrase) whatChangesNext.push(accelPhrase);
  if (riskPhrase) whatChangesNext.push(riskPhrase);
  if (reading?.windowSelectorGuardrails?.flags?.length) whatChangesNext.push(`Window-selector guardrails: ${reading.windowSelectorGuardrails.flags.join(", ")}.`);
  if (!whatChangesNext.length) whatChangesNext.push("No dominant next astro gate resolved from sampled windows; keep the present-state capital verdict primary.");

  return {
    version: "v33.3-capital-language-synthesis",
    doctrine: "Macro weather → sector eligibility → natal receptor expression → pressure interference → historical confidence → capital horizon action.",
    replayDate,
    ticker: company?.symbol || company?.ticker || null,
    currentState: currentState({ replay, transitReceptorFit, replayValidationIntelligence }),
    why: whyBullets({ replay, transitReceptorFit, replayValidationIntelligence }),
    whatChangesNext,
    capitalAction: actions,
    protectionDate: risk?.date || null,
    accelerationDate: accel?.date || null,
    confidence,
    singleStory: [
      `Current state: ${current}.`,
      `Tactical: ${actions.tactical.action}.`,
      `Strategic: ${actions.strategic.action}.`,
      `Passive long-term: ${actions.passiveLongTerm.action}.`,
      riskPhrase || null,
      `Confidence: ${confidence.label} (${confidence.score}/100).`
    ].filter(Boolean).join(" "),
    sourceModules: {
      replayValidationVersion: replayValidationIntelligence?.version || null,
      transitReceptorClass: transitReceptorFit?.expressionClass || null,
      transitReceptorConfidence: transitReceptorFit?.confidenceLabel || null,
      macroEnvironment: macroSnapshot?.environment || null
    },
    contradictionPolicy: "Narrative synthesis is the final display story. Parallel module outputs remain diagnostic and must not override tactical/strategic/passive capital verdicts. A cleaner future window cannot erase active present support; future pressure modifies management rather than rewriting present direction."
  };
}
