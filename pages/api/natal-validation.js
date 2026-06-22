import resolveCompany from "../../lib/companyResolver.js";
import { evaluateNatalValidation } from "../../lib/natalValidationEngine.js";

export default async function handler(req, res) {
  try {
    const ticker = String(req.query.ticker || req.query.symbol || "").trim();
    const chartId = String(req.query.chartId || "").trim() || null;
    if (!ticker) return res.status(400).json({ success: false, error: "ticker is required" });

    const company = await resolveCompany(ticker, null, { chartId });
    if (!company?.found) {
      return res.status(404).json({ success: false, error: company?.error || "Company not found", ticker });
    }

    const natalValidation = evaluateNatalValidation(company, {
      selectedChartId: chartId || company.selectedChartId || company.preferredChartId
    });

    return res.status(200).json({
      success: true,
      route: "/api/natal-validation",
      version: "v35.0-natal-validation-chart-selector",
      ticker,
      symbol: company.symbol,
      companyName: company.companyName,
      selectedChartId: company.selectedChartId || company.preferredChartId,
      natalValidation
    });
  } catch (error) {
    return res.status(500).json({ success: false, route: "/api/natal-validation", error: error.message, stack: error.stack });
  }
}
