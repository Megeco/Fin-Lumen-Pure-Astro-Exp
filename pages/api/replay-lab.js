import {
  resolveCompany
} from "../../lib/companyResolver.js";

import calculateTransitResonance from "../../lib/transitResonance.js";

import {
  generateRealNatalChart
} from "../../lib/realNatalGenerator.js";

import {
  generateRealTransits
} from "../../lib/realTransitGenerator.js";

import {
  calculateRealEclipseHits,
  getRelevantEclipses
} from "../../lib/realEclipseEngine.js";

import {
  scanForwardWindows
} from "../../lib/windowScanner.js";

import {
  getRealEphemeris
} from "../../lib/realEphemeris.js";

import { buildMacroThemeContext } from "../../lib/macroThemeEngine.js";
import { buildReplayValidationIntelligence } from "../../lib/replayValidationIntelligence.js";
import { evaluateTransitReceptorFit } from "../../lib/transitReceptorFitEngine.js";
import { buildNarrativeSynthesis } from "../../lib/narrativeSynthesisEngine.js";
import { buildDecisionPipelineV35 } from "../../lib/v35/decisionPipeline.js";

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanEclipseEvent(event) {
  if (!event || event.kind !== "eclipse") {
    return event;
  }

  const label =
    event.label ||
    `${event.eclipseType || "Eclipse"} in ${event.sign || "unknown sign"}`;

  const degree =
    typeof event.degree === "number"
      ? event.degree.toFixed(2)
      : null;

  return {
    ...event,
    name: label,
    notes: degree && event.sign
      ? `${label} at ${degree}° ${event.sign}.`
      : `${label}.`
  };
}

function summariseContacts(transitDetails = []) {
  return transitDetails
    .slice()
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
    .slice(0, 8)
    .map(contact => ({
      planet: contact.planet,
      targetPlanet: contact.targetPlanet,
      aspect: contact.aspect,
      orb: contact.orb,
      score: contact.score,
      rawScore: contact.rawScore,
      sign: contact.transitSign,
      text: `${contact.planet} ${contact.aspect} natal ${contact.targetPlanet}, orb ${contact.orb}° (${contact.score >= 0 ? "+" : ""}${contact.score})`
    }));
}

function buildMacroSnapshot(ephemeris) {
  const readable = ephemeris.macroReadable || {};
  const phases = Array.isArray(ephemeris.phases)
    ? ephemeris.phases.map(cleanEclipseEvent)
    : [];

  const nextShift =
    readable.mainOpportunity ||
    ephemeris.macroNarrative?.nextShift ||
    phases.find(event => event?.kind === "macroAspect" && event?.daysRemaining >= 0) ||
    phases[0] ||
    null;

  return {
    provider: ephemeris.metadata?.provider || "unknown",
    precision: ephemeris.metadata?.eventPrecision || "date-level Swiss layer",
    date: ephemeris.transits?.date || null,
    environment: ephemeris.environment,
    pressure: ephemeris.pressure,
    expansion: ephemeris.expansion,
    volatility: ephemeris.volatility,
    moon: ephemeris.moonClimate,
    headline: readable.headline || ephemeris.macroNarrative?.headline || ephemeris.environment,
    activeNow: readable.activeNow || ephemeris.activeEvents || [],
    mainOpportunity: readable.mainOpportunity || null,
    mainRisk: readable.mainRisk || null,
    nextShift,
    next30Days: readable.next30Days || phases.slice(0, 8),
    shadowClusterNotes: readable.shadowClusterNotes || [],
    stockImplication: readable.stockImplication || ephemeris.macroNarrative?.likelyBehaviour || "Stock-specific natal contacts decide the behaviour."
  };
}

function buildChartValidation(replay, forwardDays) {
  const expression = replay?.finAstroGrammar?.signal || replay?.grammarSignal || replay?.environmentConflict || "Mixed";
  const pressure = replay?.pressureScore ?? 0;
  const expansion = replay?.expansionScore ?? 0;
  const volatility = replay?.volatility || "-";

  let expected = "Observe whether the chart trends, chops, corrects, or shows leadership after the replay date.";

  if (String(expression).includes("Bullish Tug")) {
    expected = "Look for back-and-forth price action with attempts to lead. Best match: volatility but higher lows or eventual follow-through after pressure pockets.";
  } else if (String(expression).includes("Compression")) {
    expected = "Look for range/chop, controlled drawdown, or repair after pressure. Do not expect immediate clean expansion unless a later catalyst unlocks it.";
  } else if (String(expression).includes("Speculative") || String(expression).includes("Fragile")) {
    expected = "Look for sharp moves, fast reversals, gaps, and high sensitivity to catalyst timing.";
  } else if (String(expression).includes("Orderly") || String(expression).includes("Compounder")) {
    expected = "Look for steadier persistence, shallower pullbacks, and cleaner repair after pressure windows.";
  }

  return {
    forwardWindowDays: forwardDays,
    status: "Manual chart validation pending",
    predictedState: expression,
    expectedChartBehaviour: expected,
    pressureExpansionContext: `Expansion ${expansion}, pressure ${pressure}, volatility ${volatility}.`,
    whatToCheckOnTradingView: [
      `From the replay date, inspect roughly the next ${forwardDays} calendar days on the chart.`,
      "Did price trend, chop, correct, or make a false breakout after the astro reading?",
      "Did volatility rise near the highlighted catalyst/shadow window?",
      "Did pressure deepen, or did the stock repair after the difficult contact?",
      "Was the astro signal early, late, matched, failed, or uncertain?",
      "Always judge the stock response inside the wider macro astro environment, not as same-sky-equals-same-outcome."
    ],
    manualEvaluationFields: {
      outcome: "Pending / Matched / Early / Late / Failed / Uncertain",
      priceBehaviour: "Trend / Chop / Correction / Breakout / Reversal / Compression",
      notes: "Add TradingView observations here after checking the chart."
    }
  };
}

function buildReplaySummary({ company, natal, replay, macroSnapshot, windows, forwardDays, replayDate, transitReceptorFit }) {
  // v30.04N: present-date astrology is authoritative for the present.
  // Forward windows remain available, but cannot rewrite current contacts,
  // eclipse state, signal, scores, or dominant signature.
  const contacts = summariseContacts(replay.transitDetails || []);
  const topContactText = contacts.map(item => item.text);
  const presentSignal = replay.finAstroGrammar?.signal || replay.grammarSignal || replay.environmentConflict || "Mixed";
  const windowMap = windows?.windowMap || {};

  return {
    ticker: company.symbol,
    replayDate,
    companyName: company.companyName || company.name || company.symbol,
    replayDateContext: "Present-date Swiss transits and time/place-aware natal contacts are isolated from the 24-month forward scan.",
    expression: presentSignal,
    baseExpression: replay.environmentConflict || null,
    confidence: replay.conviction || "Neutral",
    regime: replay.regime,
    phaseFit: replay.phaseFit,
    environmentType: replay.environmentType,
    environmentConflict: replay.environmentConflict,
    expansionScore: replay.expansionScore,
    pressureScore: replay.pressureScore,
    rawExpansionScore: replay.rawExpansionScore,
    rawPressureScore: replay.rawPressureScore,
    leadershipProbability: replay.leadershipProbability,
    volatility: replay.volatility,
    multibaggerProbability: replay.multibaggerProbability,
    rotationRisk: replay.rotationRisk,
    historicalSimilarity: replay.historicalSimilarity,
    environmentComplexity: replay.environmentComplexity,
    environmentVolatility: replay.environmentVolatility,
    catalystWindow: replay.catalystWindow,
    environmentSignature: replay.environmentSignature,
    clusterDensity: replay.clusterDensity,
    activeClusters: replay.activeClusters || [],
    overlapIntensity: replay.overlapIntensity || {},
    natalArchetype: replay.natalProfile?.natalArchetype || natal.natalProfile?.natalArchetype || "-",
    elementBias: replay.natalProfile?.elementBias || natal.natalProfile?.elementBias || "-",
    dominantPlanets: replay.natalProfile?.dominantPlanets || natal.natalProfile?.dominantPlanets || [],
    topContacts: contacts,
    topContactText,
    transitReceptorFit,
    present: {
      date: replayDate,
      signal: presentSignal,
      actionBias: replay.finAstroGrammar?.actionBias || replay.grammarActionBias || "watch",
      pressureKind: replay.finAstroGrammar?.pressure?.pressureKind || replay.grammarPressureKind || null,
      pressureRole: replay.finAstroGrammar?.pressure?.pressureRole || replay.grammarPressureRole || null,
      regime: replay.regime,
      expansionScore: replay.expansionScore,
      pressureScore: replay.pressureScore,
      leadershipProbability: replay.leadershipProbability,
      catalystWindow: replay.catalystWindow,
      environmentSignature: replay.environmentSignature,
      topContacts: contacts,
      topContactText
    },
    forwardPath: {
      tacticalOpportunity: windowMap.tacticalOpportunity || windows?.tactical || null,
      tacticalRisk: windowMap.tacticalRisk || null,
      strategicAccumulation: windowMap.strategicAccumulation || null,
      strategicOpportunity: windowMap.strategicOpportunity || windows?.strategic || windows?.bestWindow || null,
      strategicRisk: windowMap.strategicRisk || null,
      longRangeCycle: windowMap.longRangeCycle || windows?.longRangeCycle || null
    },
    forwardDays,
    forwardWindows: windows,
    macroHeadline: macroSnapshot.headline,
    macroStockImplication: macroSnapshot.stockImplication,
    chartValidation: buildChartValidation(replay, forwardDays),
    contextNote: "At-present interpretation uses only replay-date contacts. Tactical, strategic, and long-range contacts are isolated and may modify management, but cannot overwrite the present signal."
  };
}

export default async function handler(req, res) {
  try {
    const ticker = String(req.query.ticker || "").trim();
    const date = String(req.query.date || "").trim();
    const forwardDays = toNumber(req.query.forwardDays, 730);
    const includeRaw = String(req.query.raw || "") === "1";

    if (!ticker || !date) {
      return res.status(400).json({
        success: false,
        route: "/api/replay-lab",
        error: "ticker and date are required"
      });
    }

    const company = await resolveCompany(ticker, null, { chartId: String(req.query.chartId || "").trim() || null, asOfDate: date });

    if (!company?.found) {
      return res.status(404).json({
        success: false,
        route: "/api/replay-lab",
        error: "Company not found or natal data unavailable",
        ticker
      });
    }

    const natal = generateRealNatalChart(company);
    const baseTransits = generateRealTransits(date);
    // Present-date eclipse context is deliberately bounded. The 24-month
    // forward scan calculates its own future windows and must not leak
    // future eclipse contacts into the present replay summary.
    const presentEclipseHorizonDays = 45;
    const relevantEclipses = getRelevantEclipses(date, {
      daysBefore: presentEclipseHorizonDays,
      daysAfter: presentEclipseHorizonDays
    });
    const eclipseHits = calculateRealEclipseHits(natal, {
      referenceDate: date,
      daysBefore: presentEclipseHorizonDays,
      daysAfter: presentEclipseHorizonDays,
      eclipses: relevantEclipses,
      orbLimit: 8
    });

    const transitData = {
      ...baseTransits,
      relevantEclipses,
      eclipseHits
    };

    const replay = calculateTransitResonance(natal, transitData);
    const windows = scanForwardWindows(natal, date);
    const macroEphemeris = getRealEphemeris(date);
    const macroSnapshot = buildMacroSnapshot(macroEphemeris);
    const episodeAwareReplay = windows?.immediate || replay;
    const sectorContext = buildMacroThemeContext(company, macroEphemeris, episodeAwareReplay);
    const transitReceptorFit = evaluateTransitReceptorFit({
      company,
      natal,
      transits: baseTransits,
      replay: episodeAwareReplay,
      macro: macroEphemeris
    });
    const replayValidationIntelligence = buildReplayValidationIntelligence({
      replayDate: date,
      replay: episodeAwareReplay,
      windows,
      macroSnapshot,
      natalResearch: {
        selectedChartId: company.selectedChartId || company.preferredChartId || null,
        preferredChartId: company.preferredChartId || null,
        candidateCount: Array.isArray(company.charts) ? company.charts.length : 0
      },
      forwardDays,
      transitReceptorFit
    });

    const narrativeSynthesis = buildNarrativeSynthesis({
      replayDate: date,
      replay: episodeAwareReplay,
      windows,
      macroSnapshot,
      transitReceptorFit,
      replayValidationIntelligence,
      company
    });

    const decisionV35 = buildDecisionPipelineV35({
      replayDate: date,
      replay: episodeAwareReplay,
      windows,
      macroSnapshot,
      transitReceptorFit,
      replayValidationIntelligence,
      company
    });

    const replaySummary = buildReplaySummary({
      company,
      natal,
      replay: episodeAwareReplay,
      macroSnapshot,
      windows,
      forwardDays,
      replayDate: date,
      transitReceptorFit
    });

    return res.status(200).json({
      success: true,
      route: "/api/replay-lab",
      version: "v31-5-replay-validation-intelligence",
      input: {
        ticker,
        date,
        forwardDays,
        chartId: company.selectedChartId || company.preferredChartId || null
      },
      resolvedCompany: {
        symbol: company.symbol || ticker,
        companyName: company.companyName || company.name || ticker,
        found: company.found,
        registryType: company.registryType || null,
        locked: Boolean(company.locked),
        chartType: natal.metadata?.chartType || company.chartType || null,
        birthDate: natal.metadata?.birthDate || company.birthDate || company.incorporationDate || company.listingDate || null,
        birthTime: natal.metadata?.birthTime || company.birthTime || null,
        city: natal.metadata?.city || company.city || company.registeredOffice?.city || null,
        country: natal.metadata?.country || company.country || company.registeredOffice?.country || null,
        timezone: natal.metadata?.timezone || company.timezone || company.registeredOffice?.timezone || null,
        timestampUtc: natal.metadata?.timestampUtc || null,
        natalSource: company.sourceNote || company.source || company.natal_source || company.registrySource || null
      },
      natalResearch: {
        mode: "RESEARCH_ONLY",
        productionImpact: "none",
        selectedChartId: company.selectedChartId || company.preferredChartId || null,
        preferredChartId: company.preferredChartId || null,
        candidateCount: Array.isArray(company.charts) ? company.charts.length : 0,
        candidates: (company.charts || []).map(chart => ({
          id: chart.id,
          chartType: chart.chartType,
          date: chart.date,
          time: chart.time,
          city: chart.city,
          country: chart.country,
          timezone: chart.timezone,
          confidence: chart.confidence,
          source: chart.source,
          selected: chart.id === (company.selectedChartId || company.preferredChartId)
        })),
        researchCase: company.researchCase || null,
        validationEligibility: company.validationEligibility || "included-research",
        instruction: "Compare this chart's replay JSON and actual price behaviour against the same replay run under each credible natal candidate."
      },
      natalReliability: {
        confidence: company.confidence || company.natal_confidence || natal.confidence || "unknown",
        chartType: natal.metadata?.chartType || company.chartType || null,
        birthDate: natal.metadata?.birthDate || company.incorporationDate || company.birthDate || company.listingDate || null,
        birthTime: natal.metadata?.birthTime || company.birthTime || null,
        city: natal.metadata?.city || company.city || company.registeredOffice?.city || null,
        timezone: natal.metadata?.timezone || company.timezone || company.registeredOffice?.timezone || null,
        timestampUtc: natal.metadata?.timestampUtc || null,
        calculation: natal.metadata?.calculation || natal.calculation || "Time/place-aware natal positions where available; default time used if unknown."
      },
      macroSnapshot,
      sectorContext,
      transitReceptorFit,
      replayValidationIntelligence,
      narrativeSynthesis,
      decisionV35,
      replaySummary,
      research: includeRaw
        ? {
            natal,
            baseTransits,
            relevantEclipses,
            eclipseHits,
            replay,
            windows
          }
        : undefined
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      route: "/api/replay-lab",
      error: err.message,
      stack: err.stack
    });
  }
}
