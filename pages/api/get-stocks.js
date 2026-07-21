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

const BASELINE_UNIVERSE = [
  { name: "TDPOWERSYS.NS" },
  { name: "BATAINDIA.NS" },
  { name: "PIIND.NS" },
  { name: "AARTIIND.NS" },
  { name: "AIAENGG.NS" },
  { name: "CUMMINSIND.NS" },
  { name: "DIXON.NS" },
  { name: "NETWEB.NS" },
  { name: "SOLARINDS.NS" },
  { name: "ANANTRAJ.NS" },
  { name: "BAJAJFINANCE.NS" },
  { name: "BAJAJFINSV.NS" },
  { name: "BDL.NS" },
  { name: "BEL.NS" },
  { name: "BHARTIARTL.NS" },
  { name: "CARTRADE.NS" },
  { name: "CGPOWER.NS" },
  { name: "COALINDIA.NS" },
  { name: "DATAPATTERNS.NS" },
  { name: "DMART.NS" },
  { name: "ENGINERSIN.NS" },
  { name: "ETERNAL.NS" },
  { name: "FEDERALBNK.NS" },
  { name: "GRAVITA.NS" },
  { name: "GRWRHITECH.NS" },
  { name: "HINDZINC.NS" },
  { name: "IFCI.NS" },
  { name: "IOC.NS" },
  { name: "JIOFIN.NS" },
  { name: "KEI.NS" },
  { name: "LLOYDSENT.NS" },
  { name: "LT.NS" },
  { name: "LUPIN.NS" },
  { name: "MCX.NS" },
  { name: "NHPC.NS" },
  { name: "NMDC.NS" },
  { name: "NTPC.NS" },
  { name: "PCJEWELLER" },
  { name: "PCJEWELLER.NS" },
  { name: "PGEL.NS" },
  { name: "SBIN.NS" },
  { name: "SJVN.NS" },
  { name: "SKIPPER.NS" },
  { name: "TITAGARH.NS" },
  { name: "VEDL.NS" },
  { name: "TATAELXSI.NS" },
  { name: "TECHNOE.NS" },
  { name: "WPIL.NS" },
  { name: "IDEA.NS" },
  { name: "TCS.NS" },
  { name: "ICICIBANK.NS" },
  { name: "SUZLON.NS" },
  { name: "BSE.NS" },
  { name: "CDSL.NS" },
  { name: "PERSISTENT.NS" },
  { name: "KPITTECH.NS" },
  { name: "TITAN.NS" },
  { name: "TATAPOWER.NS" },
  { name: "MAZDOCK.NS" },
  { name: "TRENT.NS" },
  { name: "PFC.NS" },
  { name: "PFC_NSE_LISTING_TEST" },
  { name: "DIVISLAB.NS" },
  { name: "RELIANCE.NS" },
  { name: "FORTIS.NS" },
  { name: "INFY.NS" },
  { name: "HDFCBANK.NS" },
  { name: "COCHINSHIP.NS" },
  { name: "KAYNES.NS" },
  { name: "NEWGEN.NS" },
  { name: "RECLTD.NS" },
  { name: "CUPID.NS" },
  { name: "SIEMENS.NS" },
  { name: "CAMS.NS" },
  { name: "ONGC.NS" },
  { name: "BSE_LISTING_TEST" },
  { name: "HINDCOPPER.NS" },
  { name: "ETERNAL NC" },
  { name: "HCLTECH.NS" },
  { name: "HDFC MERGER" },
  { name: "JIOFIN_RECORD_DATE_TEST" },
  { name: "MAZDOCK TEST" },
  { name: "NEWGEN_LIST" },
  { name: "NEWGENINC.NS" },
  { name: "PFC G TEST" }
];

const FALLBACK_STOCKS = BASELINE_UNIVERSE;

const EXCLUDED_STOCK_NAMES = new Set(["DIXON INC", "AIAENG.NS"]);

function normalizeRows(rows) {
  return rows
    .filter(Boolean)
    .map((row, index) => ({
      id: row.id || `demo-${index + 1}`,
      name: row.name || row.symbol || row.ticker,
      ...row
    }))
    .filter(row => row.name && !EXCLUDED_STOCK_NAMES.has(String(row.name).trim().toUpperCase()));
}

function mergeWithBaselineUniverse(rows) {
  const byName = new Map();

  for (const row of normalizeRows(BASELINE_UNIVERSE)) {
    byName.set(String(row.name || "").trim().toUpperCase(), {
      ...row,
      baseline_universe: true
    });
  }

  for (const row of normalizeRows(rows)) {
    const key = String(row.name || row.symbol || row.ticker || "").trim().toUpperCase();
    if (!key) continue;
    byName.set(key, {
      ...(byName.get(key) || {}),
      ...row,
      baseline_universe: Boolean(byName.get(key)?.baseline_universe),
      user_or_db_row: true
    });
  }

  return [...byName.values()].filter(row => row.name);
}

export default async function handler(req, res) {
  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const requestedSymbols = new Set(String(req.query.symbols || "")
      .split(",")
      .map(value => value.trim().toUpperCase())
      .filter(Boolean));
    const cache = getCacheStore();
    const symbolCacheKey = requestedSymbols.size ? [...requestedSymbols].sort().join(",") : "ALL";
    const cacheKey = `${CACHE_KEY}:${todayKey()}:${symbolCacheKey}`;
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
      dataSource = "baseline-universe";
      rows = [];
    }

    rows = mergeWithBaselineUniverse(rows);
    if (requestedSymbols.size) {
      rows = rows.filter(row => requestedSymbols.has(String(row.name || "").trim().toUpperCase()));
    }
    if (dataSource === "supabase") {
      dataSource = "supabase+baseline-universe";
    }

    if (!rows.length) {
      dataSource = "baseline-universe";
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
