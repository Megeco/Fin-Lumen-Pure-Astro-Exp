import { createClient } from "@supabase/supabase-js";

function clean(value) {
  return String(value || "").trim();
}

function normalizeTicker(value) {
  const raw = clean(value).toUpperCase();
  if (!raw) return "";
  // Keep aliases like DIXON INC if user wants a custom test chart, but add .NS for ordinary Indian tickers.
  if (/\s/.test(raw) || raw.includes(".") || raw.includes("_")) return raw;
  return `${raw}.NS`;
}

function inferDefaultProfile(ticker) {
  const symbol = ticker.toUpperCase();

  if (symbol.includes("BANK") || symbol.includes("FIN")) {
    return {
      structural_cycle: "STRUCTURAL LEADER",
      expected_behaviour: "Natal data pending; add a chart before trusting the stock-specific reading.",
      expansion_current: "NATAL_PENDING",
      next_ignition: "Add natal data"
    };
  }

  if (symbol.includes("DEFENCE") || symbol.includes("AIA") || symbol.includes("ENG")) {
    return {
      structural_cycle: "INDUSTRIAL / DEFENCE CANDIDATE",
      expected_behaviour: "Natal data pending; add a chart before trusting the stock-specific reading.",
      expansion_current: "NATAL_PENDING",
      next_ignition: "Add natal data"
    };
  }

  return {
    structural_cycle: "NATAL DATA PENDING",
    expected_behaviour: "Natal data pending; add chart details in the Natal Registry Editor.",
    expansion_current: "NATAL_PENDING",
    next_ignition: "Add natal data"
  };
}

async function tryUpsert(supabase, payload) {
  // First try the normal v33 schema.
  let result = await supabase.from("stocks").upsert([payload], { onConflict: "name" });
  if (!result.error) return { ok: true, payload };

  // Some Supabase projects do not have a unique constraint on name, so onConflict can fail.
  result = await supabase.from("stocks").upsert([payload]);
  if (!result.error) return { ok: true, payload, warning: "Saved without onConflict=name. Add a unique index on stocks.name later to prevent duplicates." };

  // Older/minimal tables may only have a name column. Save just that instead of blocking the workflow.
  const minimal = { name: payload.name };
  result = await supabase.from("stocks").upsert([minimal]);
  if (!result.error) return { ok: true, payload: minimal, warning: "Saved only the stock name because the stocks table has fewer columns than v33 expects." };

  // Final fallback: insert. This helps if upsert is blocked by missing constraints.
  result = await supabase.from("stocks").insert([minimal]);
  if (!result.error) return { ok: true, payload: minimal, warning: "Inserted only the stock name. Add natal data next." };

  return { ok: false, error: result.error };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return res.status(500).json({ success: false, error: "Supabase environment variables are not configured" });

  const ticker = normalizeTicker(req.body?.name || req.body?.symbol || req.body?.ticker);
  if (!ticker) return res.status(400).json({ success: false, error: "Stock name required" });

  const profile = inferDefaultProfile(ticker);
  const stockData = {
    name: ticker,
    structural_cycle: profile.structural_cycle,
    current_pressure: "NATAL_PENDING",
    next_pressure: "Natal data required",
    expansion_current: profile.expansion_current,
    next_ignition: profile.next_ignition,
    current_window: "ADD NATAL DATA",
    action: "WATCH CLOSELY",
    next_event: "Natal data required",
    days_to_event: null,
    expected_behaviour: profile.expected_behaviour,
    updated_at: new Date().toISOString()
  };

  const supabase = createClient(url, key);
  const result = await tryUpsert(supabase, stockData);

  if (!result.ok) {
    return res.status(500).json({
      success: false,
      error: result.error?.message || "Could not save stock",
      hint: "Check that the Supabase stocks table exists. At minimum it needs a text column named name."
    });
  }

  return res.status(200).json({ success: true, saved: result.payload, warning: result.warning || null });
}
