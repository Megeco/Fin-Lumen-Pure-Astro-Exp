import { createClient } from "@supabase/supabase-js";
import { isBuiltInRegistrySymbol } from "../../lib/companyResolver.js";

function clean(value) { return String(value || "").trim(); }
function normalizeSymbol(value) { return clean(value).toUpperCase(); }

function defaultsFor(chartType) {
  const type = String(chartType || "incorporation").toLowerCase();
  if (type.includes("listing") || type.includes("record-date")) {
    return { time: "09:15", city: "Mumbai", country: "India", timezone: "Asia/Kolkata" };
  }
  return { time: "11:00", city: "", country: "India", timezone: "Asia/Kolkata" };
}

const CREATE_TABLE_SQL = `create table if not exists natal_registry (
  symbol text primary key,
  company_name text,
  chart_type text not null default 'incorporation',
  chart_id text not null default 'incorporation',
  birth_date date not null,
  birth_time text not null,
  city text,
  country text default 'India',
  timezone text default 'Asia/Kolkata',
  confidence text default 'low',
  source_note text,
  audit_status text default 'manual-entry',
  charts jsonb,
  preferred_chart_id text,
  incorporation_date date,
  listing_date date,
  updated_at timestamptz default now()
);`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return res.status(500).json({ success: false, error: "Supabase environment variables are not configured", createTableSql: CREATE_TABLE_SQL });

  const body = req.body || {};
  const symbol = normalizeSymbol(body.symbol || body.ticker || body.name);
  const chartType = clean(body.chartType || body.chart_type || "incorporation");
  const defaults = defaultsFor(chartType);
  const birthDate = clean(body.birthDate || body.birth_date || body.incorporationDate || body.incorporation_date || body.listingDate || body.listing_date);
  const birthTime = clean(body.birthTime || body.birth_time || defaults.time);
  const chartId = clean(body.chartId || body.chart_id || chartType);

  if (!symbol || !birthDate || !birthTime) return res.status(400).json({ success: false, error: "symbol, natal date and natal time are required", createTableSql: CREATE_TABLE_SQL });
  if (isBuiltInRegistrySymbol(symbol)) return res.status(403).json({ success: false, locked: true, error: "Core registry stock is locked. Edit audited chart candidates in the code registry." });

  const city = clean(body.city || defaults.city);
  if (!city) return res.status(400).json({ success: false, error: "Place/city is required for the selected chart", createTableSql: CREATE_TABLE_SQL });

  const chart = {
    id: chartId,
    chartType,
    date: birthDate,
    time: birthTime,
    city,
    country: clean(body.country || defaults.country),
    timezone: clean(body.timezone || defaults.timezone),
    confidence: clean(body.confidence || "low"),
    source: clean(body.source || body.sourceNote || "manual entry from Fin-Lumen UI")
  };

  const payload = {
    symbol,
    company_name: clean(body.companyName || body.company_name || symbol),
    chart_type: chartType,
    chart_id: chartId,
    birth_date: birthDate,
    birth_time: birthTime,
    city: chart.city,
    country: chart.country,
    timezone: chart.timezone,
    confidence: chart.confidence,
    source_note: chart.source,
    audit_status: clean(body.auditStatus || "manual-entry"),
    charts: [chart],
    preferred_chart_id: chartId,
    incorporation_date: chartType === "incorporation" ? birthDate : null,
    listing_date: chartType.includes("listing") ? birthDate : null,
    updated_at: new Date().toISOString()
  };

  const supabase = createClient(url, key);
  const { error } = await supabase.from("natal_registry").upsert(payload, { onConflict: "symbol" });
  if (error) return res.status(500).json({ success: false, error: error.message, hint: "Run the supplied natal_registry migration in Supabase SQL editor, then retry.", createTableSql: CREATE_TABLE_SQL, attemptedPayload: payload });
  return res.status(200).json({ success: true, saved: payload, resolvedChart: chart });
}
