import registry from "../../lib/natalRegistry.js";

export default async function handler(req, res) {
  const rows = Object.entries(registry || {}).map(([symbol, item]) => ({
    symbol,
    companyName: item.companyName || item.company_name || symbol,
    preferredChartId: item.preferredChartId || null,
    selectedChartId: item.selectedChartId || item.preferredChartId || null,
    chartType: item.chartType || null,
    birthDate: item.birthDate || item.incorporationDate || item.listingDate || null,
    birthTime: item.birthTime || null,
    city: item.city || item.registeredOffice?.city || null,
    country: item.country || item.registeredOffice?.country || "India",
    timezone: item.timezone || item.registeredOffice?.timezone || "Asia/Kolkata",
    confidence: item.confidence || "low",
    auditStatus: item.auditStatus || "pending-primary-source-audit",
    source: item.source || item.registrySource || "built-in-registry",
    charts: item.charts || []
  })).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return res.status(200).json({ success: true, count: rows.length, rows });
}
