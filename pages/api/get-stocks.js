import { db } from "../../lib/db.js";
import { astroEngine } from "../../lib/astroEngine.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY = "finlumen:get-stocks:v22";

function getCacheStore() {
  if (!globalThis.__FINLUMEN_CACHE__) {
    globalThis.__FINLUMEN_CACHE__ = {};
  }
  return globalThis.__FINLUMEN_CACHE__;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const FALLBACK_STOCKS = [
  { name: "CUPID.NS" },
  { name: "SUZLON.NS" },
  { name: "BSE.NS" },
  { name: "CDSL.NS" },
  { name: "PERSISTENT.NS" },
  { name: "HDFCBANK.NS" },
  { name: "LT.NS" },
  { name: "TITAN.NS" },
  { name: "TRENT.NS" },
  { name: "KAYNES.NS" }
];

function normalizeRows(rows) {
  return rows
    .filter(Boolean)
    .map((row, index) => ({
      id: row.id || `demo-${index + 1}`,
      name: row.name || row.symbol || row.ticker,
      ...row
    }))
    .filter(row => row.name);
}

export default async function handler(req, res) {
  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const cache = getCacheStore();
    const cacheKey = `${CACHE_KEY}:${todayKey()}`;
    const cached = cache[cacheKey];

    if (!refresh && cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      res.setHeader("X-FinLumen-Cache", "HIT");
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(cached.payload);
    }

    res.setHeader("X-FinLumen-Cache", refresh ? "BYPASS" : "MISS");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    let rows = [];
    let dataSource = "supabase";

    try {
      const data = await db.getAll();
      rows = normalizeRows(Array.isArray(data) ? data : []);
    } catch (dbErr) {
      dataSource = "fallback-demo-universe";
      rows = [];
    }

    if (!rows.length) {
      dataSource = "fallback-demo-universe";
      rows = normalizeRows(FALLBACK_STOCKS);
    }

    const enriched = await Promise.all(
      rows.map(async stock => {
        try {
          const astro = await astroEngine(stock);

          return {
            ...stock,
            ...astro,
            data_source: dataSource,
            computed_at: new Date().toISOString()
          };
        } catch (err) {
          return {
            ...stock,
            data_source: dataSource,
            astro_error: err.message,
            structural_cycle: stock.structural_cycle || "UNCLASSIFIED",
            current_pressure: stock.current_pressure || "UNKNOWN",
            next_event: stock.next_event || "Astro computation error",
            expected_behaviour: stock.expected_behaviour || err.message,
            action: stock.action || "WATCH CLOSELY",
            environment_score: stock.environment_score ?? 0,
            computed_at: new Date().toISOString()
          };
        }
      })
    );

    cache[cacheKey] = {
      createdAt: Date.now(),
      payload: enriched
    };

    return res.status(200).json(enriched);
  } catch (err) {
    return res.status(500).json({
      success: false,
      route: "/api/get-stocks",
      error: err.message,
      stack: err.stack
    });
  }
}
