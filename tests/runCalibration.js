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
const sectorOntology = fs.readFileSync(path.join(root, "lib", "sectorOntology.js"), "utf8");

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
  ["v33.6 separates fresh capital from core posture", index.includes("fresh capital: no fresh entry") && index.includes("Action bucket describes the existing-position/tactical posture")],
  ["v33.6 dormancy map present", index.includes("Capital dormancy map") && index.includes("dormancyMapText")],
  ["v33.6 compact strategic table label present", index.includes("strategicActionCompact") && index.includes("title={finalStockDecision(stock).strategicAction}")]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
