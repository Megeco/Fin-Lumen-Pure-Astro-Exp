const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const realEphemeris = fs.readFileSync(path.join(root, "lib", "realEphemeris.js"), "utf8");
const transitResonance = fs.readFileSync(path.join(root, "lib", "transitResonance.js"), "utf8");
const index = fs.readFileSync(path.join(root, "pages", "index.js"), "utf8");
const windowScanner = fs.readFileSync(path.join(root, "lib", "windowScanner.js"), "utf8");
const pressureEngine = fs.readFileSync(path.join(root, "lib", "pressureEngine.js"), "utf8");
const recommendationEngine = fs.readFileSync(path.join(root, "lib", "recommendationEngine.js"), "utf8");
const astroScoreEngine = fs.readFileSync(path.join(root, "lib", "astroScoreEngine.js"), "utf8");
const decision = fs.readFileSync(path.join(root, "lib", "decision.js"), "utf8");
const environmentEngine = fs.readFileSync(path.join(root, "lib", "environmentEngine.js"), "utf8");
const confidenceEngine = fs.readFileSync(path.join(root, "lib", "confidenceEngine.js"), "utf8");
const finAstroGrammar = fs.readFileSync(path.join(root, "lib", "finAstroGrammar.js"), "utf8");
const transitReceptorFitEngine = fs.readFileSync(path.join(root, "lib", "transitReceptorFitEngine.js"), "utf8");
const replayLab = fs.readFileSync(path.join(root, "pages", "api", "replay-lab.js"), "utf8");
const replayApi = fs.readFileSync(path.join(root, "pages", "api", "replay.js"), "utf8");
const replayValidationIntelligence = fs.readFileSync(path.join(root, "lib", "replayValidationIntelligence.js"), "utf8");
const narrativeSynthesisEngine = fs.readFileSync(path.join(root, "lib", "narrativeSynthesisEngine.js"), "utf8");
const contradictionEngine = fs.readFileSync(path.join(root, "lib", "contradictionEngine.js"), "utf8");
const confidenceCalibrationEngine = fs.readFileSync(path.join(root, "lib", "confidenceCalibrationEngine.js"), "utf8");
const capitalLanguage = fs.readFileSync(path.join(root, "lib", "finLumenCapitalLanguage.js"), "utf8");
const sectorOntology = fs.readFileSync(path.join(root, "lib", "sectorOntology.js"), "utf8");
const natalValidationEngine = fs.readFileSync(path.join(root, "lib", "natalValidationEngine.js"), "utf8");
const v35CandidateCharts = fs.readFileSync(path.join(root, "lib", "v35CandidateCharts.js"), "utf8");
const natalValidationApi = fs.readFileSync(path.join(root, "pages", "api", "natal-validation.js"), "utf8");

const checks = [
  ["transition removed from raw pressure bucket", !realEphemeris.includes('["pressure", "transition", "volatility"].includes(item.type)')],
  ["v28 macro thresholds present", realEphemeris.includes("extreme: 45") && realEphemeris.includes("high: 28") && realEphemeris.includes("pressure: 15")],
  ["source weighting present", realEphemeris.includes("SOURCE_WEIGHTS") && realEphemeris.includes("weightedClusterScore")],
  ["moon behavioural modifier present", transitResonance.includes("moonBehaviourModifier")],
  ["structural/volatile pressure split present", transitResonance.includes("structuralPressureScore") && transitResonance.includes("volatilePressureScore")],
  ["expanded path panels present", index.includes("Tactical Path — next 6 weeks") && index.includes("Strategic Path — next 9 months")],
  ["v28.9 window map fields present", windowScanner.includes("buildWindowMap") && windowScanner.includes("strategicAccumulation") && windowScanner.includes("longRangeCycle") && index.includes("Accumulation window opens")],
  ["v29.1 legacy pressure engine disabled", pressureEngine.includes("pressure_score: null") && !pressureEngine.includes("BEARISH PRESSURE")],
  ["v29.1 legacy recommendation engine disabled", recommendationEngine.includes("return null") && !recommendationEngine.includes("FULL ATTACK") && !recommendationEngine.includes("DISTRIBUTE INTO STRENGTH")],
  ["v29.1 astro score uses structural/volatile pressure", astroScoreEngine.includes("structuralPressure") && astroScoreEngine.includes("volatilePressure") && astroScoreEngine.includes("pressure_tolerant")],
  ["v29.1 decision avoids automatic trim at dz>=7", decision.includes("d >= 8 && p > e") && decision.includes("RALLY WITH CHURN")],
  ["v29.1 soft Saturn adds stability", environmentEngine.includes("structuralStability += 5") && environmentEngine.includes("durabilitySupport += 4")],
  ["v29.1 confidence conflict penalty softened", confidenceEngine.includes("score -= 0.4")],
  ["v30.04O sector support requires real benefic network", finAstroGrammar.includes("Rahu-only soft contacts are narrative amplification") && finAstroGrammar.includes("hasSupportiveContact(\"jupiter\"")],
  ["v30.04O same-axis conflict hierarchy present", finAstroGrammar.includes("sameAxisJupiterSaturnConflict") && finAstroGrammar.includes("ACTIVE CONTESTED EXPANSION")],
  ["v30.04O episode continuity reconstructs prehistory", windowScanner.includes("historyScans") && windowScanner.includes("pressureInsideActiveSupport") && windowScanner.includes("SEVERE PRESSURE INSIDE ACTIVE EXPANSION")],
  ["v32 TRM engine present", transitReceptorFitEngine.includes("evaluateTransitReceptorFit") && transitReceptorFitEngine.includes("Macro transit creates weather")],
  ["v32 TRM prevents one-transit-fits-all rerating", transitReceptorFitEngine.includes("No rerating label: natal receptor below 60") && transitReceptorFitEngine.includes("NON_RESPONSIVE_OR_ROTATION_AWAY")],
  ["v32 TRM wired into replay lab", replayLab.includes("transitReceptorFit") && replayLab.includes("evaluateTransitReceptorFit")],
  ["v33 restores capital horizon guardrails", replayValidationIntelligence.includes("capitalHorizonVerdicts") && replayValidationIntelligence.includes("passiveLongTerm") && replayValidationIntelligence.includes("receptorFitCapitalGate")],
  ["v33 narrative synthesis present", narrativeSynthesisEngine.includes("buildNarrativeSynthesis") && narrativeSynthesisEngine.includes("currentState") && narrativeSynthesisEngine.includes("capitalAction")],
  ["v33 replay lab passes TRM into validation", replayLab.includes("transitReceptorFit\n    });") && replayLab.includes("narrativeSynthesis")],
  ["v33 sector ontology restores shipbuilding and real estate", sectorOntology.includes("shipbuilding") && sectorOntology.includes("realEstate")],
  ["v33 replay API emits synthesis", replayApi.includes("replayValidationIntelligence") && replayApi.includes("narrativeSynthesis")],
  ["v33.1 contradiction engine present", contradictionEngine.includes("buildContradictionReport") && contradictionEngine.includes("HIGH_SIGNAL_LOW_NATAL_RELIABILITY") && contradictionEngine.includes("RERATING_WITH_FAILED_HARD_STOP")],
  ["v33.1 confidence calibration present", confidenceCalibrationEngine.includes("calibrateInterpretationConfidence") && confidenceCalibrationEngine.includes("Signal Strength") && confidenceCalibrationEngine.includes("natalReliability")],
  ["v33.1 capital language softening present", capitalLanguage.includes("softenCapitalVerdict") && capitalLanguage.includes("Fresh allocation not favoured") && capitalLanguage.includes("TRM_BLOCK_FRESH_CLASSES")],
  ["v33.1 replay intelligence emits hardening fields", replayValidationIntelligence.includes("contradictionReport") && replayValidationIntelligence.includes("confidenceCalibration") && replayValidationIntelligence.includes("v33.1-synthesis-hardening")],
  ["v33.1 narrative chronological capital story present", narrativeSynthesisEngine.includes("buildChronologicalStory") && narrativeSynthesisEngine.includes("Next 30–60 days") && narrativeSynthesisEngine.includes("Next 3–12 months") && narrativeSynthesisEngine.includes("12–24 month posture")],
  ["v34 private card dad summary present", index.includes("Dad Summary") && index.includes("finalSynthesisLabel")],
  ["v34 rerating language capped by TRM", index.includes("high rerating language is capped by TRM") && index.includes("Natal-led constructive setup")],
  ["v34 hold winner tiered ladder present", index.includes("HOLD CONSTRUCTIVE CORE") && index.includes("activeLeader = leadership >= 75")],
  ["v34 scanner driver type present", index.includes("finalSynthesisLabel(stock).driver")],
  ["v34 long-range cycle potential separated from usability", index.includes("Long-range cycle potential") && index.includes("Current usability")],
  ["v35 NVE engine present", natalValidationEngine.includes("evaluateNatalValidation") && natalValidationEngine.includes("No composite charts")],
  ["v35 candidate registry ignores legacy remarks", v35CandidateCharts.includes("legacy remarks are intentionally ignored") && v35CandidateCharts.includes("AIAENG.NS")],
  ["v35 natal validation API present", natalValidationApi.includes("/api/natal-validation") && natalValidationApi.includes("evaluateNatalValidation")],
  ["v35 chart selector UI present", index.includes("Natal Validation + Chart Selector") && index.includes("No composite chart is created")]

];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
