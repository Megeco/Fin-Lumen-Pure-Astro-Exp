import { generateRealNatalChart } from "../realNatalGenerator.js";
import { getRealEphemeris } from "../realEphemeris.js";
import { generateTransitEpisodes } from "./transitEpisodeGenerator.js";
import { fetchYahooDailyPrices, calculateForwardMetrics } from "./priceProvider.js";
import { classifyObservedResponse } from "./responseClassifier.js";
import { inferSectorProfile } from "../sectorOntology.js";
import { buildMacroThemeContext } from "../macroThemeEngine.js";

function addDays(date, n) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }

export async function buildHistoricalArchiveForCompany(company, {
  startDate,
  endDate,
  stepDays = 3,
  maxOrb = 8,
  priceSeries = null,
  fetchPrices = true
} = {}) {
  const natal = generateRealNatalChart(company);
  const episodes = generateTransitEpisodes(natal, startDate, endDate, { stepDays, maxOrb });
  const prices = priceSeries || (fetchPrices ? await fetchYahooDailyPrices(company.symbol || company.ticker, addDays(startDate,-10), addDays(endDate,380)) : []);
  const sector = inferSectorProfile(company);
  const records = [];
  for (const ep of episodes) {
    const eventDate = ep.peak?.date || ep.exactHits?.[0] || ep.orbEntry;
    const macro = getRealEphemeris(eventDate);
    const metrics = prices.length ? calculateForwardMetrics(prices,eventDate) : null;
    const observed = metrics ? { ...metrics, ...classifyObservedResponse(metrics) } : null;
    const macroTheme = buildMacroThemeContext(company, macro, { transitDetails: [] });
    records.push({
      id: `${company.symbol || company.ticker}|${ep.key}|${eventDate}`,
      ticker: company.symbol || company.ticker,
      companyName: company.companyName || company.name,
      natalChartId: `${natal.metadata?.birthDate || company.birthDate || company.incorporationDate}|${natal.metadata?.birthTime || company.birthTime || "unknown"}`,
      natalConfidence: company.confidence || company.natal_confidence || "unknown",
      transitFamily: `${ep.planet}->${ep.targetPlanet}:${ep.aspect}`,
      transitEpisode: ep,
      eventDate,
      sectorId: sector.primary?.id || null,
      sectors: sector.sectors.map(s=>s.id),
      macroContext: {
        environment: macro.environment,
        macroPressure: macro.pressure,
        macroExpansion: macro.expansion,
        macroVolatility: macro.volatility,
        moonClimate: macro.moonClimate,
        activeEvents: (macro.activeEvents || []).map(x=>x.label || x.name).filter(Boolean),
        signature: macro.macroReadable?.signature || macro.macroNarrative?.signature || null,
        jupiterSign: macroTheme.jupiterSign,
        signThemes: macroTheme.signThemes
      },
      macroPressure: macro.pressure,
      macroExpansion: macro.expansion,
      clusters: (macro.activeEvents || []).map(x=>x.label || x.name).filter(Boolean),
      priorAstroState: null,
      observedResponse: observed,
      review: { humanReviewed:false, notes:null, promotedRule:false }
    });
  }
  return { company, natalMetadata:natal.metadata, startDate, endDate, stepDays, episodeCount:episodes.length, records };
}
