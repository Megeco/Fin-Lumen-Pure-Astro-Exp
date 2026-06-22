import { calibrateInterpretationConfidence } from "./confidenceCalibrationEngine.js";
import { buildContradictionReport } from "./contradictionEngine.js";
import { softenCapitalVerdict, allocationPosture, trmScore } from "./finLumenCapitalLanguage.js";

const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const dateOf = item => item?.date || item?.dateOnly || item?.windowDate || null;

function readingOf(replayValidationIntelligence = {}) {
  return replayValidationIntelligence.currentResearchReading || {};
}

function firstRiskFromTimeline(timeline = []) {
  return timeline.find(row => {
    const pressure = String(row?.pressure || "");
    const breakLabel = String(row?.breakAssessment?.label || "");
    const state = String(row?.episodeState || "");
    return pressure.startsWith("HIGH") || /BREAK|DE-RATING|RESET|PRESSURE/.test(`${breakLabel} ${state}`);
  }) || null;
}

function strongestAcceleration(timeline = []) {
  return timeline
    .filter(row => row?.accelerationPotential)
    .slice()
    .sort((a, b) => n(b?.accelerationPotential?.score) - n(a?.accelerationPotential?.score))[0] || null;
}

function currentState({ replay, transitReceptorFit, replayValidationIntelligence }) {
  const reading = readingOf(replayValidationIntelligence);
  const cls = transitReceptorFit?.expressionClass || null;
  const direction = reading.direction || (n(replay?.expansionScore, 50) >= n(replay?.pressureScore, 50) ? "UP-BIASED" : "PRESSURE-BIASED");
  const pressure = reading.pressure || "UNRESOLVED";
  const strategic = reading.strategicState || "UNRESOLVED";

  if (["PRESSURE_EXPRESSION", "NON_RESPONSIVE_OR_ROTATION_AWAY", "WEAK_OR_BACKGROUND", "PRESSURE_OR_ROTATION_AWAY", "WEAK_OR_NON_RESPONSIVE"].includes(cls)) {
    return `${String(cls).replaceAll("_", " ")} — ${pressure}`;
  }
  if (cls === "RERATING_TRANSIT") return `RERATING TRANSIT — ${direction} / ${pressure}`;
  if (cls === "CONTESTED_EXPANSION") return `CONTESTED EXPANSION — ${direction} / ${pressure}`;
  if (cls === "SUPPORTIVE_BUT_MUTED") return `SUPPORTIVE BUT MUTED — ${direction} / ${pressure}`;
  if (strategic && strategic !== "UNRESOLVED") return `${strategic} — ${direction} / ${pressure}`;
  return `${direction} / ${pressure}`;
}

function actionFrom(capital, key, fallback) {
  const row = capital?.[key] || {};
  return {
    horizon: row.horizon || fallback,
    action: row.displayVerdict || softenCapitalVerdict(row.verdict),
    internalVerdict: row.verdict || null,
    note: row.note || null
  };
}

function actionSet(capitalHorizon = {}) {
  return {
    posture: allocationPosture(capitalHorizon),
    tactical: actionFrom(capitalHorizon, "tactical", "30–60 days"),
    strategic: actionFrom(capitalHorizon, "strategic", "3–12 months"),
    passiveLongTerm: actionFrom(capitalHorizon, "passiveLongTerm", "12–24 months")
  };
}

function whyBullets({ replay, transitReceptorFit, replayValidationIntelligence, contradictionReport, confidence }) {
  const reading = readingOf(replayValidationIntelligence);
  const bullets = [];
  if (transitReceptorFit?.expressionLabel) bullets.push(`Transit receptor fit: ${transitReceptorFit.expressionLabel}.`);
  if (transitReceptorFit?.scores) {
    const s = transitReceptorFit.scores;
    bullets.push(`Expression ${n(s.expressionScore, 0)}/100, confidence ${n(s.confidenceScore, 0)}/100, natal reliability ${n(s.natalReliability, 0)}/100.`);
    bullets.push(`Sector fit ${n(s.sectorThemeFit, 0)}/100, natal receptor ${n(s.natalReceptorStrength, 0)}/100, pressure interference ${n(s.pressureInterference, 0)}/100.`);
  }
  if (reading?.direction || reading?.pressure) bullets.push(`Present reading: ${reading.direction || "unresolved"}; pressure: ${reading.pressure || "unresolved"}.`);
  if (reading?.dormancy?.type) bullets.push(`Dormancy check: ${reading.dormancy.type}${reading.dormancy.contradiction ? " with contradiction flag" : ""}.`);
  if (contradictionReport?.flagCount) bullets.push(`Contradiction severity ${contradictionReport.severity}: ${contradictionReport.flags.slice(0, 2).map(f => f.code).join(", ")}.`);
  if (confidence) bullets.push(`Calibrated confidence ${confidence.label} (${confidence.score}/100); signal strength is capped by natal reliability, replay evidence and contradictions.`);
  const e = replay?.expansionScore;
  const p = replay?.pressureScore;
  if (e !== undefined || p !== undefined) bullets.push(`Base replay scores: expansion ${e ?? "—"}, pressure ${p ?? "—"}.`);
  return bullets;
}

function buildChronologicalStory({ replayDate, reading, capitalHorizon, transitReceptorFit, timeline, risk, accel, confidence, contradictionReport }) {
  const parts = [];
  const trmLabel = transitReceptorFit?.expressionLabel || "Mixed transit receptor";
  const trmReading = transitReceptorFit?.reading || "Company-specific receptor checks decide whether macro weather is usable.";
  parts.push(`Now (${replayDate || "current replay date"}): ${trmLabel}. ${trmReading}`);

  const tactical = capitalHorizon?.tactical || {};
  parts.push(`Next 30–60 days: ${tactical.displayVerdict || softenCapitalVerdict(tactical.verdict)} ${tactical.note ? `— ${tactical.note}` : ""}`);

  const strategic = capitalHorizon?.strategic || {};
  parts.push(`Next 3–12 months: ${strategic.displayVerdict || softenCapitalVerdict(strategic.verdict)} ${strategic.note ? `— ${strategic.note}` : ""}`);

  if (accel?.date) {
    parts.push(`Acceleration watch: ${accel.date}; treat as opportunity only if receptor support remains stronger than pressure.`);
  }

  if (risk?.date || capitalHorizon?.breakHorizon?.date) {
    const d = risk?.date || capitalHorizon.breakHorizon.date;
    parts.push(`Protection/review gate: ${d}; capital should be resized or restrained before this window if pressure confirms.`);
  } else {
    parts.push("Protection/review gate: no major mapped break gate inside the sampled horizon, but this is not a guarantee.");
  }

  const passive = capitalHorizon?.passiveLongTerm || {};
  parts.push(`12–24 month posture: ${passive.displayVerdict || softenCapitalVerdict(passive.verdict)} ${passive.note ? `— ${passive.note}` : ""}`);

  if (contradictionReport?.severity && contradictionReport.severity !== "CLEAR") {
    parts.push(`Contradiction policy: ${contradictionReport.action}`);
  }

  parts.push(`Confidence: ${confidence.label} (${confidence.score}/100).`);
  return parts.join(" ");
}

function timelineDigest(timeline = []) {
  return timeline.slice(0, 6).map(row => ({
    date: row.date,
    role: row.role,
    phase: row.episodeState || row.opportunityClass || "Unresolved",
    pressure: row.pressure || null,
    allocationImplication: row.pressure && String(row.pressure).startsWith("HIGH")
      ? "Review/protect"
      : /OPPORTUNITY|RERATING|ACCELERATION/i.test(`${row.opportunityClass || ""} ${row.episodeState || ""}`)
        ? "Potential participation window"
        : "Observe"
  }));
}

export function buildNarrativeSynthesis({ replayDate, replay, windows, macroSnapshot, transitReceptorFit, replayValidationIntelligence, company }) {
  const reading = readingOf(replayValidationIntelligence);
  const capitalHorizon = reading.capitalHorizon || {};
  const timeline = replayValidationIntelligence?.timeline || [];
  const risk = firstRiskFromTimeline(timeline) || capitalHorizon.breakHorizon || null;
  const accel = strongestAcceleration(timeline) || capitalHorizon.nextAcceleration || null;

  const contradictionReport = replayValidationIntelligence?.contradictionReport || buildContradictionReport({
    replay,
    windows,
    transitReceptorFit,
    capitalHorizon,
    currentDormancy: reading.dormancy,
    strategic: reading.strategicState,
    modelDisagreements: replayValidationIntelligence?.disagreements || []
  });

  const confidence = replayValidationIntelligence?.confidenceCalibration || calibrateInterpretationConfidence({
    transitReceptorFit,
    contradictionReport,
    replayValidationIntelligence
  });

  const actions = actionSet(capitalHorizon);
  const state = currentState({ replay, transitReceptorFit, replayValidationIntelligence });
  const why = whyBullets({ replay, transitReceptorFit, replayValidationIntelligence, contradictionReport, confidence });
  const singleStory = buildChronologicalStory({
    replayDate,
    reading,
    capitalHorizon,
    transitReceptorFit,
    timeline,
    risk,
    accel,
    confidence,
    contradictionReport
  });

  return {
    model: "Narrative Synthesis Engine",
    version: "v33.1",
    company: company?.name || company?.symbol || company?.ticker || null,
    currentState: state,
    allocationPosture: actions.posture,
    why,
    capitalAction: actions,
    protectionDate: risk?.date || null,
    accelerationDate: accel?.date || null,
    confidence,
    contradictionReport,
    chronologicalTimeline: timelineDigest(timeline),
    singleStory,
    sourceModules: {
      replayValidationVersion: replayValidationIntelligence?.version || null,
      transitReceptorClass: transitReceptorFit?.expressionClass || null,
      transitReceptorConfidence: transitReceptorFit?.confidenceLabel || null,
      macroEnvironment: macroSnapshot?.environment || null
    },
    contradictionPolicy: "Narrative synthesis is the final display story. Diagnostic module outputs remain visible, but tactical/strategic/passive capital language is capped by TRM, contradiction severity and calibrated confidence.",
    methodology: "Macro weather → sector eligibility → natal receptor expression → pressure interference → historical confidence → capital horizon action → chronological synthesis."
  };
}

export default buildNarrativeSynthesis;
