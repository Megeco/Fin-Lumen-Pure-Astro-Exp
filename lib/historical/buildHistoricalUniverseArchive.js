import fs from "fs";
import path from "path";
import registry from "../natalRegistry.js";
import { resolveCompany } from "../companyResolver.js";
import { buildHistoricalArchiveForCompany } from "./buildHistoricalArchive.js";

const safe = s => String(s || "unknown").replace(/[^a-z0-9_-]+/gi, "_");

export async function buildHistoricalUniverseArchive({
  tickers = null,
  startDate = "2015-01-01",
  endDate = new Date().toISOString().slice(0,10),
  stepDays = 3,
  maxOrb = 8,
  fetchPrices = true,
  outputDir = path.join(process.cwd(), "data", "historicalArchive"),
  continueOnError = true
} = {}) {
  const universe = (tickers?.length ? tickers : Object.keys(registry)).sort();
  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = {
    schemaVersion: "2.0",
    generatedAt: new Date().toISOString(),
    startDate, endDate, stepDays, maxOrb,
    mode: "DISPLAY_ONLY",
    productionImpact: "none",
    tickers: [], errors: [], recordCount: 0
  };

  for (const ticker of universe) {
    try {
      const base = await resolveCompany(ticker);
      if (!base?.found) throw new Error("company not found");
      const chartIds = (base.charts || []).map(c => c.id).filter(Boolean);
      const usableChartIds = chartIds.length ? chartIds : [base.selectedChartId || base.preferredChartId || null];
      const tickerSummary = { ticker, charts: [], recordCount: 0 };

      for (const chartId of usableChartIds) {
        const company = await resolveCompany(ticker, null, { chartId });
        if (!company?.found || !company.birthDate) continue;
        if (company.birthDate > endDate) {
          tickerSummary.charts.push({ chartId, skipped: true, reason: "chart not active inside requested archive horizon" });
          continue;
        }
        const chartStart = company.birthDate > startDate ? company.birthDate : startDate;
        const archive = await buildHistoricalArchiveForCompany(company, {
          startDate: chartStart,
          endDate,
          stepDays,
          maxOrb,
          fetchPrices
        });
        const file = path.join(outputDir, `${safe(ticker)}__${safe(chartId || company.chartType)}.json`);
        fs.writeFileSync(file, JSON.stringify({
          schemaVersion: "2.0",
          mode: "DISPLAY_ONLY",
          productionImpact: "none",
          generatedAt: new Date().toISOString(),
          ticker,
          chartId: chartId || company.selectedChartId || company.preferredChartId || company.chartType,
          chartType: company.chartType,
          birthDate: company.birthDate,
          birthTime: company.birthTime,
          city: company.city,
          source: company.source,
          ...archive
        }, null, 2));
        tickerSummary.charts.push({ chartId, file: path.basename(file), recordCount: archive.records.length });
        tickerSummary.recordCount += archive.records.length;
        manifest.recordCount += archive.records.length;
      }
      manifest.tickers.push(tickerSummary);
    } catch (error) {
      manifest.errors.push({ ticker, error: error.message });
      if (!continueOnError) throw error;
    }
  }

  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
