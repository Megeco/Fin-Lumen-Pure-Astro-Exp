import resolveCompany from "../../lib/companyResolver.js";
import validationRegistry from "../../data/natalChartValidation.json" assert { type: "json" };

export default async function handler(req, res) {
  const ticker = String(req.query.ticker || "").trim();
  if (!ticker) return res.status(400).json({ success: false, error: "ticker is required" });

  const company = await resolveCompany(ticker);
  if (!company?.found) return res.status(404).json({ success: false, error: company?.error || "Company not found" });

  const validation = validationRegistry?.stocks?.[company.symbol] || null;
  const candidates = (company.charts || []).map(chart => ({
    id: chart.id,
    chartType: chart.chartType,
    date: chart.date,
    time: chart.time,
    city: chart.city,
    country: chart.country,
    timezone: chart.timezone,
    confidence: chart.confidence,
    source: chart.source,
    isProductionDefault: chart.id === company.preferredChartId,
    validationStatus: validation?.preferredChartId === chart.id ? validation.status : "untested"
  }));

  return res.status(200).json({
    success: true,
    symbol: company.symbol,
    companyName: company.companyName,
    preferredChartId: company.preferredChartId,
    researchCase: company.researchCase || null,
    validationEligibility: company.validationEligibility || "included-research",
    validation,
    candidates
  });
}
