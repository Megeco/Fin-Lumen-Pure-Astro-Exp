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
  computeMacroEnvironment
} from "../../lib/macroEnvironment.js";

import {
  evaluateTransitReceptorFit
} from "../../lib/transitReceptorFitEngine.js";

import {
  buildReplayValidationIntelligence
} from "../../lib/replayValidationIntelligence.js";

import {
  buildNarrativeSynthesis
} from "../../lib/narrativeSynthesisEngine.js";

import { buildDecisionPipelineV35 } from "../../lib/v35/decisionPipeline.js";

export default async function handler(req, res) {
  try {
    const {
      ticker,
      date
    } = req.query;

    if (!ticker || !date) {
      return res.status(400).json({
        success: false,
        error: "ticker and date are required"
      });
    }

    const company = await resolveCompany(ticker, null, { asOfDate: date });

    if (!company?.found) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
        ticker
      });
    }

    const natal = generateRealNatalChart(company);
    const baseTransits = generateRealTransits(date);
    const relevantEclipses = getRelevantEclipses(date, {
      daysBefore: 30,
      daysAfter: 30
    });
    const eclipseHits = calculateRealEclipseHits(natal, {
      referenceDate: date,
      daysBefore: 30,
      daysAfter: 30,
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
    const macro = computeMacroEnvironment ? computeMacroEnvironment(date) : null;
    const transitReceptorFit = evaluateTransitReceptorFit({
      company,
      natal,
      transits: baseTransits,
      replay,
      macro
    });

    const replayValidationIntelligence = buildReplayValidationIntelligence({
      replayDate: date,
      replay,
      windows,
      macroSnapshot: macro,
      natalResearch: {
        selectedChartId: company.selectedChartId || company.preferredChartId || null,
        preferredChartId: company.preferredChartId || null,
        candidateCount: Array.isArray(company.charts) ? company.charts.length : 0
      },
      transitReceptorFit
    });

    const narrativeSynthesis = buildNarrativeSynthesis({
      replayDate: date,
      replay,
      windows,
      macroSnapshot: macro,
      transitReceptorFit,
      replayValidationIntelligence,
      company
    });

    const decisionV35 = buildDecisionPipelineV35({
      replayDate: date,
      replay,
      windows,
      macroSnapshot: macro,
      transitReceptorFit,
      replayValidationIntelligence,
      company,
      historicalContext: null
    });

    const readableReplay = {
      expression: replay?.historicalResponse?.expressionType || "Unknown",
      confidence:
        replay?.conviction ||
        (replay?.historicalResponse?.expressionType === "Orderly Compounder"
          ? "High"
          : replay?.historicalResponse?.expressionType === "Bullish Tug"
            ? "Medium-High"
            : replay?.historicalResponse?.expressionType === "Chaotic Trender"
              ? "Low"
              : "Medium"),
      why: [
        replay?.historicalResponse?.trendPersistence >= 55
          ? "Strong trend persistence"
          : null,
        replay?.historicalResponse?.chaosFactor <= 45
          ? "Controlled chaos"
          : null,
        replay?.historicalResponse?.observedSaturnStrength >= 45
          ? "Strong Saturn repair quality"
          : null,
        replay?.historicalResponse?.chaosFactor >= 60
          ? "Narrative overheating"
          : null,
        replay?.shadowWindows?.eclipse
          ? "Eclipse shadow active"
          : null
      ].filter(Boolean),
      trendPersistence: replay?.historicalResponse?.trendPersistence,
      chaos: replay?.historicalResponse?.chaosFactor,
      saturn: replay?.historicalResponse?.observedSaturnStrength
    };

    return res.status(200).json({
      success: true,
      ticker: company.symbol || ticker,
      company: company.companyName,
      replayDate: date,
      natal,
      transits: baseTransits,
      relevantEclipses,
      eclipseHits,
      ...replay,
      readableReplay,
      windows,
      macro,
      transitReceptorFit,
      replayValidationIntelligence,
      narrativeSynthesis,
      decisionV35
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
}
