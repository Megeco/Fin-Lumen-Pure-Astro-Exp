import { createClient } from "@supabase/supabase-js";
import { isBuiltInRegistrySymbol, clearDynamicRegistryCache } from "../../lib/companyResolver.js";
import { setMemoryNatalEntry } from "../../lib/natalMemoryRegistry.js";

function clean(value) { return String(value || "").trim(); }
function normalizeSymbol(value) { return clean(value).toUpperCase(); }
function normalizeDateInput(value) {
  const raw = clean(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    // Fin-Lumen UI users are India-first; treat 03-02-2017 as 3 Feb 2017.
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return raw;
}

function getSupabaseConfig() {
  const url = clean(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL
  ).replace(/\/+$/, "");

  const key = clean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!url || !key) return { url: "", key: "", error: "Supabase URL/key environment variables are not configured." };
  if (!/^https?:\/\//i.test(url)) return { url, key, error: "Supabase URL is invalid. It must start with https://" };
  return { url, key, error: "" };
}

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function memorySuccess(res, payload, chart, warning, status = 200) {
  const saved = setMemoryNatalEntry(payload.symbol, payload);
  clearDynamicRegistryCache?.();
  return res.status(status).json({
    success: true,
    saved: saved || payload,
    resolvedChart: chart,
    storage: "runtime-memory",
    warning,
    note: "Saved for the current server session because Supabase persistence is unavailable. Check Vercel/Supabase environment variables for permanent saves.",
    createTableSql: CREATE_TABLE_SQL,
    migrationSql: MIGRATION_SQL
  });
}

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

const MIGRATION_SQL = `alter table natal_registry add column if not exists chart_type text default 'incorporation';
alter table natal_registry add column if not exists chart_id text default 'incorporation';
alter table natal_registry add column if not exists birth_date date;
alter table natal_registry add column if not exists birth_time text;
alter table natal_registry add column if not exists audit_status text default 'manual-entry';
alter table natal_registry add column if not exists charts jsonb;
alter table natal_registry add column if not exists preferred_chart_id text;
alter table natal_registry add column if not exists listing_date date;
alter table natal_registry alter column incorporation_date drop not null;
update natal_registry set birth_date = coalesce(birth_date, incorporation_date) where birth_date is null;
update natal_registry set birth_time = coalesce(birth_time, '11:00') where birth_time is null;`;

function sourceNoteWithMeta(chart, rawSource) {
  const safe = value => String(value || '').replace(/[;\n\r]/g, ' ').trim();
  return [
    `chart_type=${safe(chart.chartType)}`,
    `chart_id=${safe(chart.id)}`,
    `birth_time=${safe(chart.time)}`,
    `birth_date=${safe(chart.date)}`,
    `source=${safe(rawSource || chart.source)}`
  ].join('; ');
}

function legacyPayloadForExistingSchema(payload, chart) {
  return {
    symbol: payload.symbol,
    company_name: payload.company_name,
    incorporation_date: payload.birth_date,
    city: payload.city,
    country: payload.country,
    timezone: payload.timezone,
    confidence: payload.confidence,
    source_note: sourceNoteWithMeta(chart, payload.source_note),
    updated_at: payload.updated_at
  };
}

async function directRestUpsert({ url, key, payload }) {
  const response = await fetchWithTimeout(`${url}/rest/v1/natal_registry?on_conflict=symbol`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!response.ok) {
    const message = body?.message || body?.error || text || `Supabase REST HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });

  const body = req.body || {};
  const symbol = normalizeSymbol(body.symbol || body.ticker || body.name);
  const chartType = clean(body.chartType || body.chart_type || "incorporation");
  const defaults = defaultsFor(chartType);
  const birthDate = normalizeDateInput(body.birthDate || body.birth_date || body.incorporationDate || body.incorporation_date || body.listingDate || body.listing_date);
  const birthTime = clean(body.birthTime || body.birth_time || defaults.time);
  const chartId = clean(body.chartId || body.chart_id || chartType);

  if (!symbol || !birthDate || !birthTime) return res.status(400).json({ success: false, error: "symbol, natal date and natal time are required", createTableSql: CREATE_TABLE_SQL, migrationSql: MIGRATION_SQL });
  if (isBuiltInRegistrySymbol(symbol)) return res.status(403).json({ success: false, locked: true, error: "Core registry stock is locked. Edit audited chart candidates in the code registry." });

  const city = clean(body.city || defaults.city);
  if (!city) return res.status(400).json({ success: false, error: "Place/city is required for the selected chart", createTableSql: CREATE_TABLE_SQL, migrationSql: MIGRATION_SQL });

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

  const legacyPayload = legacyPayloadForExistingSchema(payload, chart);

  const config = getSupabaseConfig();
  if (config.error) {
    return memorySuccess(res, payload, chart, `${config.error} Saved to current-session fallback instead.`);
  }

  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout }
  });

  let error = null;

  try {
    const result = await supabase.from("natal_registry").upsert(payload, { onConflict: "symbol" });
    error = result.error;
  } catch (err) {
    // Some deployments show only "TypeError: fetch failed" through supabase-js.
    // Try direct REST once before falling back to runtime memory.
    try {
      await directRestUpsert({ url: config.url, key: config.key, payload });
      clearDynamicRegistryCache?.();
      return res.status(200).json({ success: true, saved: payload, resolvedChart: chart, storage: "supabase-rest" });
    } catch (restErr) {
      try {
        await directRestUpsert({ url: config.url, key: config.key, payload: legacyPayload });
        clearDynamicRegistryCache?.();
        return res.status(200).json({
          success: true,
          saved: legacyPayload,
          resolvedChart: chart,
          storage: "supabase-legacy-schema",
          warning: "Saved permanently using the current natal_registry schema. Run the migration SQL for full birth_date/birth_time/chart_type columns.",
          migrationSql: MIGRATION_SQL
        });
      } catch (legacyErr) {
        return memorySuccess(
          res,
          payload,
          chart,
          `Supabase persistence unavailable (${legacyErr.message || restErr.message || err.message || "network error"}). Saved to current-session fallback instead.`
        );
      }
    }
  }

  // Compatibility: older Supabase tables may not yet have birth_date/birth_time/chart_type
  // or optional audit columns. First try the current schema the user already has, while
  // embedding chart type/time metadata inside source_note so it survives across sessions.
  if (error && /schema cache|column|birth_date|birth_time|chart_type|chart_id|audit_status|charts|preferred_chart_id|listing_date/i.test(error.message || "")) {
    try {
      const retry = await supabase.from("natal_registry").upsert(legacyPayload, { onConflict: "symbol" });
      if (!retry.error) {
        clearDynamicRegistryCache?.();
        return res.status(200).json({
          success: true,
          saved: legacyPayload,
          resolvedChart: chart,
          storage: "supabase-legacy-schema",
          warning: "Saved permanently using the current natal_registry schema. Run the migration SQL for full birth_date/birth_time/chart_type columns.",
          createTableSql: CREATE_TABLE_SQL,
          migrationSql: MIGRATION_SQL
        });
      }
      error = retry.error;
    } catch (err) {
      return memorySuccess(
        res,
        legacyPayload,
        chart,
        `Supabase legacy-schema retry unavailable (${err.message || "network error"}). Saved to current-session fallback instead.`
      );
    }
  }

  if (error) {
    return memorySuccess(
      res,
      payload,
      chart,
      `Supabase returned: ${error.message}. Saved to current-session fallback instead.`
    );
  }
  clearDynamicRegistryCache?.();
  return res.status(200).json({ success: true, saved: payload, resolvedChart: chart, storage: "supabase" });
}
