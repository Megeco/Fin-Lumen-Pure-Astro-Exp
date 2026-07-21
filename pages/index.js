import {
  useEffect,
  useMemo,
  useState
} from "react";
import { evaluateFinAstroGrammar } from "../lib/finAstroGrammar";

function formatDegree(position) {
  if (!position) {
    return "-";
  }

  const degree = typeof position.degree === "number" ? position.degree.toFixed(2) : position.degree;
  return `${position.sign || "-"} ${degree ?? "-"}°${position.retrograde ? " Rx" : ""}`;
}

function asScore(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function normalizeActionLabel(action) {
  const raw = String(action || "WATCH CLOSELY").trim().toUpperCase();

  if (raw.includes("AGGRESSIVE") || raw.includes("PRIORITY")) return "AGGRESSIVE ACCUMULATION";

  // v33.5 visual/action cleanup:
  // The Action Bucket must match the legend. "No fresh" is not its own bucket;
  // it is a fresh-capital qualifier. The bucket remains HOLD CORE unless a real
  // trim/exit instruction is present. Gate/wait language maps to WATCH CLOSELY.
  if (raw.includes("EXIT STRENGTH")) return "EXIT STRENGTH";
  if (raw.includes("HEAVY")) return "HEAVY TRIM";
  if (raw.includes("TRIM")) return "TRIM SATELLITE";
  if (raw.includes("REDUCE") || raw.includes("USE RALLIES TO REDUCE") || raw.includes("PROTECT EXCESS")) return "TRIM SATELLITE";

  if (raw.includes("WAIT FOR DATED TRIGGER") || raw.includes("ASTRO GATE PENDING") || raw.includes("NATAL/ASTRO DATA GATE") || raw.includes("WATCHLIST") || raw.includes("WATCH ONLY") || raw.includes("WATCH CLOSELY")) return "WATCH CLOSELY";

  // Exact NO FRESH is a fresh-capital qualifier, not a separate legend tile.
  // Embedded phrases like "HOLD CORE / NO FRESH" still map to HOLD CORE for the main action bucket.
  if (raw === "NO FRESH" || raw === "WATCHLIST ONLY") return "NO FRESH";
  if (raw.includes("NO FRESH") || raw.includes("HOLD CORE / NO FRESH") || raw.includes("BLOCK FRESH") || raw.includes("AVOID FRESH") || raw.includes("PROTECT / OBSERVE")) return "HOLD CORE";
  if (raw.includes("PRESSURE FIRST") || raw.includes("AVOID") || raw.includes("WAIT")) return "WATCH CLOSELY";

  // Important: do not treat the phrase "not vertically" as a vertical-leader signal.
  // v30.04D was mapping "STAGGER ADD — deploy gradually, not vertically" into HOLD WINNER.
  if (raw.includes("STAGGER") || raw.includes("RALLY WITH CHURN") || raw.includes("BUILDING RERATING") || raw.includes("VOLATILE RERATING")) return "STAGGER ADD";
  if (raw.includes("ACCUMULATE")) return "ACCUMULATE";
  if (raw.includes("HIGH-VOLTAGE") || raw.includes("HOLD WINNER") || /VERTICAL (LEADER|RERATING|EXPANSION)/.test(raw)) return "HOLD WINNER";
  if (raw.includes("HOLD")) return "HOLD CORE";
  if (raw.includes("WATCH")) return "WATCH CLOSELY";

  return raw || "WATCH CLOSELY";
}

function actionVisual(action) {
  const label = normalizeActionLabel(action);
  const map = {
    "EXIT STRENGTH": { label, color: "#dc2626", textColor: "#ffffff", shape: "square" },
    "REDUCE / EXIT": { label: "EXIT STRENGTH", color: "#dc2626", textColor: "#ffffff", shape: "square" },
    "HEAVY TRIM": { label, color: "#ea580c", textColor: "#ffffff", shape: "square" },
    "TRIM SATELLITE": { label, color: "#facc15", textColor: "#422006", shape: "square" },
    "WATCH CLOSELY": { label, color: "#9ca3af", textColor: "#111827", shape: "octagon" },
    "NO FRESH": { label: "NO FRESH", color: "#2563eb", textColor: "#ffffff", shape: "circle" },
    "NO FRESH ENTRY": { label: "NO FRESH", color: "#2563eb", textColor: "#ffffff", shape: "circle" },
    "HOLD CORE / NO FRESH": { label: "HOLD CORE", color: "#2563eb", textColor: "#ffffff", shape: "circle" },
    "HOLD WINNER": { label, color: "#0f766e", textColor: "#ffffff", shape: "circle" },
    "HOLD CORE": { label, color: "#2563eb", textColor: "#ffffff", shape: "circle" },
    "STAGGER ADD": { label, color: "#bbf7d0", textColor: "#14532d", shape: "circle-outline" },
    "ACCUMULATE": { label, color: "#16a34a", textColor: "#ffffff", shape: "circle" },
    "AGGRESSIVE ACCUMULATION": { label, color: "#00c2c7", textColor: "#083344", shape: "star" }
  };

  return map[label] || { label, color: "#9ca3af", textColor: "#111827", shape: "octagon" };
}

function actionColor(action) {
  return actionVisual(action).color;
}

function isCoreLocked(stock) {
  return Boolean(stock?.natal_locked || String(stock?.registry_type || "").toUpperCase() === "CORE" || stock?.registry_source === "built-in-registry");
}

function stockKey(stock) {
  return stock?.id || stock?.name || stock?.symbol;
}

function normalizeStocks(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return [...data].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
}

function splitLines(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split("; ")
    .filter(Boolean);
}


function formatDateReadable(dateText) {
  const text = String(dateText || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "-";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return dateText || "-";
  return `${day} ${months[month - 1]} ${year}`;
}

function formatDatesInText(value) {
  if (value === null || value === undefined || value === "") return value || "-";
  return String(value).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => formatDateReadable(`${y}-${m}-${d}`));
}

function extractFirstIsoDate(value) {
  const match = String(value || "").match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function daysUntilDate(dateText) {
  const iso = extractFirstIsoDate(dateText);
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function todayIsoDate() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function addDaysIso(startIso, days) {
  const iso = extractFirstIsoDate(startIso) || todayIsoDate();
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function addMonthsIso(startIso, months) {
  const iso = extractFirstIsoDate(startIso) || todayIsoDate();
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

function daysBetweenIso(startIso, endIso) {
  const start = extractFirstIsoDate(startIso);
  const end = extractFirstIsoDate(endIso);
  if (!start || !end) return null;
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function signedDaysText(days) {
  if (days === null || days === undefined || !Number.isFinite(Number(days))) return "date distance unknown";
  const n = Math.round(Number(days));
  if (n === 0) return "today";
  if (n > 0) return `in ${n} day${n === 1 ? "" : "s"}`;
  const past = Math.abs(n);
  return `${past} day${past === 1 ? "" : "s"} ago`;
}

function isoFromDaysAhead(days, baseIso = todayIsoDate()) {
  const n = Number(days);
  if (!Number.isFinite(n)) return null;
  return addDaysIso(baseIso, Math.round(n));
}

function readableEventTiming({ date, days, phase, includeShadow = false } = {}) {
  const iso = extractFirstIsoDate(date) || isoFromDaysAhead(days);
  const numericDays = Number.isFinite(Number(days)) ? Math.round(Number(days)) : (iso ? daysBetweenIso(todayIsoDate(), iso) : null);
  const phaseText = phase && phase !== "-" ? String(phase).toLowerCase() : "prepare";
  if (!iso) return phase && phase !== "-" ? phase : "timing not mapped";
  const main = `${phaseText} into ${formatDateReadable(iso)} (${signedDaysText(numericDays)})`;
  if (!includeShadow) return main;
  const startIso = addDaysIso(iso, -14);
  const endIso = addDaysIso(iso, 7);
  const startDays = daysBetweenIso(todayIsoDate(), startIso);
  const endDays = daysBetweenIso(todayIsoDate(), endIso);
  return `${main}; shadow ${formatDateReadable(startIso)} (${signedDaysText(startDays)}) to ${formatDateReadable(endIso)} (${signedDaysText(endDays)})`;
}

function weekRangeLabel(index, baseIso = todayIsoDate()) {
  const start = addDaysIso(baseIso, index * 7);
  const end = addDaysIso(start, 6);
  return `Week ${index + 1} · ${formatDateReadable(start)}–${formatDateReadable(end)}`;
}

function monthLabel(index, baseIso = todayIsoDate()) {
  const iso = addMonthsIso(baseIso, index);
  const d = new Date(`${iso}T00:00:00Z`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (Number.isNaN(d.getTime())) return `Month ${index + 1}`;
  return `Month ${index + 1} · ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}


function cycleStageLabel(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "Unclear / Watch";
  if (/cycle\s*1/i.test(raw)) return raw.replace(/Cycle\s*1\s*Leader/i, "Early-cycle leader").replace(/Cycle\s*1/i, "Early cycle");
  if (/cycle\s*2/i.test(raw)) return raw.replace(/Cycle\s*2\s*Leader/i, "Mature-cycle leader").replace(/Cycle\s*2/i, "Mature cycle");
  return raw;
}

function hasNearTermDeploymentSignal(stock) {
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const tactical = tacticalScoreValue(stock);
  const readiness = String(stock?.catalyst_readiness || stock?.current_window || "").toLowerCase();
  const addAction = ["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(action);
  return addAction && tactical !== null && tactical >= 7 && (readiness.includes("active") || readiness.includes("near") || readiness.includes("prepare"));
}

function mappedWindowTimingLabel(stock) {
  const bestRaw = stock?.cycle_potential_window || stock?.recovery_window || stock?.phase_fit || stock?.best_window || "";
  const days = daysUntilDate(bestRaw);
  if (days === null) return "undated";
  if (days <= 45) return "current/near";
  if (days <= 183) return "within 6 months";
  if (days <= 245) return "within 8 months";
  if (days <= 365) return "later this cycle";
  return "distant";
}

function selectedStockFrom(stocks, selectedStockId) {
  return stocks.find(item => String(stockKey(item)) === String(selectedStockId)) || null;
}

function normalizeUiDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return raw;
}

export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [environment, setEnvironment] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [addStockMessage, setAddStockMessage] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [researchView, setResearchView] = useState(false);
  const [tableFilter, setTableFilter] = useState("ALL");
  const [tableSort, setTableSort] = useState("NAME_ASC");
  const [registryFilter, setRegistryFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleString());
  const [natalForm, setNatalForm] = useState({
    symbol: "", companyName: "", chartId: "incorporation", chartType: "incorporation",
    birthDate: "", birthTime: "11:00", city: "", country: "India", timezone: "Asia/Kolkata",
    confidence: "low", auditStatus: "manual-entry", source: "manual Fin-Lumen entry"
  });
  const [natalSaveMessage, setNatalSaveMessage] = useState("");
  const [replayInput, setReplayInput] = useState({
    ticker: "ICICIBANK.NS", date: "2026-06-05", forwardDays: "730", chartId: ""
  });
  const [replayResult, setReplayResult] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState("");
  const [replayMode, setReplayMode] = useState("QUICK");
  const [natalCandidates, setNatalCandidates] = useState([]);
  const [natalCandidateMeta, setNatalCandidateMeta] = useState(null);

  const chosenStock = useMemo(
    () => selectedStockFrom(stocks, selectedStock),
    [stocks, selectedStock]
  );

  const displayedStocks = useMemo(
    () => filterAndSortStocks(stocks, { tableFilter, tableSort, registryFilter }),
    [stocks, tableFilter, tableSort, registryFilter]
  );

  useEffect(() => {
    if (!chosenStock) {
      return;
    }

    setNatalSaveMessage("");
    const chartType = chosenStock.natal_chart_type || chosenStock.chartType || "incorporation";
    const listingLike = String(chartType).includes("listing") || String(chartType).includes("record-date");
    setNatalForm({
      symbol: chosenStock.name || chosenStock.symbol || "",
      companyName: chosenStock.natal_company_name || chosenStock.companyName || chosenStock.name || "",
      chartId: chosenStock.natal_chart_id || chosenStock.chartId || chartType,
      chartType,
      birthDate: chosenStock.natal_birth_date || chosenStock.birthDate || chosenStock.incorporationDate || chosenStock.listingDate || "",
      birthTime: chosenStock.natal_birth_time || chosenStock.birthTime || (listingLike ? "09:15" : "11:00"),
      city: chosenStock.natal_city || chosenStock.city || (listingLike ? "Mumbai" : ""),
      country: chosenStock.natal_country || "India",
      timezone: chosenStock.natal_timezone || "Asia/Kolkata",
      confidence: String(chosenStock.natal_confidence || "low").toLowerCase(),
      auditStatus: chosenStock.natal_audit_status || "manual-entry",
      source: chosenStock.natal_source || "manual Fin-Lumen entry"
    });
  }, [chosenStock]);

  const fetchMacroEnvironment = async () => {
    const res = await fetch("/api/macro", {
      cache: "no-store"
    });

    const data = await res.json();

    if (!data?.success) {
      throw new Error(data?.error || "Macro API failed");
    }

    setEnvironment({
      today: data.date,
      metadata: data.metadata || {},
      currentClimate: data.environment || "-",
      pressureScore: data.pressureScore ?? 0,
      expansionScore: data.expansionScore ?? 0,
      volatilityScore: data.volatility ?? 0,
      moonEnvironment: data.moonEnvironment || "-",
      moonSign: data.moonSign || "-",
      recommendation: data.recommendation || "-",
      transits: data.transits || {},
      currentPositions: data.transits?.positions || {},
      behaviourOutline: data.behaviourOutline || [],
      macroNarrative: data.macroNarrative || null,
      macroReadable: data.macroReadable || null,
      macroCards: data.macroCards || { activeCards: [], incomingCards: [] },
      macroAnalytics: data.macroAnalytics || {},
      nextShift: data.nextShift || null,
      activeEvents: data.activeEvents || [],
      phases: data.phases || []
    });
  };

  const fetchStocks = async (force = false) => {
    const res = await fetch(`/api/get-stocks${force ? "?refresh=1" : ""}`, {
      cache: "no-store"
    });

    const data = await res.json();
    setStocks(normalizeStocks(data));
  };

  const refreshAll = async (force = false) => {
    setLoading(true);

    try {
      await Promise.all([
        fetchStocks(force),
        fetchMacroEnvironment()
      ]);

      setLastRefreshed(new Date().toLocaleString());
    } catch (err) {
      console.log(err);
      setEnvironment({
        today: "-",
        currentClimate: "Macro API unavailable",
        pressureScore: 0,
        expansionScore: 0,
        volatilityScore: 0,
        moonEnvironment: "-",
        recommendation: "-",
        currentPositions: {},
        behaviourOutline: [
          "Macro environment could not be loaded. Open /api/macro to inspect the server error."
        ],
        macroNarrative: null,
        macroReadable: null,
        macroCards: { activeCards: [], incomingCards: [] },
        macroAnalytics: {},
        nextShift: null,
        activeEvents: [],
        phases: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const saveNatalData = async () => {
    setNatalSaveMessage("Saving natal data...");

    try {
      const payload = {
        ...natalForm,
        birthDate: normalizeUiDate(natalForm.birthDate)
      };

      const res = await fetch("/api/upsert-natal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let data = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { success: false, error: text || `HTTP ${res.status}` };
      }

      if (!res.ok && !data?.success) {
        setNatalSaveMessage(data?.error || `Natal save failed with HTTP ${res.status}.`);
        return;
      }

      if (!data?.success) {
        setNatalSaveMessage(data?.error || "Natal save failed. Supabase natal_registry table may need to be created.");
        return;
      }

      const storage = data?.storage || "supabase";
      const savedForSession = storage === "runtime-memory";
      const baseMessage = savedForSession
        ? (data?.warning || data?.note || "Natal data saved for this session. Supabase persistence is unavailable. The project can be active while permanent writes are blocked by missing SERVICE_ROLE_KEY, RLS policy, table/schema mismatch, or env-variable mismatch.")
        : (data?.warning || "Natal data saved.");

      setNatalSaveMessage(`${baseMessage} Refreshing stock computation...`);
      try {
        await fetchStocks(true);
        setNatalSaveMessage(`${baseMessage} Stock computation refreshed.`);
      } catch (refreshErr) {
        setNatalSaveMessage(`${baseMessage} Refresh failed: ${refreshErr.message || refreshErr}`);
      }
    } catch (err) {
      setNatalSaveMessage(`Natal save could not reach the app API: ${err.message || err}. Please redeploy and check /api/upsert-natal.`);
    }
  };

  useEffect(() => {
    const ticker = String(replayInput.ticker || "").trim();
    if (!ticker) {
      setNatalCandidates([]);
      setNatalCandidateMeta(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/natal-candidates?ticker=${encodeURIComponent(ticker)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data?.success) {
          setNatalCandidates(data.candidates || []);
          setNatalCandidateMeta(data);
        } else {
          setNatalCandidates([]);
          setNatalCandidateMeta(null);
        }
      } catch (_) {
        if (!cancelled) {
          setNatalCandidates([]);
          setNatalCandidateMeta(null);
        }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [replayInput.ticker]);

  const runReplayLab = async () => {
    setReplayLoading(true);
    setReplayError("");

    try {
      const params = new URLSearchParams({
        ticker: replayInput.ticker || "",
        date: replayInput.date || "",
        forwardDays: replayInput.forwardDays || "90",
        chartId: replayInput.chartId || ""
      });

      const res = await fetch(`/api/replay-lab?${params.toString()}`, {
        cache: "no-store"
      });

      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error || "Replay Lab failed");
      }

      setReplayResult(data);
    } catch (err) {
      setReplayError(err.message);
      setReplayResult(null);
    } finally {
      setReplayLoading(false);
    }
  };

  const activeEvents = environment?.activeEvents || [];
  const futureTransits = environment?.phases || [];
  const nextMacro = environment?.nextShift || futureTransits[0] || null;

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 10 }}>Fin-Lumen Pure Astro</h1>

      <div style={controlStyle}>
        <input
          type="text"
          placeholder="Add Stock (e.g. TCS.NS)"
          value={newStock}
          onChange={(event) => setNewStock(event.target.value)}
          style={inputStyle}
        />

        <button
          onClick={async () => {
            if (!newStock) return;
            setAddStockMessage("Adding stock...");

            try {
              const res = await fetch("/api/add-stock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newStock })
              });
              const data = await res.json();
              if (!data?.success) {
                setAddStockMessage(data?.error || "Could not add stock.");
                return;
              }
              setNewStock("");
              setAddStockMessage(data?.warning || "Stock added. Add natal data next if needed.");
              await fetchStocks(true);
            } catch (err) {
              setAddStockMessage(err.message || "Could not add stock.");
            }
          }}
          style={buttonStyle("#16a34a")}
        >
          Add Stock
        </button>

        {addStockMessage ? <span style={smallMutedStyle}>{addStockMessage}</span> : null}

        <select
          value={selectedStock}
          onChange={(event) => setSelectedStock(event.target.value)}
          style={inputStyle}
        >
          <option value="">Select Stock</option>
          {stocks.map(stock => (
            <option key={stockKey(stock)} value={stockKey(stock)}>
              {stock.name}
            </option>
          ))}
        </select>

        <button
          onClick={async () => {
            if (!selectedStock || isCoreLocked(chosenStock)) return;

            const res = await fetch("/api/delete-stock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: selectedStock })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || data?.locked) {
              alert(data?.error || "This stock cannot be removed from the app.");
              return;
            }

            setSelectedStock("");
            await fetchStocks();
          }}
          disabled={!selectedStock || isCoreLocked(chosenStock)}
          title={isCoreLocked(chosenStock) ? "Core registry stock — cannot be removed from the app" : "Remove selected user-added stock"}
          style={buttonStyle(!selectedStock || isCoreLocked(chosenStock) ? "#9ca3af" : "#dc2626")}
        >
          {isCoreLocked(chosenStock) ? "Core Locked" : "Remove Stock"}
        </button>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              await fetch("/api/update-all");
              await refreshAll(true);
            } finally {
              setLoading(false);
            }
          }}
          style={buttonStyle("#2563eb")}
        >
          {loading ? "Updating..." : "Update All"}
        </button>
      </div>

      <p>
        <strong>Last Updated:</strong> {lastRefreshed}
      </p>

      <CollapsibleSection
        title="Macro Astro Environment"
        subtitle="Current macro weather and the next 30-day transit map."
        defaultOpen
      >
        <div style={macroGridStyle}>
          <MacroPanel environment={environment} activeEvents={activeEvents} researchView={researchView} />
          <NextMacroPanel nextMacro={nextMacro} futureTransits={futureTransits} environment={environment} researchView={researchView} />
        </div>
      </CollapsibleSection>

      <section style={alwaysOnSectionStyle}>
        <div style={alwaysOnHeaderStyle}>
          <div>
            <h2 style={alwaysOnTitleStyle}>Action Legend</h2>
            <p style={alwaysOnSubtitleStyle}>Risk-tolerance buckets and capital posture guide.</p>
          </div>
        </div>
        <ActionLegend />
      </section>

      <CollapsibleSection
        title="Replay Lab"
        subtitle="Run historical astro snapshots against TradingView replay charts."
        defaultOpen={false}
      >
        <ReplayLab
          input={replayInput}
          setInput={setReplayInput}
          result={replayResult}
          error={replayError}
          loading={replayLoading}
          onRun={runReplayLab}
          researchView={researchView}
          replayMode={replayMode}
          setReplayMode={setReplayMode}
          natalCandidates={natalCandidates}
          natalCandidateMeta={natalCandidateMeta}
        />
      </CollapsibleSection>

      {chosenStock ? (
        <NatalEditor
          stock={chosenStock}
          form={natalForm}
          setForm={setNatalForm}
          onSave={saveNatalData}
          message={natalSaveMessage}
        />
      ) : null}

      <CollapsibleSection
        title="Top Picks / Scanner Windows"
        subtitle="Quick capital-priority views from the current astro scan."
        defaultOpen
      >
        <PriorityPanels
          stocks={stocks}
          onSelectStock={setSelectedStock}
          setTableFilter={setTableFilter}
          setTableSort={setTableSort}
        />
      </CollapsibleSection>

      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Stock-Specific Astro Behaviour</h2>
          <p style={subtitleStyle}>
            Actions are computed from natal profile, current ephemeris transits, upcoming macro catalysts, overlap intensity, and catalyst windows. Rows without natal data are marked explicitly.
          </p>
        </div>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={researchView}
            onChange={() => setResearchView(!researchView)}
          />
          Research View — full table
        </label>
      </div>

      {chosenStock ? (
        <StockDetailPanel stock={chosenStock} onClose={() => setSelectedStock("")} />
      ) : null}

      <CollapsibleSection
        title="Scanner Filters"
        subtitle="Narrow the universe by action, score, catalyst timing, registry state, or pressure."
        defaultOpen
      >
        <TableControls
          totalCount={stocks.length}
          visibleCount={displayedStocks.length}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          tableSort={tableSort}
          setTableSort={setTableSort}
          registryFilter={registryFilter}
          setRegistryFilter={setRegistryFilter}
        />
      </CollapsibleSection>

      <StockTable
        stocks={displayedStocks}
        researchView={researchView}
        selectedStock={selectedStock}
        onSelectStock={setSelectedStock}
      />
    </div>
  );
}


function toneColor(tone) {
  const colors = {
    pressure: "#fee2e2",
    volatility: "#fef3c7",
    reset: "#ede9fe",
    expansion: "#dcfce7",
    transition: "#e0f2fe",
    monitoring: "#f3f4f6"
  };

  return colors[tone] || "#f3f4f6";
}

function toneBorder(tone) {
  const colors = {
    pressure: "#ef4444",
    volatility: "#f59e0b",
    reset: "#8b5cf6",
    expansion: "#22c55e",
    transition: "#0ea5e9",
    monitoring: "#9ca3af"
  };

  return colors[tone] || "#9ca3af";
}

function MacroEventCard({ item, compact = false }) {
  if (!item) {
    return null;
  }

  const meaning = item.behaviour || item.likelyBehaviour || item.notes || "Monitor stock-specific natal contacts.";

  return (
    <div style={{ ...macroEventCardStyle, background: toneColor(item.tone), borderLeft: `5px solid ${toneBorder(item.tone)}` }}>
      <strong>{item.label || "Macro event"}</strong>
      <div style={{ marginTop: 4, color: "#374151" }}>
        {(item.phase || item.timing || "ACTIVE")} · {item.daysRemaining !== undefined ? `~${item.daysRemaining} days` : "timing pending"}
        {item.exactIst ? ` · IST ${String(item.exactIst).replace("T", " ").slice(0, 16)}` : item.date ? ` · ${item.date}` : ""}
      </div>
      <div style={{ marginTop: 6 }}>
        <strong>Meaning:</strong> {compact ? meaning.split("; ")[0] : meaning}
      </div>
      {item.eventPrecision || item.precisionNote ? (
        <div style={{ marginTop: 5, fontSize: 11, color: "#6b7280" }}>
          Precision: {item.eventPrecision || "ephemeris-derived"}{item.precisionNote ? ` · ${item.precisionNote}` : ""}
        </div>
      ) : null}
    </div>
  );
}


function MacroAnalyticsPanel({ analytics }) {
  if (!analytics) {
    return null;
  }

  const shadow = analytics.shadowWindows || {};
  const clusters = analytics.eventClusters || [];
  const upcomingAspects = analytics.upcomingAspectCandidates || [];
  const mainCluster = clusters[0];
  const nextAspect = upcomingAspects[0];

  return (
    <div style={analyticsBoxStyle}>
      <strong>Macro Structure:</strong>
      <div><strong>Signature:</strong> {analytics.environmentSignature || "Quiet macro sky"}</div>
      <div><strong>Density:</strong> {analytics.clusterDensity ?? 0} active/near events</div>
      <div><strong>Shadow:</strong> {shadow.activeLabels?.length ? shadow.activeLabels.join(" · ") : "No major shadow active"}</div>
      {mainCluster ? (
        <div><strong>Main cluster:</strong> {mainCluster.labels.slice(0, 3).join(" + ")}</div>
      ) : null}
      {nextAspect ? (
        <div><strong>Next aspect:</strong> {nextAspect.label} · {nextAspect.date} · ~{nextAspect.daysRemaining} days</div>
      ) : null}
    </div>
  );
}



function ReadableEventCard({ event, title }) {
  if (!event) {
    return null;
  }

  return (
    <div style={{ ...readableCardStyle, background: toneColor(event.tone), borderLeft: `5px solid ${toneBorder(event.tone)}` }}>
      {title ? <div style={miniLabelStyle}>{title}</div> : null}
      <strong>{event.label || "Macro event"}</strong>
      <div style={smallMutedStyle}>{event.timing || event.date || "timing pending"}{event.exactIst ? ` · IST ${String(event.exactIst).replace("T", " ").slice(0, 16)}` : ""}</div>
      <div style={{ marginTop: 6 }}>{event.meaning || event.behaviour || event.notes || "Monitor stock-specific natal contacts."}</div>
    </div>
  );
}

function CompactSky({ positions }) {
  return (
    <div style={compactSkyStyle}>
      <span><strong>Jupiter</strong> {formatDegree(positions.jupiter)}</span>
      <span><strong>Saturn</strong> {formatDegree(positions.saturn)}</span>
      <span><strong>Mercury</strong> {formatDegree(positions.mercury)}</span>
      <span><strong>Rahu/Ketu</strong> {formatDegree(positions.rahu)} / {formatDegree(positions.ketu)}</span>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} style={collapsibleSectionStyle}>
      <summary style={collapsibleSummaryStyle}>
        <span style={collapsibleTitleStyle}>▾ {title}</span>
        {subtitle ? <small style={collapsibleSubtitleStyle}>{subtitle}</small> : null}
      </summary>
      <div style={collapsibleBodyStyle}>{children}</div>
    </details>
  );
}


function macroEventDays(event) {
  const value = Number(event?.daysRemaining ?? event?.days);
  return Number.isFinite(value) ? value : null;
}

function macroEventDateLabel(event) {
  const exact = event?.exactIst || event?.exact || event?.date;
  if (exact) return String(exact).replace("T", " ").slice(0, 16);
  return event?.timing || "date pending";
}

function macroEventName(event) {
  return siderealEventLabel(event?.label || event?.name || event?.title || "macro window");
}

function macroEventRole(event) {
  const text = `${event?.label || ""} ${event?.name || ""} ${event?.tone || ""} ${event?._role || ""} ${event?.meaning || ""} ${event?.behaviour || ""}`.toLowerCase();
  if (/eclipse/.test(text)) return "eclipse";
  if (/retrograde/.test(text)) return "retrograde";
  if (/crisis|node|rahu|ketu|mars.*square|square.*mars/.test(text)) return "crisis";
  if (/saturn.*venus|venus.*saturn|support|repair/.test(text)) return "support";
  if (/jupiter|venus|trine|sextile|opportunity|expansion/.test(text)) return "expansion";
  if (/risk|pressure|square|opposition/.test(text)) return "pressure";
  if (/ingress|sun|mercury|mars/.test(text)) return "transition";
  return "transition";
}

function macroForwardCategory(event) {
  const role = macroEventRole(event);
  if (role === "eclipse") return "Eclipse / reset watch";
  if (role === "crisis") return "Crisis-node / volatility gate";
  if (role === "retrograde") return "Retrograde / reversal gate";
  if (role === "pressure") return "Pressure / trim gates";
  if (role === "support") return "Support / repair gate";
  if (role === "expansion") return "Expansion gate";
  return "Transition / rotation gate";
}

function macroForwardAction(event) {
  const role = macroEventRole(event);
  if (role === "eclipse") return "reset risk; protect excess before exactness";
  if (role === "crisis") return "volatility/reversal risk; avoid fresh chase";
  if (role === "retrograde") return "review/retest window; size only after catalyst absorption";
  if (role === "pressure") return "protect heat in directly-hit charts";
  if (role === "support") return "selective repair/support for receptive natal charts";
  if (role === "expansion") return "stagger into clean natal leadership only";
  return "rotation gate; stock-specific natal contact decides";
}

function macroForwardWatchItems(environment) {
  const readable = environment?.macroReadable || {};
  const analytics = environment?.macroAnalytics || {};
  const pool = [
    ...(Array.isArray(readable.next30Days) ? readable.next30Days : []),
    ...(Array.isArray(environment?.macroCards?.incomingCards) ? environment.macroCards.incomingCards : []),
    readable.mainRisk ? { ...readable.mainRisk, _role: "risk" } : null,
    readable.mainOpportunity ? { ...readable.mainOpportunity, _role: "opportunity" } : null,
    ...(Array.isArray(analytics.eventClusters) ? analytics.eventClusters.map(c => ({ label: c.labels?.join(" + ") || "Macro cluster", timing: c.date || c.timing, date: c.date, daysRemaining: c.daysRemaining, tone: "volatility", _role: "cluster", behaviour: "Cluster gate: multiple macro events are crowded; expect amplification in stocks whose natal charts are hit." })) : [])
  ].filter(Boolean)
    .map(event => ({ ...event, _days: macroEventDays(event) }))
    .filter(event => event._days !== null && event._days >= 0 && event._days <= 30);

  const ranked = pool
    .map(event => {
      const role = macroEventRole(event);
      const rankMap = { eclipse: 9, crisis: 8, retrograde: 7, pressure: 6, expansion: 5, support: 4, transition: 3 };
      const clusterBoost = /cluster|shadow|eclipse|crisis|rahu|ketu|square|retrograde/i.test(`${event.label || ""} ${event.name || ""} ${event._role || ""}`) ? 1 : 0;
      return { ...event, _role2: role, _rank: (rankMap[role] || 2) + clusterBoost };
    })
    .sort((a, b) => (b._rank - a._rank) || (a._days - b._days));

  const unique = [];
  const seen = new Set();
  for (const event of ranked) {
    const key = `${macroEventName(event)}|${Math.round(event._days * 10) / 10}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
    if (unique.length >= 7) break;
  }
  return unique.sort((a, b) => a._days - b._days);
}

function macroForwardRecommendation(items) {
  if (!items.length) return "Recommendation: HOLD CORE — no major 30-day macro gate is dominant; let stock-specific natal catalysts decide deployment.";
  const roles = new Set(items.map(item => macroEventRole(item)));
  const hasCrisis = roles.has("crisis") || roles.has("eclipse") || roles.has("retrograde") || roles.has("pressure");
  const hasExpansion = roles.has("expansion") || roles.has("support");
  if (hasCrisis && hasExpansion) {
    return "Recommendation: HOLD CORE; stagger only into stocks with clean natal expansion, low dormancy, and no hard pressure. Protect excess around crisis-node or retrograde gates.";
  }
  if (hasCrisis) {
    return "Recommendation: HOLD CORE / USE ASTRO GATES — protect excess in directly-hit charts; avoid fresh chase until pressure clears.";
  }
  if (hasExpansion) {
    return "Recommendation: STAGGER ADD selectively — only where natal leadership is active and dormancy is low.";
  }
  return "Recommendation: HOLD CORE — transition/rotation field; stock-specific natal contacts decide winners.";
}

function compactMacroForwardItems(environment) {
  const items = macroForwardWatchItems(environment);
  const chosen = [];
  const desired = ["eclipse", "crisis", "retrograde", "pressure", "expansion", "support", "transition"];
  for (const role of desired) {
    const item = items.find(event => macroEventRole(event) === role && !chosen.includes(event));
    if (item) chosen.push(item);
    if (chosen.length >= 4) break;
  }
  for (const item of items) {
    if (chosen.length >= 4) break;
    if (!chosen.includes(item)) chosen.push(item);
  }
  return chosen.sort((a, b) => a._days - b._days);
}

function MacroForwardWatch({ environment }) {
  const items = compactMacroForwardItems(environment);
  const recommendation = macroForwardRecommendation(items);
  if (!items.length) {
    return (
      <div style={insightBoxStyle}>
        <strong>Key 30-day astro gates:</strong>
        <div style={{ marginTop: 6 }}>No major expansion, pressure, eclipse, crisis-node, retrograde, or cluster gate is active.</div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid #d6dee8",
            fontWeight: "bold",
            display: "flex",
            gap: 6,
            alignItems: "flex-start"
          }}
        >
          <span aria-hidden="true">◎</span>
          <span>{recommendation}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={insightBoxStyle}>
      <strong>Key 30-day astro gates:</strong>
      <div style={{ marginTop: 6, display: "grid", gap: 5 }}>
        {items.map((event, index) => (
          <div key={`${macroEventName(event)}-${index}`}>
            <strong>{macroForwardCategory(event)}:</strong> {macroEventName(event)} · {event.timing || `${event._days.toFixed(1)} days`}
            <span style={smallMutedStyle}> — {macroForwardAction(event)}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid #d6dee8",
          fontWeight: "bold",
          display: "flex",
          gap: 6,
          alignItems: "flex-start"
        }}
      >
        <span aria-hidden="true">◎</span>
        <span>{recommendation}</span>
      </div>
    </div>
  );
}


function MacroPanel({ environment, activeEvents, researchView }) {
  const positions = environment?.currentPositions || {};
  const narrative = environment?.macroNarrative || {};
  const readable = environment?.macroReadable || {};
  const headline = readable.headline || narrative.headline || environment?.currentClimate || "-";
  const activeNow = readable.activeNow || [];
  const bg =
    (environment?.pressureScore ?? 0) >= 18
      ? "#fff2f0"
      : (environment?.expansionScore ?? 0) >= 18
        ? "#f0fdf4"
        : "#f5f9ff";

  return (
    <div style={cardStyle(bg)}>
      <h2 style={cardTitleStyle}>🌌 Macro Astro Environment</h2>

      <div style={lineGridStyle}>
        <div style={macroHeadlineStyle}>{headline}</div>

        <div style={scoreStripStyle}>
          <div><strong>Date</strong><br />{environment?.today || "-"}</div>
          <div><strong>Environment</strong><br />{environment?.currentClimate || "-"}</div>
          <div><strong>Pressure</strong><br />{environment?.pressureScore ?? "-"}</div>
          <div><strong>Expansion</strong><br />{environment?.expansionScore ?? "-"}</div>
          <div><strong>Volatility</strong><br />{environment?.volatilityScore ?? "-"}</div>
          <div><strong>Moon</strong><br />{environment?.moonEnvironment || "-"}</div>
        </div>

        <CompactSky positions={positions} />

        <div style={twoColumnStyle}>
          <ReadableEventCard event={readable.mainOpportunity} title="Main opportunity" />
          <ReadableEventCard event={readable.mainRisk} title="Main risk" />
        </div>

        <div style={insightBoxStyle}>
          <strong>What this means for stocks:</strong>
          <div style={{ marginTop: 6 }}>{readable.stockImplication || narrative.likelyBehaviour || "Stock-specific natal contacts decide the behaviour."}</div>
        </div>

        <div>
          <strong>Active now:</strong>
          {activeNow.length ? (
            <div style={miniEventListStyle}>
              {activeNow.slice(0, 3).map((event, index) => (
                <ReadableEventCard key={index} event={event} />
              ))}
            </div>
          ) : (
            <div style={stableBoxStyle}>No dominant active macro cluster. Stock-specific natal activations matter more.</div>
          )}
        </div>

        <div>
          <strong>Shadow / cluster notes:</strong>
          {(readable.shadowClusterNotes || []).slice(0, 3).map((line, index) => (
            <div key={index} style={{ paddingLeft: 10, marginTop: 5 }}>{line}</div>
          ))}
        </div>

        <div>
          <strong>Recommendation:</strong> {narrative.recommendedPosture || environment?.recommendation || "-"}
        </div>


        {researchView ? (
          <>
            <div>
              <strong>Full Current Sidereal Sky:</strong>
              <div style={skyBoxStyle}>
                Sun {formatDegree(positions.sun)} · Moon {formatDegree(positions.moon)}
                <br />
                Mercury {formatDegree(positions.mercury)} · Venus {formatDegree(positions.venus)} · Mars {formatDegree(positions.mars)}
                <br />
                Jupiter {formatDegree(positions.jupiter)} · Saturn {formatDegree(positions.saturn)}
                <br />
                Rahu {formatDegree(positions.rahu)} · Ketu {formatDegree(positions.ketu)}
              </div>
            </div>
            <MacroAnalyticsPanel analytics={environment?.macroAnalytics} />
            <div>
              <strong>Behaviour Outline:</strong>
              {(environment?.behaviourOutline || []).map((line, index) => (
                <div key={index} style={{ paddingLeft: 10, marginTop: 6 }}>{line}</div>
              ))}
            </div>
          </>
        ) : null}

        <div style={metadataStyle}>
          Source: {environment?.metadata?.ephemeris || "ephemeris"} · {environment?.metadata?.zodiac || "sidereal"} · {environment?.metadata?.ayanamsa || "Lahiri"} · no hard-coded macro events
        </div>
      </div>
    </div>
  );
}


function siderealEventLabel(label = "") {
  const text = String(label || "Macro event");
  if (/ingress/i.test(text) && !/sidereal|lahiri/i.test(text)) return `Sidereal Lahiri ${text}`;
  return text;
}

function macroTransitExpectation(event = {}) {
  const text = `${event.label || ""} ${event.meaning || ""} ${event.behaviour || ""} ${event.notes || ""}`;
  if (/saturn.*mercury|mercury.*saturn|square.*mercury|mercury.*square/i.test(text)) {
    return "Expect slower decisions, caution, review, and stress-testing of weak narratives.";
  }
  if (/jupiter.*venus|venus.*jupiter/i.test(text)) {
    return "Expect liquidity, preference for quality, and valuation expansion where natal Venus/Jupiter is receptive.";
  }
  if (/sun.*rahu|rahu.*sun/i.test(text)) {
    return "Expect narrative heat, attention spikes, volatility, and stock-specific amplification.";
  }
  if (/mars.*ingress|mars/i.test(text) && /taurus|aries/i.test(text)) {
    return "Expect momentum to change texture; force moves from fast impulse toward more grounded follow-through.";
  }
  if (/sun.*ingress|sidereal.*sun/i.test(text)) {
    return "Expect a broad tone shift; leadership, visibility, and sector identity themes may rotate.";
  }
  if (/mercury.*ingress|sidereal.*mercury/i.test(text)) {
    return "Expect a communication, data, trading, and narrative shift; technology and financial-flow charts may respond faster.";
  }
  if (/saturn.*venus|venus.*saturn/i.test(text)) {
    return "Expect disciplined expansion, valuation repair, and selective support where natal Venus/Saturn contacts are receptive.";
  }
  if (/square|opposition|risk|compression|stress/i.test(text)) {
    return "Expect pressure, digestion, or stress-testing; stock-specific natal resilience decides severity.";
  }
  if (/trine|sextile|jupiter|venus|opportunity|expansion/i.test(text)) {
    return "Expect a supportive macro window, but deployability depends on natal activation and cycle stage.";
  }
  return event.meaning || event.behaviour || event.notes || "Monitor stock-specific natal contacts; macro weather alone is not a stock signal.";
}

function NextMacroPanel({ nextMacro, futureTransits, environment, researchView }) {
  const readable = environment?.macroReadable || {};
  const next30 = readable.next30Days || [];
  const in30 = next30.filter(event => {
    const days = macroEventDays(event);
    return days !== null && days >= 0 && days <= 30;
  });
  const main = in30[0] || nextMacro || readable.mainOpportunity || next30[0];

  return (
    <div style={cardStyle("#f9fafb")}>
      <h2 style={cardTitleStyle}>✨ Next 30 Days</h2>

      <div style={lineGridStyle}>
        <ReadableEventCard event={main} title="Primary window" />
        <MacroForwardWatch environment={environment} />

        {researchView ? (
          <div>
            <strong>Research event feed:</strong>
            {(environment?.macroCards?.incomingCards || futureTransits || []).slice(0, 6).map((transit, index) => (
              <MacroEventCard key={index} item={transit} compact />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}


function ActionShape({ visual, size = 16 }) {
  const base = {
    display: "inline-block",
    width: size,
    height: size,
    flex: "0 0 auto",
    background: visual.color
  };

  if (visual.shape === "circle") {
    return <span style={{ ...base, borderRadius: "50%" }} />;
  }

  if (visual.shape === "circle-outline") {
    return <span style={{ ...base, borderRadius: "50%", background: "#f0fdf4", border: `3px solid ${visual.color}` }} />;
  }

  if (visual.shape === "octagon") {
    return <span style={{ ...base, clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }} />;
  }

  if (visual.shape === "star") {
    return <span style={{ ...base, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)" }} />;
  }

  return <span style={base} />;
}

function ActionBadge({ action, compact = false }) {
  const visual = actionVisual(action);
  const displayLabel = visual.label;

  return (
    <span
      style={{
        ...actionBadgeStyle,
        background: visual.color,
        color: visual.textColor || "#111827",
        padding: compact ? "6px 9px" : "8px 11px",
        fontSize: compact ? 10.5 : 12,
        maxWidth: compact ? 92 : undefined,
        whiteSpace: compact ? "normal" : "nowrap",
        lineHeight: compact ? 1.15 : 1.2,
        justifyContent: "center",
        textAlign: "center",
        wordBreak: "normal",
        overflowWrap: "anywhere",
        border: visual.label === "STAGGER ADD" ? "1px solid #22c55e" : "1px solid rgba(17,24,39,0.12)"
      }}
      title={visual.label}
    >
      {visual.label === "AGGRESSIVE ACCUMULATION" ? <span aria-hidden="true">★</span> : null}
      <span>{displayLabel}</span>
    </span>
  );
}


function resolvedActionParts(stock) {
  if (stock?.decision_v35) {
    const capital = stock.decision_v35.capitalDecision || {};
    const existingMap = { HOLD_CORE: "HOLD CORE", HOLD_ADD_IN_PARTS: "HOLD / ADD IN PARTS", HOLD_REVIEW: "HOLD / REVIEW", TRIM_PROTECT: "TRIM / PROTECT" };
    const freshMap = { STAGGER_ADD: "STAGGER ADD", PART_SIZED_ONLY: "PART-SIZED ONLY", NO_FRESH: "NO FRESH" };
    const corePosture = existingMap[capital.existingPosition] || "HOLD CORE";
    const freshCapital = freshMap[capital.freshTacticalCapital] || "NO FRESH";
    return { corePosture, freshCapital, tacticalBucket: corePosture, decision: finalStockDecision(stock) };
  }
  const decision = finalStockDecision(stock);
  const tactical = decision.tacticalAction || stock?.action || "WATCH CLOSELY";
  const tacticalBucket = normalizeActionLabel(tactical);
  const leadership = Number(stock?.leadership_probability ?? stock?.expansion_score ?? 0);
  const tacticalScore = tacticalScoreValue(stock) ?? 0;
  const strategic = strategicScoreValue(stock) ?? Number(stock?.strategic_score ?? stock?.investment_score ?? stock?.final_score ?? 0);
  const dormancy = capitalDormancyRiskValue(stock);
  const pressure = String(stock?.current_pressure || "").toUpperCase();
  const correction = correctionModeValue(stock).toUpperCase();
  const highPressure = /HIGH|BREAK|VERY HIGH/.test(pressure) || /PRICE CORRECTION/.test(correction);

  let corePosture = "HOLD CORE";
  if (["EXIT STRENGTH", "HEAVY TRIM", "TRIM SATELLITE"].includes(tacticalBucket)) {
    corePosture = tacticalBucket;
  } else if (tacticalBucket === "NO FRESH ENTRY" || tacticalBucket === "HOLD CORE / NO FRESH") {
    corePosture = "HOLD CORE";
  } else if (tacticalBucket === "WATCH CLOSELY") {
    const explicitGate = /WAIT|GATE|WATCHLIST|WATCH CLOSELY|SUPPORTIVE BUT MUTED/i.test(String(tactical));
    corePosture = explicitGate ? "WATCH CLOSELY" : (/NO MAJOR/.test(correction) && !highPressure ? "HOLD CORE" : "WATCH CLOSELY");
  } else if (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(tacticalBucket)) {
    const lowDormancy = dormancy === "LOW";
    const leaderCoreText = /Core:\s*hold\/add|hold winner/i.test(decision.capitalPosture || "");
    const activeLeader = leadership >= 70 && tacticalScore >= 7.0 && strategic >= 7.5 && lowDormancy && !highPressure;
    corePosture = (activeLeader || leaderCoreText) ? "HOLD WINNER" : "HOLD CORE";
  } else if (tacticalBucket === "HOLD WINNER") {
    corePosture = "HOLD WINNER";
  } else if (tacticalBucket === "HOLD CORE") {
    corePosture = "HOLD CORE";
  }

  let freshCapital = tacticalBucket;
  if (corePosture === "HOLD WINNER" && tacticalBucket === "HOLD WINNER") freshCapital = "STAGGER ADD";
  if (corePosture === "HOLD CORE" && tacticalBucket === "HOLD CORE") freshCapital = "WATCH CLOSELY";
  if (["EXIT STRENGTH", "HEAVY TRIM", "TRIM SATELLITE"].includes(corePosture)) freshCapital = "NO FRESH";
  if (/NO FRESH|BLOCK FRESH|AVOID FRESH|HOLD CORE \/ NO FRESH|PROTECT \/ OBSERVE/i.test(String(tactical))) freshCapital = "NO FRESH";

  // Action bucket describes the existing-position/tactical posture; fresh capital is separate.
  return { corePosture, freshCapital, tacticalBucket: corePosture, decision };
}

function coreFreshTableText(stock) {
  const parts = resolvedActionParts(stock);
  return `${parts.corePosture} / ${parts.freshCapital}`;
}

function ActionLegend() {
  const items = [
    ["EXIT STRENGTH", "hard-pressure capital protection", "Use strength to reduce when reset risk is active."],
    ["HEAVY TRIM", "20–35% drawdown likely", "Protect capital."],
    ["TRIM SATELLITE", "15–20% correction likely", "Reduce heat, keep exposure."],
    ["WATCH CLOSELY", "Mapped catalyst gate", "Hold core; add only after the specified astro gate absorbs."],
    ["HOLD CORE", "Normal volatility / no fresh", "Stay invested if held; fresh capital is added only when the tactical line permits it."],
    ["STAGGER ADD", "Early opportunity", "Begin deployment gradually."],
    ["ACCUMULATE", "Strong opportunity", "Add meaningfully."],
    ["AGGRESSIVE ACCUMULATION", "Rare high-conviction setup", "Deploy aggressively."]
  ];

  return (
    <div style={legendWrapStyle}>
      <div style={legendGridStyle}>
        {items.map(([title, riskBand, instruction]) => {
          const visual = actionVisual(title);
          return (
            <div
              key={title}
              style={{
                ...legendItemStyle,
                background: visual.color,
                color: visual.textColor || "#111827",
                border: "1px solid rgba(17,24,39,0.12)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: "bold", marginBottom: 6 }}>
                <ActionShape visual={visual} size={12} />
                <span>{visual.label}</span>
              </div>
              <div style={{ fontWeight: "bold", lineHeight: 1.2 }}>{riskBand}<sup>*</sup></div>
              <div style={{ lineHeight: 1.2 }}>{instruction}</div>
            </div>
          );
        })}
      </div>
      <p style={{ ...subtitleStyle, marginTop: 10, marginBottom: 0, fontSize: 12 }}>
        * Percentage bands are practical risk-tolerance guides, not exact astro price forecasts. Detailed core/fresh-capital split appears inside each expanded stock card.
      </p>
    </div>
  );
}


function replayToneStyle(summary) {
  const regime = String(summary?.regime || "").toLowerCase();
  const expression = String(summary?.expression || "").toLowerCase();

  if (regime.includes("pressure") || expression.includes("fragile")) {
    return { background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" };
  }

  if (regime.includes("expansion") || expression.includes("bullish")) {
    return { background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#166534" };
  }

  if (expression.includes("volatility") || expression.includes("chaotic")) {
    return { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" };
  }

  return { background: "#f8fafc", border: "1px solid #cbd5e1", color: "#334155" };
}

function buildReplaySimpleLine(summary, macro) {
  if (!summary) {
    return "Run a replay to generate a concise astro reading.";
  }

  const stock = summary.companyName || summary.ticker || "Stock";
  const st = pressureExpansionState(summary);
  const signal = languageSafeSignal(summary);
  const opportunity = macro?.mainOpportunity?.label || "no dominant opportunity yet";
  const risk = macro?.mainRisk?.label || "no dominant risk yet";
  return `${stock}: ${signal}. Pressure ${Math.round(st.pressure)} vs expansion ${Math.round(st.expansion)}. Opportunity: ${opportunity}; risk: ${risk}.`;
}

function formatReplayWindowDate(item) {
  const raw = item?.date || item?.windowDate || "";
  if (!raw) return "-";
  return formatDatesInText(raw);
}

function replayWindowAnchorText(item) {
  const raw = item?.date || item?.windowDate || "";
  if (!raw) return "";
  return ` · around ${formatDateReadable(extractFirstIsoDate(raw) || raw)}`;
}

function windowExpression(item) {
  return item?.historicalResponse?.expressionType || item?.environmentConflict || item?.currentRegime || item?.regime || "Mixed";
}

function compactWindowText(item, horizonLabel) {
  if (!item) {
    return `${horizonLabel}: no computed window yet.`;
  }

  const st = pressureExpansionState(item);
  const date = formatReplayWindowDate(item);
  const signal = languageSafeSignal(item);
  let instruction = "use clearer astro separation";
  if (st.pressure >= 78 && st.expansion >= 70) instruction = "pressure first; avoid fresh chase";
  else if (st.pressureLead) instruction = "protect strength / avoid fresh chase";
  else if (st.expansionLead) instruction = "add gradually; do not chase vertical moves";
  else if (st.highConflict) instruction = "expect churn; protect rallies";

  return formatDatesInText(`${horizonLabel} ${date}: ${signal}. Pressure ${Math.round(st.pressure)}, expansion ${Math.round(st.expansion)}; ${instruction}.`);
}

function ReplayWindowCard({ title, item, horizon, purpose }) {
  const contacts = (item?.transitDetails || [])
    .slice()
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
    .slice(0, 3)
    .map(contact => `${contact.planet} ${contact.aspect} natal ${contact.targetPlanet}`);

  return (
    <div style={windowCardStyle}>
      <div style={miniLabelStyle}>{title}</div>
      <div style={bigTextStyle}>{horizon}</div>
      <div style={{ marginTop: 8 }}>{compactWindowText(item, purpose)}</div>
      <div style={smallMutedStyle}>Regime: {languageSafeSignal(item)} · Volatility: {item?.volatility || "-"} · Leadership: {item?.leadershipProbability ?? "-"}</div>
      {contacts.length ? (
        <div style={{ marginTop: 8 }}>
          {contacts.map((line, index) => (
            <div key={index} style={smallMutedStyle}>• {line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function pressureExpansionState(source = {}) {
  const pressure = numericValue(source?.pressureScore ?? source?.pressure_score) ?? 50;
  const expansion = numericValue(source?.expansionScore ?? source?.expansion_score) ?? 50;
  const leadership = numericValue(source?.leadershipProbability ?? source?.leadership_probability) ?? 50;
  const expression = String(source?.expression || source?.historicalResponse?.expressionType || source?.environmentConflict || source?.currentRegime || source?.regime || "").toLowerCase();
  const volatility = String(source?.volatility || "").toLowerCase();
  const hardPressure = pressure >= 72 || expression.includes("compression") || expression.includes("pressure");
  const highConflict = pressure >= 62 && expansion >= 62;
  const expansionLead = expansion >= pressure + 10;
  const pressureLead = pressure >= expansion + 10;
  const volatile = volatility.includes("high") || expression.includes("chaotic") || expression.includes("tug") || expression.includes("volatility") || expression.includes("fragile");

  return { pressure, expansion, leadership, expression, volatility, hardPressure, highConflict, expansionLead, pressureLead, volatile };
}

function pressureSeverityFromState(st = {}, source = {}) {
  const pressure = numericValue(st.pressure) ?? 50;
  const expansion = numericValue(st.expansion) ?? 50;
  const leadership = numericValue(st.leadership) ?? 50;
  const grammar = source?.finAstroGrammar || (source?.grammarSignal ? {
    signal: source.grammarSignal,
    actionBias: source.grammarActionBias,
    pressure: { pressureKind: source.grammarPressureKind, pressureRole: source.grammarPressureRole }
  } : null);
  const pressureRole = String(grammar?.pressure?.pressureRole || source?.grammarPressureRole || "").toLowerCase();
  const pressureKind = String(grammar?.pressure?.pressureKind || source?.grammarPressureKind || "").toLowerCase();
  const signal = String(grammar?.signal || source?.grammarSignal || "").toLowerCase();
  const supportChurn = pressureRole === "churn" || (pressureKind === "digestion" && /finance rerating|early finance|rally with churn|durable support/.test(signal));
  const text = [
    source?.current_pressure,
    source?.expected_behaviour,
    source?.catalyst_response,
    source?.environment_signature,
    source?.top_transits,
    source?.catalyst_contact_text,
    source?.dominant_signature,
    source?.action,
    source?.signal
  ].join(" ");
  const hardText = textHasAny(text, ["hard eclipse", "break-risk", "break risk", "mars-rahu", "eclipse square", "eclipse opposition", "heavy pressure", "reset risk", "capital protection"]);
  const pressureLead = pressure >= expansion + 10;

  if ((pressure >= 82 && pressureLead) || (pressure >= 78 && hardText && pressureLead) || pressureRole === "break") {
    return { key: "break", label: "BREAK PRESSURE", guidance: "capital-protection window; avoid fresh chase until reset risk clears" };
  }
  if (supportChurn && pressure < 82 && !pressureLead) {
    return { key: "churn", label: "CHURN PRESSURE", guidance: "sizing/digestion window; stagger, do not treat as an automatic exit" };
  }
  if (pressureRole === "contamination" || pressureKind === "volatile") {
    return { key: "contamination", label: "CONTAMINATION PRESSURE", guidance: "support is usable but follow-through is unreliable; hold core and wait fresh" };
  }
  if (pressure >= 72 || (pressure >= 68 && pressureLead) || (hardText && pressure >= 65 && leadership < 65)) {
    return { key: "high", label: "HIGH PRESSURE", guidance: "protect excess before fresh deployment; not a full-exit signal; treat it as excess-exposure control" };
  }
  if (pressure >= 58 || Math.abs(pressure - expansion) <= 8) {
    return { key: "medium", label: "MEDIUM PRESSURE", guidance: "digestion / sideways churn; hold core, protect excess" };
  }
  return { key: "low", label: "LOW PRESSURE", guidance: "tactical noise; not an exit signal by itself" };
}

function pressureSeverityLine(source = {}) {
  const sev = pressureSeverityFromState(pressureExpansionState(source), source);
  return `${sev.label} — ${sev.guidance}`;
}


function replayContactCorpus(source = {}) {
  const pieces = [];
  if (Array.isArray(source?.topContactText)) pieces.push(...source.topContactText);
  if (Array.isArray(source?.transitDetails)) {
    source.transitDetails.forEach(contact => {
      pieces.push(`${contact?.planet || ""} ${contact?.aspect || ""} natal ${contact?.targetPlanet || ""} ${contact?.score || ""}`);
    });
  }
  if (Array.isArray(source?.topContacts)) {
    source.topContacts.forEach(contact => {
      pieces.push(contact?.text || `${contact?.planet || ""} ${contact?.aspect || ""} natal ${contact?.targetPlanet || ""} ${contact?.score || ""}`);
    });
  }
  pieces.push(source?.environmentSignature || "", source?.catalystWindow || "", source?.regime || "", source?.expression || "");
  return pieces.join(" | ").toLowerCase();
}

function replayAstroContactQuality(source = {}, context = {}) {
  const merged = mergeReplayAstroSource(source, context);
  const grammar = merged.finAstroGrammar || evaluateFinAstroGrammar(merged);
  return {
    text: grammar.text,
    durableExpansion: grammar.support.durableExpansion,
    financeExpansion: grammar.support.financeSupport,
    volatileExpansion: grammar.volatile.volatileExpansion,
    hardSaturn: grammar.pressure.narrativePressure || grammar.pressure.valuationPressure || grammar.pressure.sentimentPressure,
    hardEclipseMarsMercury: grammar.pressure.executionPressure || grammar.pressure.narrativePressure || grammar.pressure.valuationPressure,
    hardMarsNode: grammar.pressure.executionPressure,
    hardPressure: grammar.pressure.pressureDominatesSupport || grammar.pressure.structuralReset,
    contestedMars: grammar.volatile.contestedMars,
    unstableExpansion: grammar.flags.unstableExpansion,
    durableButPressured: grammar.support.durableExpansion && grammar.pressure.ordinaryChurn && !grammar.flags.unstableExpansion,
    financeReratingWithChurn: grammar.flags.financeReratingWithChurn,
    earlyFinanceRerating: grammar.flags.earlyFinanceRerating,
    contestedLeadership: grammar.flags.contestedLeadership,
    repairWatch: grammar.flags.repairWatch,
    pressureDominatesSupport: grammar.pressure.pressureDominatesSupport,
    pressureKind: grammar.pressure.pressureKind,
    pressureRole: grammar.pressure.pressureRole,
    actionBias: grammar.actionBias,
    grammarSignal: grammar.signal,
    grammarNotes: grammar.notes,
    sector: grammar.sector
  };
}

function mergeReplayAstroSource(source = {}, context = {}) {
  const merged = { ...context, ...source };
  const mergeArray = (a, b) => [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  merged.topContactText = mergeArray(context.topContactText, source.topContactText);
  merged.topContacts = mergeArray(context.topContacts, source.topContacts);
  merged.transitDetails = mergeArray(context.transitDetails, source.transitDetails);
  merged.ticker = source.ticker || context.ticker;
  merged.symbol = source.symbol || context.symbol;
  merged.companyName = source.companyName || context.companyName;
  merged.natalArchetype = source.natalArchetype || context.natalArchetype;
  return merged;
}

function languageSafeSignal(source = {}, context = {}) {
  const merged = mergeReplayAstroSource(source, context);
  const st = pressureExpansionState(merged);
  const cq = replayAstroContactQuality(merged);

  // Fin-astro grammar first: read planet/contact/sector quality before translating scores.
  if (cq.grammarSignal && !/WATCH ONLY/i.test(cq.grammarSignal)) return cq.grammarSignal;

  if (cq.pressureDominatesSupport) return "PRESSURE FIRST — hard natal pressure dominates support";
  if (cq.unstableExpansion && st.pressure >= 76) return "PRESSURE-CONTAMINATED EXPANSION — protect strength";
  if (cq.unstableExpansion) return "UNSTABLE EXPANSION — avoid fresh chase";
  if (cq.contestedLeadership || (cq.contestedMars && st.expansion >= st.pressure - 8)) return "CONTESTED LEADERSHIP — hold core, stagger only carefully";
  if (cq.financeReratingWithChurn && st.highConflict) return "RALLY WITH CHURN — finance rerating support under pressure";
  if (cq.durableButPressured && st.highConflict) return "RALLY WITH CHURN — durable support under pressure";

  if (st.pressure >= 82 && st.pressureLead) return "BREAK-RISK WINDOW — protect capital";
  if (st.pressure >= 78 && st.expansion < 70) return "PRESSURE FIRST — capital stays out until repair gate";
  if (st.pressureLead && st.pressure >= 68) return "TRIM SATELLITE — protect strength";
  if (st.pressureLead) return "AVOID FRESH CHASE — pressure active";

  if (st.expansion >= 85 && st.pressure >= 55 && st.pressure < 78) return "HIGH-VOLTAGE LEADER — hold core, trim only blow-off spikes";
  if (st.highConflict && st.leadership >= 72) return "HIGH-ENERGY TUG — protect into strength";
  if (st.highConflict) return "RALLY WITH CHURN — participate carefully, protect later";

  if (st.expansionLead && st.leadership >= 78) return "STRONG LEADER — hold/add on pressure";
  if (st.expansionLead && st.leadership >= 62) return "STAGGER ADD — early window forming";
  if (st.expansion >= 70 && st.pressure <= 65) return "BUILDING RERATING — add/hold early";

  if (st.expression.includes("fragile")) return "WEAK RERATING — do not chase";
  if (st.expression.includes("self-repairing")) return "HOLD CORE — repair underway";
  if (st.expression.includes("bullish tug")) return "VOLATILE UPSIDE — stagger entry";
  if (st.expression.includes("institutional")) return "RALLY WITH CHURN — protect strength";
  if (st.expression.includes("compression")) return "PRESSURE FIRST — reassess later";
  return "ASTRO GATE PENDING — no deployable edge";
}

function replayTacticalActionText(summary, tacticalWindow) {
  const source = mergeReplayAstroSource(tacticalWindow || summary || {}, summary || {});
  const st = pressureExpansionState(source);
  const cq = replayAstroContactQuality(source);
  const date = source?.date ? ` around ${formatDateReadable(source.date)}` : "";
  const signal = languageSafeSignal(source, summary);
  if (cq.earlyFinanceRerating) return `${signal}${date}. Early finance-sector support is active; use pressure as sizing/churn control, not as automatic protection.`;
  if (cq.repairWatch) return `${signal}${date}. Forward support may exist, but current natal contact quality asks for repair/watch before fresh capital.`;
  if (cq.pressureDominatesSupport) return `${signal}${date}. Hard natal pressure dominates the supportive contacts; protect first.`;
  if (cq.unstableExpansion) return `${signal}${date}. Expansion is volatile/pressured; avoid fresh chase; classify it as break-risk only when the break-risk label is explicit support.`;
  if (cq.contestedLeadership || cq.contestedMars) return `${signal}${date}. Support and pressure are both active; hold core and stagger only if sizing is disciplined.`;
  if (cq.durableButPressured || cq.financeReratingWithChurn) return `${signal}${date}. Sector-relevant support is present; treat pressure as churn/digestion, not automatic exit.`;
  if (st.pressure >= 78 && st.expansion >= 70) return `PRESSURE FIRST — capital stays out until repair gate${date}. High pressure and expansion conflict; avoid fresh chase.`;
  if (st.pressureLead) return `${signal}${date}. Pressure leads expansion; protect capital before adding.`;
  if (st.highConflict) return `${signal}${date}. Expansion exists, but movement should be choppy.`;
  if (st.expansionLead) return `${signal}${date}. Expansion leads pressure; deploy gradually, not vertically.`;
  return `${signal}${date}. No clean tactical edge yet.`;
}

function replayStrategicActionText(summary, strategicWindow) {
  const source = mergeReplayAstroSource(strategicWindow || summary || {}, summary || {});
  const st = pressureExpansionState(source);
  const cq = replayAstroContactQuality(source);
  const date = source?.date ? ` around ${formatDateReadable(source.date)}` : "";
  const score = replayScoreFromWindow(source, summary, "strategic") ?? 5;
  if (cq.earlyFinanceRerating) return `EARLY FINANCE RERATING — stagger through churn${date}. First pressure windows are sizing control; hard structural pressure receives a separate protection label.`;
  if (cq.repairWatch) return `REPAIR GATE — future support exists, but current natal contact quality is not deployable yet${date}.`;
  if (cq.financeReratingWithChurn || cq.contestedLeadership) return `RALLY WITH CHURN — sector-relevant support is present; use pressure as sizing control${date}.`;
  if (st.pressure >= 78 && st.expansion >= 70) return `PRESSURE FIRST — reassess${date || " after repair"}. Strategic window is conflicted, not a clean deployment window.`;
  if (score >= 8.5 && st.expansion >= st.pressure) return `STRONG FORWARD LEADER — mapped window${date}. Add on pressure, not chase.`;
  if (score >= 7 && st.expansion >= st.pressure) return `DEFERRED LEADER — mapped window${date}. Better capital window later.`;
  if (st.pressureLead || st.pressure >= 68) return `PRESSURE AHEAD — protect before mapped window${date}.`;
  if (score <= 5.5) return `ASTRO GATE PENDING — not deployable yet${date}.`;
  return `MATURE / SELECTIVE — hold core, use cleaner mapped window${date}.`;
}

function replayFutureWindowText(item, label = "Opportunity window") {
  if (!item) return `${label}: no mapped window yet.`;
  const st = pressureExpansionState(item);
  const date = item?.date ? formatDateReadable(item.date) : formatReplayWindowDate(item);
  const signal = languageSafeSignal(item);
  const sev = pressureSeverityFromState(st, item);
  if (sev.key === "churn") return `${label}: CHURN / SIZING WINDOW around ${date} — ${signal}. Pressure controls sizing, not direction.`;
  if (st.pressure >= 75 && st.expansion >= 70 && sev.key !== "churn") return `${label}: PRESSURE-FIRST WINDOW around ${date} — high expansion but high pressure; treat as risky, not automatically “best”.`;
  if (st.pressureLead) return `${label}: CAUTION WINDOW around ${date} — pressure leads expansion; protect strength.`;
  if (st.expansionLead) return `${label}: ADD / RERATING WINDOW around ${date} — ${signal}.`;
  return `${label}: MIXED WINDOW around ${date} — use clearer astro separation.`;
}

function replayPressureWindowText(item) {
  if (!item) return "No mapped pressure window yet.";
  const st = pressureExpansionState(item);
  const sev = pressureSeverityFromState(st, item);
  const date = item?.date ? formatDateReadable(item.date) : formatReplayWindowDate(item);
  if (sev.key === "break") return `BREAK PRESSURE around ${date} — capital-protection window; avoid fresh chase until reset risk clears.`;
  if (sev.key === "churn") return `CHURN PRESSURE around ${date} — sizing/digestion window; stagger, do not treat as an automatic exit.`;
  if (sev.key === "contamination") return `CONTAMINATION PRESSURE around ${date} — support is usable but follow-through is unreliable; hold core and wait fresh.`;
  if (sev.key === "high") return `HIGH PRESSURE around ${date} — protect excess before fresh deployment; not a full-exit signal; treat it as excess-exposure control.`;
  if (sev.key === "medium") return `MEDIUM PRESSURE around ${date} — digestion / sideways churn; hold core, protect excess.`;
  return `LOW PRESSURE around ${date} — tactical noise; not an exit signal by itself.`;
}


function replayWindowMap(summary) {
  return summary?.forwardWindows?.windowMap || {};
}

function replayWindowMapItem(summary, key) {
  return replayWindowMap(summary)?.[key] || null;
}

function replayWindowMapText(item, emptyText) {
  if (!item) return emptyText;
  const role = item.windowRole || "Mapped window";
  const date = replayIsoDate(item);
  const st = pressureExpansionState(item || {});
  const signal = languageSafeSignal(item || {});
  if (item.windowType === "dormancy") {
    const start = item.date ? formatDateReadable(item.date) : "now";
    const end = item.endDate ? formatDateReadable(item.endDate) : "mapped catalyst";
    return `${role}: ${start} to ${end} — capital may be early; use the mapped accumulation/expansion opening.`;
  }
  const when = date ? formatDateReadable(date) : "date not mapped";
  if (item.windowType === "current") {
    return `${role}: ${when} — ${signal}. Pressure ${Math.round(st.pressure)} / Expansion ${Math.round(st.expansion)}.`;
  }
  if (item.windowType === "accumulation" || item.windowType === "strategic_accumulation") {
    const offset = numericValue(item.offsetDays);
    if (/REPAIR GATE|FUTURE SUPPORT|ASTRO GATE PENDING|WATCH ONLY|no clean edge|PRESSURE FIRST|AVOID FRESH CHASE|UNSTABLE EXPANSION/i.test(signal)) {
      if (offset === 0) {
        return `${role}: no clean accumulation window mapped yet; replay date is only a review condition.`;
      }
      return `${role}: ${when} — review/repair window only; no clean accumulation signal mapped there. ${signal}.`;
    }
    return `${role}: ${when} — accumulation/positioning window opens; ${signal}.`;
  }
  if (item.windowType === "tactical_risk" || item.windowType === "strategic_risk") {
    return `${role}: ${when} — ${replayPressureWindowText(item)}`;
  }
  if (item.windowType === "long_range_cycle") {
    return `${role}: ${when} — larger cycle context; do not let this suppress earlier usable windows. ${signal}.`;
  }
  return `${role}: ${when} — ${signal}.`;
}

function replayWindowMapRows(summary) {
  const map = replayWindowMap(summary);
  return [
    ["Current condition", replayWindowMapText(map.currentCondition, "Current condition: no mapped reading yet.")],
    ["Accumulation window opens", replayWindowMapText(map.accumulationOpen, "Accumulation window opens: no usable opening mapped yet.")],
    ["Tactical opportunity", replayWindowMapText(map.tacticalOpportunity, "Tactical opportunity: no 30–90 day opportunity mapped yet.")],
    ["Tactical risk", replayWindowMapText(map.tacticalRisk, "Tactical risk: no major 30–90 day risk mapped yet.")],
    ["Strategic accumulation", replayWindowMapText(map.strategicAccumulation, "Strategic accumulation: no 3–18 month accumulation opening mapped yet.")],
    ["Strategic opportunity", replayWindowMapText(map.strategicOpportunity, "Strategic opportunity: no 3–18 month leadership window mapped yet.")],
    ["Strategic risk", replayWindowMapText(map.strategicRisk, "Strategic risk: no 3–18 month protection window mapped yet.")],
    ["Dormancy window", replayWindowMapText(map.dormancyWindow, "Dormancy window: no continuous dormant stretch mapped before the next usable window.")],
    ["Long-range cycle", replayWindowMapText(map.longRangeCycle, "Long-range cycle: no 18–36 month cycle window mapped yet.")]
  ];
}

function replayIsoDate(item) {
  return extractFirstIsoDate(item?.date || item?.windowDate || "");
}

function replayDaysBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function replayMonthRange(startIso, endIso) {
  if (!startIso && !endIso) return "window not dated";
  if (!startIso) return `until ${formatDateReadable(endIso)}`;
  if (!endIso) return `from ${formatDateReadable(startIso)}`;
  return `${formatDateReadable(startIso)} to ${formatDateReadable(endIso)}`;
}

function replayWindowLabel(item, fallback = "mapped window") {
  const iso = replayIsoDate(item);
  return iso ? formatDateReadable(iso) : fallback;
}


function replayForwardDays(summary) {
  return numericValue(summary?.forwardDays ?? summary?.chartValidation?.forwardWindowDays) ?? 365;
}

function replayFullScan(summary) {
  return Array.isArray(summary?.forwardWindows?.fullScan) ? summary.forwardWindows.fullScan : [];
}

function replayWindowOffset(summary, item) {
  const replayIso = extractFirstIsoDate(summary?.replayDate || "");
  const iso = replayIsoDate(item);
  return replayDaysBetween(replayIso, iso);
}

function replayWindowInHorizon(summary, item, maxDays = replayForwardDays(summary)) {
  const offset = replayWindowOffset(summary, item);
  return offset !== null && offset >= 0 && offset <= maxDays;
}

function replayOpportunityStrength(item, summary) {
  const st = pressureExpansionState(item || summary || {});
  return (st.expansion * 0.45) + (st.leadership * 0.45) - (st.pressure * 0.18);
}

function replayIsActiveExpansion(source = {}) {
  const st = pressureExpansionState(source);
  return (
    (st.expansion >= 70 && st.expansion >= st.pressure - 8) ||
    (st.expansionLead && st.expansion >= 64) ||
    (st.highConflict && st.expansion >= 68 && st.pressure < 78)
  );
}

function replayCurrentWindow(summary) {
  if (!summary) return null;
  return {
    ...summary,
    date: summary.replayDate,
    windowDate: summary.replayDate,
    currentReplayWindow: true
  };
}

function chooseReplayOpportunityWindow(summary, tacticalWindow, strategicWindow, bestWindow) {
  const forwardDays = replayForwardDays(summary);
  const scan = replayFullScan(summary).filter(item => replayWindowInHorizon(summary, item, forwardDays));
  const current = replayCurrentWindow(summary);
  const activeNow = replayIsActiveExpansion(summary || {});
  const currentQuality = replayAstroContactQuality(summary || {});
  const map = replayWindowMap(summary);

  // v28.9 Window Map rule: nearest usable window beats far-future peak.
  // v30.04J: current override applies only if contact quality is not pressure-contaminated.
  // Do not classify a stock as dormant merely because a later 24m/36m window scores higher.
  if (activeNow && !currentQuality.unstableExpansion && !currentQuality.repairWatch && !currentQuality.pressureDominatesSupport) return current;

  const mappedCandidates = [
    map.tacticalOpportunity,
    map.accumulationOpen,
    map.strategicAccumulation,
    map.strategicOpportunity,
    map.nearestUsableWindow
  ]
    .filter(Boolean)
    .filter(item => replayWindowInHorizon(summary, item, Math.max(forwardDays, 540)));
  if (mappedCandidates.length) {
    return mappedCandidates.sort((a, b) => (replayWindowOffset(summary, a) ?? 9999) - (replayWindowOffset(summary, b) ?? 9999))[0];
  }

  const candidates = [tacticalWindow, strategicWindow, bestWindow, ...scan]
    .filter(Boolean)
    .filter(item => replayWindowInHorizon(summary, item, forwardDays))
    .filter(item => {
      const st = pressureExpansionState(item);
      return st.expansion >= 66 || st.leadership >= 58 || st.expansionLead || st.highConflict;
    });

  if (!candidates.length) return tacticalWindow || current || strategicWindow || bestWindow || null;
  return candidates.slice().sort((a, b) => {
    const aOff = replayWindowOffset(summary, a) ?? 9999;
    const bOff = replayWindowOffset(summary, b) ?? 9999;
    const aScore = replayOpportunityStrength(a, summary) - Math.min(18, aOff / 60);
    const bScore = replayOpportunityStrength(b, summary) - Math.min(18, bOff / 60);
    return bScore - aScore;
  })[0];
}

function chooseReplayPressureWindow(summary, pressureWindow, opportunityWindow) {
  const forwardDays = replayForwardDays(summary);
  const scan = replayFullScan(summary).filter(item => replayWindowInHorizon(summary, item, forwardDays));
  const oppOffset = replayWindowOffset(summary, opportunityWindow);
  const candidates = [pressureWindow, ...scan]
    .filter(Boolean)
    .filter(item => replayWindowInHorizon(summary, item, forwardDays))
    .filter(item => {
      const st = pressureExpansionState(item);
      return st.pressure >= 64 || st.pressureLead || (st.highConflict && st.pressure >= 60);
    });

  if (!candidates.length) return pressureWindow && replayWindowInHorizon(summary, pressureWindow, forwardDays) ? pressureWindow : null;

  // If opportunity is current/early, prefer the first meaningful pressure after it. This preserves chronology.
  const afterOpp = candidates
    .filter(item => {
      const off = replayWindowOffset(summary, item);
      return off !== null && (oppOffset === null || off >= Math.max(0, oppOffset));
    })
    .sort((a, b) => (replayWindowOffset(summary, a) ?? 9999) - (replayWindowOffset(summary, b) ?? 9999));
  if (afterOpp.length) return afterOpp[0];

  return candidates.sort((a, b) => (replayWindowOffset(summary, a) ?? 9999) - (replayWindowOffset(summary, b) ?? 9999))[0];
}

function replayHorizonNote(summary, item, label) {
  const forwardDays = replayForwardDays(summary);
  const off = replayWindowOffset(summary, item);
  if (off !== null && off > forwardDays) {
    return `${label} ${formatDateReadable(replayIsoDate(item))} lies outside the ${forwardDays}-day replay horizon.`;
  }
  return "";
}

function replayCoherentScore(summary, tacticalWindow, bestWindow, kind = "tactical") {
  const source = kind === "tactical" ? (tacticalWindow || summary) : (bestWindow || tacticalWindow || summary);
  const base = replayScoreFromWindow(source, summary, kind) ?? 5;
  const st = pressureExpansionState(source || summary || {});
  let score = base;

  if (replayIsActiveExpansion(summary) && kind === "tactical") score = Math.max(score, 6.2);
  if (st.expansion >= 82 && st.pressure < 78) score = Math.max(score, kind === "tactical" ? 6.8 : 6.4);
  if (st.pressure >= 78 && st.pressureLead) score = Math.min(score, 5.2);
  if (st.pressure >= 70 && st.expansion < 62) score = Math.min(score, 5.0);

  return Math.max(1, Math.min(10, score));
}

function replayDormancyText(summary, tacticalWindow, strategicWindow, bestWindow) {
  const replayIso = extractFirstIsoDate(summary?.replayDate || "");
  const forwardDays = replayForwardDays(summary);
  const opportunity = chooseReplayOpportunityWindow(summary, tacticalWindow, strategicWindow, bestWindow);
  const oppIso = replayIsoDate(opportunity);
  const oppOffset = replayDaysBetween(replayIso, oppIso);
  const tacticalScore = replayCoherentScore(summary, tacticalWindow || opportunity, opportunity, "tactical");
  const strategicScore = replayCoherentScore(summary, tacticalWindow, strategicWindow || opportunity, "strategic");

  if (replayIsActiveExpansion(summary)) {
    return "LOW / ACTIVE WINDOW — replay date already shows usable expansion; do not defer capital only because a later window is cleaner.";
  }

  if (oppOffset !== null && oppOffset > forwardDays) {
    return `NO DEPLOYABLE WINDOW INSIDE HORIZON — next mapped catalyst is ${formatDateReadable(oppIso)}, outside this ${forwardDays}-day replay horizon.`;
  }

  if (oppOffset !== null && oppOffset > 90 && tacticalScore < 6) {
    return `DORMANT CAPITAL RISK — capital may sleep from ${formatDateReadable(replayIso)} to ${formatDateReadable(oppIso)}; use that mapped catalyst gate.`;
  }

  if (oppOffset !== null && oppOffset > 45 && tacticalScore < 6.5) {
    return `MODERATE DORMANCY — wait through ${replayMonthRange(replayIso, oppIso)}; use the mapped astro window as the next activation check.`;
  }

  if (strategicScore < 5.5 && tacticalScore < 5.8) {
    return "CAPITAL INEFFICIENT — weak tactical and strategic score inside this replay horizon.";
  }

  return "LOW — timing is usable under the current action label.";
}

function reconcileReplayScoresAndActions(resolved) {
  const tacticalScore = resolved.tacticalScore;
  const strategicScore = resolved.strategicScore;
  let tacticalAction = resolved.tacticalAction;
  let strategicAction = resolved.strategicAction;
  let mainLabel = resolved.mainLabel;

  if (/ASTRO GATE PENDING|ASTRO GATE PENDING|WATCH ONLY|no clean edge/i.test(tacticalAction) && tacticalScore >= 6.2) {
    tacticalAction = `STAGGER ADD — active window forming; deploy gradually, not vertically.`;
  }
  if (/ASTRO GATE PENDING|ASTRO GATE PENDING|WATCH ONLY|no clean edge/i.test(tacticalAction) && tacticalScore < 6.2) {
    tacticalAction = `ASTRO GATE PENDING — pressure/repair first; fresh capital waits until the next supportive natal contact is mapped.`;
  }
  if (/STAGGER ADD|ACCUMULATE|RERATING|LEADER/i.test(tacticalAction) && tacticalScore < 5.8) {
    tacticalAction = `ASTRO GATE PENDING — tactical idea exists, but score remains selective (${tacticalScore.toFixed(1)}/10).`;
  }
  if (/STRONG LEADER|FORWARD LEADER|PRIORITY/i.test(strategicAction) && strategicScore < 6.5) {
    strategicAction = `RALLY WITH CHURN — participate selectively; strategic score is not yet leader-grade.`;
  }
  if (/WATCHLIST ONLY|MATURE \/ SELECTIVE/i.test(strategicAction) && strategicScore >= 6.8) {
    strategicAction = `CONTROLLED FORWARD LEADER — durability is visible; add only through pressure absorption / supportive natal contacts.`;
  }
  if (/ASTRO GATE PENDING|ASTRO GATE PENDING|WATCH ONLY|no clean edge/i.test(mainLabel) && /STAGGER ADD|RALLY WITH CHURN|RERATING|LEADER/i.test(`${tacticalAction} ${strategicAction}`)) {
    mainLabel = tacticalAction.replace(/\.$/, "");
  }

  return { ...resolved, tacticalAction, strategicAction, mainLabel };
}

function resolveReplayConflict(summary, macro, tacticalWindow, strategicWindow, bestWindow, pressureWindow) {
  const effectiveOpportunity = chooseReplayOpportunityWindow(summary, tacticalWindow, strategicWindow, bestWindow);
  const effectivePressure = chooseReplayPressureWindow(summary, pressureWindow, effectiveOpportunity);
  const st = pressureExpansionState(summary || {});
  const opportunitySt = pressureExpansionState(effectiveOpportunity || summary || {});
  const pressureSt = pressureExpansionState(effectivePressure || {});

  const replayIso = extractFirstIsoDate(summary?.replayDate || "");
  const opportunityIso = replayIsoDate(effectiveOpportunity);
  const pressureIso = replayIsoDate(effectivePressure);
  const opportunityOffset = replayDaysBetween(replayIso, opportunityIso);
  const pressureOffset = replayDaysBetween(replayIso, pressureIso);
  const pressureAfterOpportunity = pressureOffset !== null && opportunityOffset !== null && pressureOffset > opportunityOffset;
  const pressureBeforeOpportunity = pressureOffset !== null && opportunityOffset !== null && pressureOffset < opportunityOffset;
  const currentExpansion = replayIsActiveExpansion(summary || {});
  const verticalExpansion = st.expansion >= 84 && st.pressure >= 55 && st.pressure < 78;
  const hardBreak = (pressureSt.pressure >= 78 && pressureSt.pressureLead) || (st.pressure >= 82 && st.pressureLead);
  const futureHostile = effectiveOpportunity && opportunitySt.pressure >= 75 && opportunitySt.expansion >= 70 && !currentExpansion;

  let mainLabel = replayMainLabelWithTiming(summary, effectiveOpportunity || tacticalWindow);
  let tacticalAction = replayTacticalActionText(summary, currentExpansion ? replayCurrentWindow(summary) : (tacticalWindow || effectiveOpportunity));
  let strategicAction = replayStrategicAction(summary, strategicWindow || effectiveOpportunity);
  let currentStory = "Mixed astro field; use the dated opportunity and pressure windows to decide capital posture.";
  let capitalPosture = "Keep position sizing disciplined until the next dated window clarifies.";

  if (hardBreak) {
    mainLabel = pressureIso ? `BREAK-RISK WINDOW — protect capital near ${formatDateReadable(pressureIso)}` : "BREAK-RISK WINDOW — protect capital";
    tacticalAction = `TRIM SATELLITE / HEAVY TRIM — hard pressure active${pressureIso ? ` near ${formatDateReadable(pressureIso)}` : ""}.`;
    strategicAction = `PRESSURE FIRST — reassess after reset${pressureIso ? ` after ${formatDateReadable(pressureIso)}` : ""}.`;
    currentStory = "Hard pressure overrides ordinary expansion; protect capital before looking for fresh opportunity.";
    capitalPosture = "Reduce heat first; redeploy only after the pressure window passes and a new astro window forms.";
  } else if (verticalExpansion) {
    const riskText = pressureIso ? `Risk window: ${formatDateReadable(pressureIso)}; protect after the vertical phase.` : "Risk window: not tightly mapped yet; protect only vertical excess.";
    mainLabel = `HIGH-VOLTAGE LEADER — hold core, trim only blow-off spikes${opportunityIso ? ` through ${formatDateReadable(opportunityIso)}` : ""}`;
    tacticalAction = `RIDE RERATING — participate carefully${opportunityIso ? ` through ${formatDateReadable(opportunityIso)}` : " now"}; do not chase late spikes.`;
    strategicAction = pressureAfterOpportunity ? `HOLD WINNER — opportunity first, then protect near ${formatDateReadable(pressureIso)}.` : "VOLATILE RERATING — buy pressure, protect rallies.";
    currentStory = `Very high expansion with volatile/conflict pressure. ${riskText}`;
    capitalPosture = "Participate carefully; protect excess later rather than exiting before the active window matures.";
  } else if (currentExpansion) {
    const currentQuality = replayAstroContactQuality(summary || {});
    const currentSignal = languageSafeSignal(summary || {});
    if (currentQuality.repairWatch) {
      mainLabel = `REPAIR GATE — future support exists, current natal contacts need repair`;
      tacticalAction = `ASTRO GATE PENDING — current leadership is weak; use the next mapped supportive natal contact.`;
      strategicAction = `FUTURE SUPPORT VISIBLE — do not convert long-range durability into current rerating.`;
      currentStory = "Forward support is visible, but current natal contact quality is not deployable yet.";
      capitalPosture = "Hold only disciplined core; fresh capital waits for the next clean astro window.";
    } else if (currentQuality.pressureDominatesSupport) {
      mainLabel = `PRESSURE FIRST — hard natal pressure dominates support`;
      tacticalAction = `WATCH / PROTECT — avoid fresh deployment until pressure yields.`;
      strategicAction = `PRESSURE FIRST — reassess after hard contact absorption.`;
      currentStory = "Hard natal pressure dominates the supportive contacts; current expansion should not be treated as clean rerating.";
      capitalPosture = "Protect strength first; fresh capital waits.";
    } else if (currentQuality.financeReratingWithChurn || currentQuality.contestedLeadership || currentQuality.durableButPressured) {
      mainLabel = `${currentSignal} — stagger only through churn`;
      tacticalAction = `STAGGER CAREFULLY — active astro support is present, but pressure/churn controls sizing.`;
      strategicAction = `RALLY WITH CHURN — participate while support holds; protect only if hard pressure dominates.`;
      currentStory = "Current astro support is active, but contact quality calls for churn-aware sizing rather than all-in deployment.";
      capitalPosture = "Core can be held; fresh capital is staggered and astrology-led.";
    } else {
      mainLabel = pressureIso ? `BUILDING RERATING — stagger entry; protect after ${formatDateReadable(pressureIso)}` : "BUILDING RERATING — stagger entry; protect only excess";
      tacticalAction = `STAGGER ADD — active replay window ${replayMonthRange(replayIso, opportunityIso || replayIso)}; expect churn.`;
      strategicAction = pressureAfterOpportunity && pressureIso ? `RALLY WITH CHURN — participate first, protect before ${formatDateReadable(pressureIso)}.` : "BUILDING RERATING — add/hold early; pressure is not yet a no-entry signal.";
      currentStory = pressureAfterOpportunity && pressureIso
        ? `Current expansion is active before pressure: ${formatDateReadable(replayIso)} first, then protection near ${formatDateReadable(pressureIso)}.`
        : "Current expansion is active; do not defer the setup only because a later window looks cleaner.";
      capitalPosture = "Participate gradually; do not turn later pressure into a no-entry signal now.";
    }
  } else if (pressureBeforeOpportunity && pressureIso) {
    mainLabel = `PRESSURE FIRST — use cleaner mapped window near ${opportunityIso ? formatDateReadable(opportunityIso) : "mapped opportunity"}`;
    tacticalAction = `ASTRO GATE PENDING — pressure window ${formatDateReadable(pressureIso)} comes before the opportunity.`;
    strategicAction = opportunityIso ? `CONTROLLED FORWARD LEADER — reassess near ${formatDateReadable(opportunityIso)} after pressure absorption.` : strategicAction;
    currentStory = `Pressure precedes opportunity: protect through ${formatDateReadable(pressureIso)}, then reassess the mapped opportunity.`;
    capitalPosture = "Wait for pressure to pass; do not deploy simply because a later expansion contact exists.";
  } else if (futureHostile) {
    mainLabel = `PRESSURE AHEAD — future expansion is conflict-heavy near ${opportunityIso ? formatDateReadable(opportunityIso) : "mapped window"}`;
    tacticalAction = replayTacticalActionText(summary, tacticalWindow || summary);
    strategicAction = `HIGH-POTENTIAL BUT RISKY — protect strength near ${opportunityIso ? formatDateReadable(opportunityIso) : "future window"}.`;
    currentStory = "Future expansion appears under hostile pressure; treat it as conflict or blow-off risk, not a clean best window.";
    capitalPosture = "Use strength carefully; use the next cleaner macro/stock-specific astro alignment before fresh strategic deployment.";
  }

  const rawResolved = {
    mainLabel,
    tacticalAction,
    strategicAction,
    currentStory,
    capitalPosture,
    effectiveOpportunity,
    effectivePressure,
    tacticalOpportunity: opportunityIso ? `Tactical opportunity: ${formatDateReadable(opportunityIso)} — ${languageSafeSignal(effectiveOpportunity || summary)}.` : "Tactical opportunity: pressure/repair first; no clean 30–90d add window mapped yet.",
    tacticalRisk: pressureIso ? `Tactical risk: ${formatDateReadable(pressureIso)} — ${replayPressureWindowText(effectivePressure)}` : "Tactical risk: no mapped pressure window yet.",
    strategicOpportunity: opportunityIso ? `Strategic opportunity: ${formatDateReadable(opportunityIso)} — ${languageSafeSignal(effectiveOpportunity || summary)}.` : "Strategic opportunity: no mapped strategic window yet.",
    strategicRisk: pressureIso ? `Strategic risk: ${formatDateReadable(pressureIso)} — protect after strength if opportunity comes first.` : "Strategic risk: not tightly mapped yet.",
    dormancyText: replayDormancyText(summary, tacticalWindow, strategicWindow, effectiveOpportunity),
    tacticalScore: replayCoherentScore(summary, currentExpansion ? replayCurrentWindow(summary) : tacticalWindow, effectiveOpportunity, "tactical"),
    strategicScore: replayCoherentScore(summary, tacticalWindow, strategicWindow || effectiveOpportunity, "strategic")
  };

  return reconcileReplayScoresAndActions(rawResolved);
}

function replayWhyReasons(summary, macro, tacticalWindow, strategicWindow, pressureWindow) {
  const reasons = [];
  const st = pressureExpansionState(summary || {});
  reasons.push(`Pressure ${Math.round(st.pressure)} vs expansion ${Math.round(st.expansion)}: ${st.highConflict ? "conflict reduces confidence, not direction" : st.expansionLead ? "expansion leads pressure" : st.pressureLead ? "pressure leads expansion" : "balanced/selective field"}.`);
  if (replayIsActiveExpansion(summary)) reasons.push("Current-window override applies only if contact quality is not pressure-contaminated.");
  const cq = replayAstroContactQuality(summary || {});
  if (cq.durableExpansion) reasons.push("Durable expansion support present: Jupiter/Venus contact is constructive if hard pressure does not dominate.");
  if (cq.contestedMars) reasons.push("Contested Mars expansion: Jupiter support is present, but Rahu/eclipse/Mars pressure contests follow-through.");
  if (cq.unstableExpansion) reasons.push("Contact-quality override: hard Saturn/eclipse/Mars pressure contaminates the expansion; avoid treating it as clean rerating.");
  const contacts = Array.isArray(summary?.topContactText) ? summary.topContactText.slice(0, 3) : [];
  contacts.forEach(text => reasons.push(formatDatesInText(text)));
  if (macro?.mainOpportunity?.label) reasons.push(`Macro opportunity: ${macro.mainOpportunity.label}.`);
  if (macro?.mainRisk?.label) reasons.push(`Macro risk: ${macro.mainRisk.label}.`);
  if (pressureWindow) reasons.push(replayPressureWindowText(pressureWindow));
  return reasons.slice(0, 5).join(" | ");
}

function replayMainLabelWithTiming(summary, tacticalWindow) {
  const signal = languageSafeSignal(summary || {});
  const date = tacticalWindow?.date || summary?.replayDate || null;
  const timing = date ? ` — watch ${formatDateReadable(date)}` : " — current replay window";
  return `${signal}${timing}`;
}

function replayScoreFromWindow(item, summary, kind = "tactical") {
  if (!item && !summary) return null;
  const pressure = numericValue(item?.pressureScore ?? summary?.pressureScore) ?? 50;
  const expansion = numericValue(item?.expansionScore ?? summary?.expansionScore) ?? 50;
  const leadership = numericValue(item?.leadershipProbability ?? summary?.leadershipProbability) ?? 50;
  let score = 5 + (expansion - pressure) / 35 + (leadership - 55) / 45;
  if (kind === "strategic") score += 0.4;
  if (pressure > expansion + 10) score -= 0.4;
  return Math.max(1, Math.min(10, score));
}

function replayLeadershipLabel(item, summary, label) {
  const value = numericValue(item?.leadershipProbability ?? summary?.leadershipProbability);
  if (value === null) return `- · ${label}`;
  return `${Math.round(value)}/100 · ${leadershipBand(value)} ${label}`;
}

function replayMainAction(summary) {
  const st = pressureExpansionState(summary || {});
  if (st.pressure >= 78 && st.expansion >= 70) return "WATCH CLOSELY";
  if (st.expansion >= st.pressure + 15 && st.leadership >= 75) return "ACCUMULATE";
  if (st.expansion >= st.pressure + 8 && st.leadership >= 60) return "STAGGER ADD";
  if (st.pressure >= st.expansion + 15) return "TRIM SATELLITE";
  if (st.pressure >= st.expansion + 8) return "WATCH CLOSELY";
  return "HOLD CORE";
}

function replayCorrectionMode(summary) {
  const pressure = numericValue(summary?.pressureScore) ?? 50;
  const expansion = numericValue(summary?.expansionScore) ?? 50;
  const volatility = String(summary?.volatility || "").toLowerCase();
  if (pressure >= expansion + 18) return "Price + time correction";
  if (pressure >= expansion + 8) return "Mixed correction";
  if (volatility.includes("high") || volatility.includes("volatile")) return "Volatile digestion";
  if (expansion >= pressure + 8) return "No major correction";
  return "Time correction";
}

function replayWindowDays(item) {
  const d = daysUntilDate(item?.date || item?.windowDate || "");
  return d === null ? 9999 : d;
}

function replayDormancyRisk(summary, strategicWindow) {
  const strategicScore = replayScoreFromWindow(strategicWindow, summary, "strategic") ?? 5;
  const tacticalScore = replayScoreFromWindow(summary?.forwardWindows?.tactical, summary, "tactical") ?? 5;
  const days = replayWindowDays(strategicWindow);
  if (strategicScore >= 7.5 && tacticalScore <= 6 && days > 365) return "VERY HIGH";
  if (strategicScore >= 7.5 && tacticalScore <= 6 && days > 120) return "HIGH";
  if (tacticalScore < 7 || days > 120) return "MODERATE";
  return "LOW";
}

function replayDominantSignature(summary, anchorWindow) {
  const text = (summary?.topContactText || []).join(" | ");
  const eventText = summary?.catalystWindow || summary?.environmentSignature || "Replay catalyst";
  const tests = [
    { re: /saturn.*opposition.*jupiter|jupiter.*opposition.*saturn/i, label: "Saturn opposition natal Jupiter", meaning: "expansion test; avoid fresh chase" },
    { re: /saturn.*rahu|rahu.*saturn/i, label: "Saturn–Rahu pressure", meaning: "maturity / reset signature" },
    { re: /saturn.*opposition|saturn.*square/i, label: "Saturn hard natal contact", meaning: "discipline and compression test" },
    { re: /rahu|ketu|eclipse/i, label: "Rahu/Ketu activation", meaning: "narrative heat and reversal sensitivity" },
    { re: /jupiter.*venus|venus.*jupiter/i, label: "Jupiter–Venus activation", meaning: "rerating and preference window" },
    { re: /jupiter/i, label: "Jupiter activation", meaning: "expansion / rerating search" },
    { re: /venus/i, label: "Venus activation", meaning: "valuation preference trigger" }
  ];
  const found = tests.find(test => test.re.test(text));
  const anchor = replayWindowAnchorText(anchorWindow);
  return found ? `${found.label} — ${found.meaning}${anchor}` : `${eventText} — stock-specific replay catalyst${anchor}`;
}

function replayStrategicAction(summary, strategicWindow) {
  return replayStrategicActionText(summary, strategicWindow);
}

function replayRegistryLine(summary) {
  const registry = summary?.registryType || summary?.registry_type || summary?.natalRegistryType || summary?.natal_registry_type || "REPLAY";
  const confidence = summary?.natalConfidence || summary?.natal_confidence || summary?.confidence || "Computed";
  return `${registry} · ${confidence}`;
}

function replayResolvedActionParts(resolved = {}, summary = {}) {
  const tactical = String(resolved.tacticalAction || "");
  const strategic = String(resolved.strategicAction || "");
  const joined = `${tactical} ${strategic} ${resolved.mainLabel || ""}`;
  const tacticalScore = numericValue(resolved.tacticalScore) ?? 5;
  const strategicScore = numericValue(resolved.strategicScore) ?? 5;
  const currentLeadership = numericValue(summary?.leadershipProbability) ?? numericValue(resolved?.currentLeadership) ?? 50;
  const durableLeadership = Math.max(
    numericValue(resolved?.strategicLeadership) ?? 0,
    numericValue(summary?.forwardLeadership) ?? 0,
    currentLeadership
  );

  if (/BREAK-RISK|HEAVY TRIM|protect capital/i.test(joined)) {
    return { corePosture: "HEAVY TRIM", freshCapital: "WATCH CLOSELY", tacticalBucket: "HEAVY TRIM" };
  }
  if (/TRIM SATELLITE|PRESSURE FIRST|protect excess/i.test(joined)) {
    return { corePosture: "TRIM SATELLITE", freshCapital: "WATCH CLOSELY", tacticalBucket: "TRIM SATELLITE" };
  }
  if (/ACCUMULATE|AGGRESSIVE/i.test(joined) && tacticalScore >= 8.8 && strategicScore >= 8.3) {
    return { corePosture: "HOLD WINNER", freshCapital: "ACCUMULATE", tacticalBucket: "ACCUMULATE" };
  }
  if (/STAGGER ADD|BUILDING RERATING|RERATING|STRONG FORWARD LEADER|HOLD WINNER|RALLY WITH CHURN|LEADER/i.test(joined)) {
    const corePosture = (currentLeadership >= 70 || durableLeadership >= 75 || strategicScore >= 7.8) ? "HOLD WINNER" : "HOLD CORE";
    const freshCapital = tacticalScore >= 6.8 ? "STAGGER ADD" : "WATCH CLOSELY";
    return { corePosture, freshCapital, tacticalBucket: freshCapital };
  }
  if (/WATCH|WAIT|DEFERRED|REPAIR|no clean edge/i.test(joined)) {
    return { corePosture: "WATCH CLOSELY", freshCapital: "WATCH CLOSELY", tacticalBucket: "WATCH CLOSELY" };
  }
  return { corePosture: "HOLD CORE", freshCapital: "WATCH CLOSELY", tacticalBucket: "HOLD CORE" };
}

function replayCoreFreshCapitalGuidance(resolved, summary = {}) {
  const parts = replayResolvedActionParts(resolved, summary);
  const risk = String(resolved?.strategicRisk || resolved?.tacticalRisk || "");
  if (parts.corePosture === "HEAVY TRIM" || parts.corePosture === "TRIM SATELLITE") {
    return `Core: ${parts.corePosture}; fresh capital waits. ${risk}`;
  }
  if (parts.corePosture === "HOLD WINNER") {
    return `Core: HOLD WINNER through normal/medium astro churn; fresh capital: ${parts.freshCapital}. ${risk}`;
  }
  if (parts.corePosture === "HOLD CORE") {
    return `Core: HOLD CORE; fresh capital: ${parts.freshCapital}. Use mapped astro windows, not late-cycle hope.`;
  }
  return `Core: ${parts.corePosture}; fresh capital: ${parts.freshCapital}. Keep capital tied to dated astro windows.`;
}

function replayScanNearest(summary, targetDays) {
  const scan = replayFullScan(summary);
  if (!scan.length) return null;
  return scan.slice().sort((a, b) => Math.abs((replayWindowOffset(summary, a) ?? 9999) - targetDays) - Math.abs((replayWindowOffset(summary, b) ?? 9999) - targetDays))[0];
}

function replayWeekSource(summary, week) {
  if (week <= 2) return replayCurrentWindow(summary);
  if (week <= 4) return replayScanNearest(summary, 30) || replayCurrentWindow(summary);
  return replayScanNearest(summary, 60) || replayScanNearest(summary, 30) || replayCurrentWindow(summary);
}

function replayPathPhrase(source, pressureIso, scope = "week") {
  const signal = languageSafeSignal(source || {});
  const st = pressureExpansionState(source || {});
  const date = replayIsoDate(source);
  const dateText = date ? `${scope === "month" ? "Around" : "Near"} ${formatDateReadable(date)}: ` : "";
  if (/BREAK-RISK|HEAVY TRIM|protect capital/i.test(signal)) return `${dateText}Break-risk dominates; protect capital before fresh deployment.`;
  if (/HIGH-VOLTAGE|VERTICAL|HIGH-ENERGY/i.test(signal)) return `${dateText}Vertical/volatile expansion possible; hold core, trim only excess.`;
  if (/RALLY WITH CHURN|VOLATILE UPSIDE/i.test(signal)) return `${dateText}Rally with churn; participate carefully and protect later strength.`;
  if (/STAGGER ADD|BUILDING RERATING|STRONG LEADER/i.test(signal)) return `${dateText}${signal}; deploy gradually, not vertically.`;
  if (/PRESSURE FIRST|TRIM|AVOID|WATCH ONLY/i.test(signal) || st.pressureLead) return `${dateText}${signal}; use the pressure-absorption gate before fresh capital.`;
  return `${dateText}${signal}; keep sizing disciplined.`;
}

function replayHasStrongForwardButWeakNow(resolved = {}, summary = {}) {
  const tacticalScore = numericValue(resolved.tacticalScore) ?? 5;
  const strategicScore = numericValue(resolved.strategicScore) ?? 5;
  const currentLeadership = numericValue(summary?.leadershipProbability) ?? 50;
  return strategicScore >= 6.7 && tacticalScore < 6.1 && currentLeadership < 62;
}

function buildReplayTacticalPathRows(resolved, summary, pressureWindow) {
  const strongForwardWeakNow = replayHasStrongForwardButWeakNow(resolved, summary);
  const pressureIso = replayIsoDate(pressureWindow);
  if (strongForwardWeakNow) {
    return [
      ["Week 1", formatDatesInText(`Replay date: pressure/repair first. Core can be held selectively; fresh capital waits for the next supportive natal contact${pressureIso ? ` after ${formatDateReadable(pressureIso)}` : ""}.`)],
      ["Week 2", "Catalyst absorption week: do not call this ‘no opportunity’; call it pressure-before-forward-leadership."],
      ["Week 3", "Watch for the first usable expansion contact; no stagger instruction until pressure stops dominating the natal chart."],
      ["Week 4", "Forward leadership scan: strong durability is visible, but current tactical leadership must lift before fresh deployment."],
      ["Week 5", "Capital posture: hold core / wait fresh; avoid fresh chase when hard Saturn/eclipse/Mars contacts contaminate expansion."],
      ["Week 6", "Upgrade requires a separately dated clean-expansion support gate."]
    ];
  }
  return [1, 2, 3, 4, 5, 6].map(week => {
    const source = replayWeekSource(summary, week);
    return [`Week ${week}`, formatDatesInText(replayPathPhrase(source, replayIsoDate(pressureWindow), "week"))];
  });
}

function buildReplayStrategicPathRows(resolved, summary, strategicWindow, bestWindow, pressureWindow) {
  const strongForwardWeakNow = replayHasStrongForwardButWeakNow(resolved, summary);
  const opportunity = resolved?.effectiveOpportunity || strategicWindow || bestWindow || summary;
  const oppIso = replayIsoDate(opportunity);
  const pressureIso = replayIsoDate(pressureWindow);
  if (strongForwardWeakNow) {
    const oppText = oppIso ? formatDateReadable(oppIso) : "the mapped forward window";
    return [
      ["Month 1", formatDatesInText(`Pressure/repair month. Hold core selectively; fresh capital waits for pressure absorption${pressureIso ? ` around ${formatDateReadable(pressureIso)}` : ""}.`)],
      ["Month 2", formatDatesInText(`Controlled forward-leader scan: first usable astro window is ${oppText}; use it only if expansion contacts dominate pressure contacts.`)],
      ["Month 3", "Accumulation gate: stagger only through supportive natal contacts; do not mark this as ‘no opportunity’ if durability remains strong."],
      ["Month 4", "Contact-quality review: durable Jupiter/Venus support can carry churn; Rahu/Mars/eclipse heat needs protection."],
      ["Month 5", "Fresh-capital gate: use only mapped supportive natal contacts, not distant cycle hope."],
      ["Month 6", "Forward path remains usable only while pressure is absorbed and leadership support persists."],
      ["Month 9", "Nine-month pressure scan: look for hard Saturn/eclipse/Mars contacts before adding to a tired window."],
      ["Month 12", "One-year review: classify the next major window as expansion, repair, dormancy, or protection from astrology contacts."],
      ["Month 18", "Eighteen-month map: do not let smaller pressure windows hide the larger strategic support/risk sequence."],
      ["Month 24", "Twenty-four-month map: keep the long cycle as context; near-window natal contacts decide deployment." ]
    ];
  }

  const forwardDays = Math.min(730, replayForwardDays(summary));
  const months = Math.max(1, Math.min(24, Math.ceil(forwardDays / 30)));
  const rows = [];
  for (let m = 1; m <= months; m += 1) {
    const targetDays = m * 30;
    const source = replayScanNearest(summary, targetDays) || (m === 1 ? replayCurrentWindow(summary) : strategicWindow || bestWindow || summary);
    const sourceOffset = replayWindowOffset(summary, source);
    const phrase = (sourceOffset !== null && sourceOffset > 120 && /STAGGER ADD|BUILDING RERATING/i.test(languageSafeSignal(source || {})))
      ? `Around ${formatDateReadable(replayIsoDate(source))}: far-window add signal demoted to astro-contact review; protect if hard Saturn/eclipse/Mars contacts dominate the supportive expansion.`
      : replayPathPhrase(source, replayIsoDate(pressureWindow), "month");
    rows.push([`Month ${m}`, formatDatesInText(phrase)]);
  }
  return rows;
}

function ReplayDecisionTable({ summary, macro, tacticalWindow, strategicWindow, bestWindow, pressureWindow, validationIntelligence }) {
  const correction = replayCorrectionMode(summary);
  const resolved = resolveReplayConflict(summary, macro, tacticalWindow, strategicWindow, bestWindow, pressureWindow);
  const effectiveOpportunity = resolved.effectiveOpportunity || bestWindow || strategicWindow || tacticalWindow;
  const effectivePressure = resolved.effectivePressure || pressureWindow;
  const tacticalPathRows = buildReplayTacticalPathRows(resolved, summary, effectivePressure);
  const strategicPathRows = buildReplayStrategicPathRows(resolved, summary, strategicWindow, effectiveOpportunity, effectivePressure);
  const replayParts = replayResolvedActionParts(resolved, summary);
  const researchReading = validationIntelligence?.currentResearchReading || null;
  const researchHorizon = researchReading?.capitalHorizon || {};
  const promotedTactical = researchHorizon?.tactical?.verdict || researchReading?.tacticalState || resolved.tacticalAction;
  const promotedStrategic = researchHorizon?.strategic?.verdict || researchReading?.strategicState || resolved.strategicAction;
  const promotedPassive = researchHorizon?.passiveLongTerm?.verdict || null;
  const promotedMainLabel = researchReading
    ? `${researchReading.strategicState || "RESEARCH-PROMOTED STORY"} — ${researchReading.direction || "UNRESOLVED"} / ${researchReading.pressure || "pressure unresolved"}`
    : resolved.mainLabel;
  const rows = [
    ["Registry", replayRegistryLine(summary)],
    ["Main label", promotedMainLabel],
    ["Core posture", replayParts.corePosture],
    ["Fresh capital action", replayParts.freshCapital],
    ["Tactical 30–45d", promotedTactical],
    ["Strategic 3–12m", promotedStrategic],
    ...(promotedPassive ? [["Passive long-term", promotedPassive]] : []),
    ...replayWindowMapRows(summary),
    ["Main pressure window", replayPressureWindowText(effectivePressure)],
    ["Tactical score /10", formatScore(resolved.tacticalScore)],
    ["Strategic score /10", formatScore(resolved.strategicScore)],
    ["Why", `${resolved.currentStory} | ${replayWhyReasons(summary, macro, tacticalWindow, effectiveOpportunity, effectivePressure)}`],
    ["Capital dormancy risk", resolved.dormancyText],
    ["Correction mode", correction],
    ["Core vs fresh capital", replayCoreFreshCapitalGuidance(resolved, summary)],
    ["Dominant astro signature", replayDominantSignature(summary, effectiveOpportunity || tacticalWindow)],
    ["Leadership potential", replayLeadershipLabel(tacticalWindow || summary, summary, "current catalyst")],
    ["Leadership durability", replayLeadershipLabel(strategicWindow || effectiveOpportunity || summary, summary, "forward window")]
  ];

  return (
    <>
      <div style={actionChipRowStyle}>
        <div style={actionChipPanelStyle}>
          <div style={miniLabelStyle}>Core Posture</div>
          <ActionBadge action={replayParts.corePosture} />
        </div>
        <div style={actionChipPanelStyle}>
          <div style={miniLabelStyle}>Fresh Capital</div>
          <ActionBadge action={replayParts.freshCapital} />
        </div>
        <div style={actionChipPanelStyle}>
          <div style={miniLabelStyle}>Strategic Action</div>
          <span style={strategicChipStyle}>{String(resolved.strategicAction || "WATCHLIST ONLY").split(" — ")[0]}</span>
        </div>
      </div>
      <ReadableInfoTable rows={rows} />
      <ReplayValidationStoryPanel intelligence={validationIntelligence} />
      <div style={pathGridStyle}>
        <PathTable
          title="Tactical Path — next 6 weeks"
          subtitle="Week-by-week path so the replay action is not trapped in one line."
          rows={tacticalPathRows}
        />
        <PathTable
          title="Strategic Path — next 24 months"
          subtitle="Month-by-month path for capital posture, leadership durability, pressure gates, and dormancy risk."
          rows={strategicPathRows}
        />
      </div>
    </>
  );
}


function ReplayValidationStoryPanel({ intelligence }) {
  if (!intelligence) return null;
  const current = intelligence.currentResearchReading || {};
  const accel = current.accelerationPotential || {};
  const dormancy = current.dormancy || {};
  const breakAssessment = current.breakAssessment || {};
  const flags = intelligence.disagreements || [];
  const tone = String(current.tacticalState || "").includes("AVOID")
    ? { border: "#fca5a5", bg: "#fef2f2" }
    : String(current.direction || "").startsWith("UP")
      ? { border: "#5eead4", bg: "#f0fdfa" }
      : { border: "#fcd34d", bg: "#fffbeb" };
  return (
    <div style={{ ...decisionCardStyle, marginTop: 16, marginBottom: 14, border: `1px solid ${tone.border}`, background: tone.bg }}>
      <div style={miniLabelStyle}>Replay Validation Intelligence · research only</div>
      <h3 style={{ margin: "4px 0 6px" }}>Coherent capital-allocation story</h3>
      <div style={smallMutedStyle}>Display only. Production scores, labels, actions, natal preference, and window selection remain unchanged.</div>
      <div style={{ marginTop: 10, fontWeight: 700, lineHeight: 1.55 }}>{intelligence.chronologicalStory}</div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Direction</div><strong>{current.direction || "—"}</strong></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Tactical</div><strong>{current.tacticalState || "—"}</strong></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Strategic</div><strong>{current.strategicState || "—"}</strong></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Pressure role</div><strong>{current.pressure || "—"}</strong></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Opportunity class</div><strong>{current.opportunityClass || "—"}</strong></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Acceleration potential</div><strong>{accel.band || "—"}</strong><div style={smallMutedStyle}>Research score {accel.score ?? "—"}/100</div></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Dormancy</div><strong>{dormancy.type || "—"}</strong><div style={smallMutedStyle}>{dormancy.reason || ""}</div></div>
        <div style={{ background: "white", borderRadius: 9, padding: 10, border: "1px solid #e5e7eb" }}><div style={miniLabelStyle}>Break test</div><strong>{breakAssessment.label || "—"}</strong><div style={smallMutedStyle}>{(breakAssessment.evidence || []).join(" · ") || "No termination evidence mapped."}</div></div>
      </div>
      {flags.length ? (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #d1d5db" }}>
          <strong>Research/model divergence flags:</strong> {flags.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

function ReplayValidationComparisonPanel({ intelligence }) {
  if (!intelligence) return null;
  const current = intelligence.currentResearchReading || {};
  const model = intelligence.modelReading || {};
  const timeline = intelligence.timeline || [];
  return (
    <div style={{ ...decisionCardStyle, marginTop: 18, border: "1px solid #c4b5fd", background: "#f5f3ff" }}>
      <div style={miniLabelStyle}>Astrology vs Model · research display only</div>
      <h3 style={{ margin: "4px 0 6px" }}>What the astrology suggests versus what production currently says</h3>
      <div style={smallMutedStyle}>{intelligence.methodologyNote}</div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #ddd6fe", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 800 }}>Research astrology reading</div>
          <div style={{ marginTop: 7 }}>Direction: <strong>{current.direction || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Tactical: <strong>{current.tacticalState || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Strategic: <strong>{current.strategicState || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Dormancy: <strong>{current.dormancy?.type || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Acceleration: <strong>{current.accelerationPotential?.band || "—"}</strong></div>
        </div>
        <div style={{ background: "white", border: "1px solid #ddd6fe", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 800 }}>Current production reading</div>
          <div style={{ marginTop: 7 }}>Signal: <strong>{model.signal || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Action bias: <strong>{model.actionBias || "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Expansion / pressure: <strong>{model.expansion ?? "—"} / {model.pressure ?? "—"}</strong></div>
          <div style={{ marginTop: 4 }}>Leadership: <strong>{model.leadership ?? "—"}</strong></div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontWeight: 800 }}>Research timeline classification</div>
      <div style={{ marginTop: 7, display: "grid", gap: 7 }}>
        {timeline.map((item, index) => (
          <div key={`${item.date}-${index}`} style={{ background: "white", border: "1px solid #ede9fe", borderRadius: 9, padding: 10 }}>
            <strong>{formatDateReadable(item.date)} · {item.role}</strong>
            <div style={{ marginTop: 3 }}>{item.direction} · {item.opportunityClass} · {item.pressure}</div>
            <div style={smallMutedStyle}>Acceleration: {item.accelerationPotential?.band || "—"} · {item.breakAssessment?.label || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function pct(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

function historicalEpisodeBehaviour(event) {
  const observed = event?.observedResponse || null;
  if (!observed) return "Price-response record not populated.";
  const classification = observed.classification || observed.label || "Observed response";
  return `${classification} · 30d ${pct(observed.return30d)} · 90d ${pct(observed.return90d)} · 180d ${pct(observed.return180d)} · max gain 90d ${pct(observed.maxGain90d)} · max drawdown 90d ${pct(observed.maxDrawdown90d)}`;
}

function HistoricalTransitEvidencePanel({ evidence }) {
  const contacts = evidence?.contacts || [];
  return (
    <div style={{ ...decisionCardStyle, marginTop: 18, border: "1px solid #99f6e4", background: "#f0fdfa" }}>
      <div style={miniLabelStyle}>Historical Transit Evidence · display only</div>
      <h3 style={{ margin: "4px 0 6px" }}>Current transits and the stock’s prior response</h3>
      <div style={smallMutedStyle}>
        This panel does not change any replay score, label, window, or action. Archive records available: {evidence?.archiveRecordCount ?? 0}.
      </div>
      {contacts.length ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {contacts.map((item, index) => (
            <div key={`${item.transitFamily}-${index}`} style={{ border: "1px solid #ccfbf1", borderRadius: 10, background: "white", padding: 12 }}>
              <div style={{ fontWeight: 800 }}>
                {item.currentContact?.text || item.transitFamily}
                {Number.isFinite(Number(item.currentContact?.orb)) ? ` · orb ${Number(item.currentContact.orb).toFixed(2)}°` : ""}
              </div>
              <div style={{ ...smallMutedStyle, marginTop: 3 }}>
                Exact company/contact-family matches before the replay date: {item.evidenceCount || 0}
              </div>
              {item.priorEpisodes?.length ? (
                <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
                  {item.priorEpisodes.map((event, eventIndex) => (
                    <div key={event.id || `${event.eventDate}-${eventIndex}`} style={{ paddingTop: 7, borderTop: eventIndex ? "1px solid #e5e7eb" : "none" }}>
                      <strong>{formatDateReadable(event.eventDate)}</strong>
                      <div style={{ marginTop: 2 }}>{historicalEpisodeBehaviour(event)}</div>
                      <div style={{ ...smallMutedStyle, marginTop: 2 }}>
                        Macro P/E: {event.macroPressure ?? "—"}/{event.macroExpansion ?? "—"}
                        {event?.macroContext?.environment ? ` · ${event.macroContext.environment}` : ""}
                        {event?.transitEpisode?.peak?.orb != null ? ` · peak orb ${Number(event.transitEpisode.peak.orb).toFixed(2)}°` : ""}
                        {event?.evidenceSource?.type ? ` · source: ${event.evidenceSource.type}` : ""}
                      </div>
                      {event?.observedResponse?.sequence ? <div style={{ ...smallMutedStyle, marginTop: 3 }}>{event.observedResponse.sequence}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 7 }}>{item.note}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>No current slow-transit contacts were available for historical comparison.</div>
      )}
    </div>
  );
}


function EpisodeInteractionDisplayPanel({ episode }) {
  if (!episode) return null;
  const present = episode.presentStructure || {};
  const timeline = episode.timeline || [];
  const analogues = episode.historicalEpisodeAnalogues || [];
  const listText = (items=[]) => items.length ? items.join(" · ") : "None mapped";
  const driverText = (items=[]) => items.length
    ? items.map(item => `${item.text}${item.score != null ? ` (${item.score > 0 ? "+" : ""}${Number(item.score).toFixed(2)})` : ""}`).join(" · ")
    : "None mapped";
  const macroDriverText = (items=[]) => items?.length ? items.join(" · ") : "None mapped";
  return (
    <div style={{ ...decisionCardStyle, marginTop: 18, border: "1px solid #5eead4", background: "#ecfeff" }}>
      <div style={miniLabelStyle}>Historical Episode & Forecast Interaction · display only</div>
      <h3 style={{ margin: "4px 0 6px" }}>How the macro field and natal contacts interact through time</h3>
      <div style={smallMutedStyle}>No replay score, label, window, or action is changed by this panel.</div>

      <div style={{ marginTop: 12, border: "1px solid #a5f3fc", borderRadius: 10, background: "white", padding: 12 }}>
        <div style={{ fontWeight: 800 }}>Present episode structure</div>
        <div style={{ marginTop: 7 }}><strong>Macro environment:</strong> {present.macroEnvironment || "—"}</div>
        <div style={{ marginTop: 4 }}><strong>Macro pressure {present.macroPressure ?? "—"}</strong> — driven mainly by {macroDriverText(present.macroDrivers?.pressure)}</div>
        <div style={{ marginTop: 4 }}><strong>Macro expansion {present.macroExpansion ?? "—"}</strong> — driven mainly by {macroDriverText(present.macroDrivers?.expansion)}</div>
        {present.macroDrivers?.amplifiers?.length ? <div style={{ marginTop: 4 }}><strong>Macro amplifiers:</strong> {macroDriverText(present.macroDrivers.amplifiers)}</div> : null}

        <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid #e5e7eb" }}>
          <div><strong>Stock pressure score {present.stockPressure ?? "—"}</strong> — driven mainly by {driverText(present.pressureDrivers)}</div>
          <div style={{ marginTop: 5 }}><strong>Stock expansion score {present.stockExpansion ?? "—"}</strong> — driven mainly by {driverText(present.expansionDrivers)}</div>
          <div style={{ marginTop: 5 }}><strong>Amplifiers / ignition:</strong> {driverText(present.amplifierDrivers)}</div>
          <div style={{ marginTop: 5 }}><strong>Mixed / conflict contacts:</strong> {driverText(present.mixedDrivers)}</div>
        </div>
        <div style={{ ...smallMutedStyle, marginTop: 7 }}>{present.summary}</div>
        {present.episodeStart ? <div style={{ ...smallMutedStyle, marginTop: 3 }}>Episode tracked from: {formatDateReadable(present.episodeStart)}</div> : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800 }}>Forecast interaction timeline</div>
        <div style={{ ...smallMutedStyle, marginTop: 3 }}>{episode.forecastContinuity?.summary}</div>
        <div style={{ ...smallMutedStyle, marginTop: 2 }}>
          Weighted direct-contact support {episode.forecastContinuity?.weightedSupport ?? "—"} vs hard pressure {episode.forecastContinuity?.weightedPressure ?? "—"}; sampled checkpoints {episode.forecastContinuity?.supportCheckpoints ?? 0}/{episode.forecastContinuity?.pressureCheckpoints ?? 0}.
        </div>
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {timeline.map((phase, index) => (
            <div key={`${phase.date}-${index}`} style={{ border: "1px solid #cffafe", borderRadius: 10, background: "white", padding: 11 }}>
              <div style={{ fontWeight: 800 }}>{formatDateReadable(phase.date)} · {phase.role}</div>
              <div style={{ marginTop: 3 }}>{phase.state}</div>
              {phase.macro ? (
                <div style={{ marginTop: 5, padding: 8, borderRadius: 8, background: "#f8fafc" }}>
                  <div><strong>Macro environment:</strong> {phase.macro.environment || "—"}</div>
                  <div style={{ marginTop: 3 }}><strong>Macro pressure {phase.macro.pressure ?? "—"}</strong> — {macroDriverText(phase.macro.drivers?.pressure)}</div>
                  <div style={{ marginTop: 3 }}><strong>Macro expansion {phase.macro.expansion ?? "—"}</strong> — {macroDriverText(phase.macro.drivers?.expansion)}</div>
                </div>
              ) : null}
              <div style={{ marginTop: 6 }}><strong>Stock pressure score {phase.stockState?.pressure ?? "—"}</strong> — driven mainly by {driverText(phase.stockState?.pressureDrivers)}</div>
              <div style={{ marginTop: 4 }}><strong>Stock expansion score {phase.stockState?.expansion ?? "—"}</strong> — driven mainly by {driverText(phase.stockState?.expansionDrivers)}</div>
              <div style={{ marginTop: 4 }}><strong>Amplifiers / ignition:</strong> {driverText(phase.stockState?.amplifierDrivers)}</div>
              <div style={{ marginTop: 4 }}><strong>Mixed / conflict:</strong> {driverText(phase.stockState?.mixedDrivers)}</div>
              <div style={{ ...smallMutedStyle, marginTop: 5 }}>{phase.interaction}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #a5f3fc", borderRadius: 10, background: "white", padding: 12 }}>
        <div style={{ fontWeight: 800 }}>Closest historical episode analogues</div>
        {analogues.length ? analogues.map((event, index) => (
          <div key={event.id || `${event.eventDate}-${index}`} style={{ paddingTop: 8, marginTop: index ? 8 : 0, borderTop: index ? "1px solid #e5e7eb" : "none" }}>
            <strong>{formatDateReadable(event.eventDate)} · analogue score {event.analogueScore}</strong>
            <div style={{ marginTop: 3 }}>{historicalEpisodeBehaviour(event)}</div>
            <div style={{ ...smallMutedStyle, marginTop: 4 }}><strong>Why similar:</strong> {(event.similarityReasons || []).join("; ") || "partial company analogue"}</div>
            <div style={{ ...smallMutedStyle, marginTop: 3 }}><strong>Why different / incomplete:</strong> {(event.differenceReasons || []).join("; ") || "No material difference recorded"}</div>
          </div>
        )) : <div style={{ marginTop: 6 }}>No populated prior episode analogue is available yet.</div>}
      </div>

      <div style={{ ...smallMutedStyle, marginTop: 10 }}>{episode.forecastContinuity?.caution}</div>
    </div>
  );
}

function ReplayLab({ input, setInput, result, error, loading, onRun, researchView, replayMode, setReplayMode, natalCandidates = [], natalCandidateMeta = null }) {
  const summary = result?.replaySummary || null;
  const macro = result?.macroSnapshot || null;
  const validation = summary?.chartValidation || null;
  const contacts = summary?.topContactText || [];
  const windows = summary?.forwardWindows || {};
  const windowMap = windows.windowMap || {};
  const tacticalWindow = windowMap.tacticalOpportunity || windows.tactical || windows.immediate || null;
  const strategicWindow = windowMap.strategicOpportunity || windowMap.strategicAccumulation || windows.strategic || windows.bestWindow || null;
  const bestWindow = windowMap.nearestUsableWindow || windowMap.accumulationOpen || windows.nearestUsableWindow || windows.bestWindow || null;
  const pressureWindow = windowMap.tacticalRisk || windowMap.strategicRisk || (Array.isArray(windows.pressureWindows) ? windows.pressureWindows[0] : null);
  const narrative = result?.narrativeSynthesis || null;

  const update = (field, value) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={replayLabStyle}>
      <div style={detailHeaderStyle}>
        <div>
          <div style={miniLabelStyle}>Replay Lab</div>
          <h2 style={{ margin: 0 }}>Swiss-backed Astro Replay</h2>
          <p style={subtitleStyle}>
            Replay uses the same Decision Summary, Tactical Path, and Strategic Path structure as the expanded stock card.
          </p>
        </div>
        <button onClick={onRun} style={buttonStyle("#0f766e")}>
          {loading ? "Running replay..." : "Run Replay"}
        </button>
      </div>

      <div style={replayFormGridStyle}>
        <label>
          Ticker
          <input style={inputStyle} value={input.ticker || ""} onChange={e => update("ticker", e.target.value)} placeholder="ICICIBANK.NS" />
        </label>
        <label>
          Research natal chart
          <select style={inputStyle} value={input.chartId || ""} onChange={e => update("chartId", e.target.value)}>
            <option value="">Production default{natalCandidateMeta?.preferredChartId ? ` · ${natalCandidateMeta.preferredChartId}` : ""}</option>
            {natalCandidates.map(chart => (
              <option key={chart.id} value={chart.id}>
                {chart.chartType} · {chart.date} · {chart.time || "—"} · {chart.city || "—"}{chart.isProductionDefault ? " · default" : ""}
              </option>
            ))}
          </select>
          <span style={smallMutedStyle}>Research-only override; it does not change the production registry.</span>
        </label>
        <label>
          Replay date
          <input style={inputStyle} type="date" value={input.date || ""} onChange={e => update("date", e.target.value)} />
        </label>
        <label>
          Validation horizon
          <select style={inputStyle} value={input.forwardDays || "730"} onChange={e => update("forwardDays", e.target.value)}>
            <option value="30">Tactical · 30 days</option>
            <option value="45">Tactical · 45 days</option>
            <option value="90">Strategic · 3 months</option>
            <option value="180">Strategic · 6 months</option>
            <option value="365">Strategic · 12 months</option>
            <option value="540">Strategic · 18 months</option>
            <option value="730">Strategic · 24 months</option>
          </select>
        </label>
      </div>

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {summary ? (
        <div style={replayResultStyle}>
          <div style={{ ...simpleReplayLineStyle, ...replayToneStyle(summary) }}>
            <strong>{summary.ticker} · {formatDateReadable(result?.input?.date)}</strong>
            <div style={{ marginTop: 6 }}>{buildReplaySimpleLine(summary, macro)}</div>
          </div>

          <div style={replayChipRowStyle}>
            <SummaryBadge label={`Regime: ${summary.regime || "-"}`} tone={String(summary.regime || "").toLowerCase().includes("pressure") ? "pressure" : "neutral"} />
            <SummaryBadge label={`Signal: ${languageSafeSignal(summary)}`} tone="neutral" />
            <SummaryBadge label={`Confidence: ${summary.confidence || "-"}`} tone={summary.confidence === "Positive" ? "high" : summary.confidence === "Weak" ? "pressure" : "moderate"} />
            <SummaryBadge label={`P/E: ${summary.pressureScore ?? "-"}/${summary.expansionScore ?? "-"}`} tone={Number(summary.pressureScore) > Number(summary.expansionScore) ? "pressure" : "high"} />
          </div>

          {result?.natalResearch ? (
            <div style={{ ...decisionCardStyle, borderColor: "#99f6e4", background: "#f0fdfa", marginTop: 12 }}>
              <div style={miniLabelStyle}>Natal source research</div>
              <div style={{ marginTop: 6 }}>
                <strong>Selected:</strong> {result.natalResearch.selectedChartId || "production default"} · {result.resolvedCompany?.chartType || "—"} · {result.resolvedCompany?.birthDate || "—"} · {result.resolvedCompany?.birthTime || "—"} · {result.resolvedCompany?.city || "—"}
              </div>
              <div style={{ ...smallMutedStyle, marginTop: 5 }}>
                {result.natalResearch.candidateCount} credible candidate chart(s) available. Production impact: none.
                {result.natalResearch.researchCase ? ` Research case: ${result.natalResearch.researchCase}.` : ""}
              </div>
            </div>
          ) : null}

          <div style={replayModeToggleWrapStyle}>
            <button
              type="button"
              onClick={() => setReplayMode?.("QUICK")}
              style={replayModeButtonStyle(replayMode === "QUICK")}
            >
              Quick scan
            </button>
            <button
              type="button"
              onClick={() => setReplayMode?.("DETAILED")}
              style={replayModeButtonStyle(replayMode === "DETAILED")}
            >
              Detailed mode
            </button>
            <span style={smallMutedStyle}>Quick scan keeps the model output readable; charts remain validation-only after the replay is recorded.</span>
          </div>

          <div style={decisionCardStyle}>
            <div style={miniLabelStyle}>Replay decision summary</div>
            <ReplayDecisionTable
              summary={summary}
              macro={macro}
              tacticalWindow={tacticalWindow}
              strategicWindow={strategicWindow}
              bestWindow={bestWindow}
              pressureWindow={pressureWindow}
              validationIntelligence={result?.replayValidationIntelligence}
            />
          </div>

          {narrative ? (
            <div style={{ ...decisionCardStyle, borderColor: "#5eead4", background: "#f0fdfa" }}>
              <div style={miniLabelStyle}>v33 Narrative Synthesis</div>
              <div style={{ marginTop: 6, fontWeight: 800 }}>{narrative.currentState}</div>
              <div style={{ marginTop: 8 }}>{narrative.singleStory}</div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Tactical 30–60d</div>
                  <div style={{ fontWeight: 800 }}>{narrative.capitalAction?.tactical?.action || "—"}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Strategic 3–24m</div>
                  <div style={{ fontWeight: 800 }}>{narrative.capitalAction?.strategic?.action || "—"}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Passive long-term</div>
                  <div style={{ fontWeight: 800 }}>{narrative.capitalAction?.passiveLongTerm?.action || "—"}</div>
                </div>
              </div>
              <div style={{ ...smallMutedStyle, marginTop: 8 }}>
                Confidence: {narrative.confidence?.label || "—"} ({narrative.confidence?.score ?? "—"}/100)
                {narrative.protectionDate ? ` · Protection/review: ${formatDateReadable(narrative.protectionDate)}` : ""}
                {narrative.accelerationDate ? ` · Future gate: ${formatDateReadable(narrative.accelerationDate)}` : ""}
              </div>
              {Array.isArray(narrative.why) && narrative.why.length ? (
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  {narrative.why.slice(0, 5).map((line, idx) => <li key={idx}>{line}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}

          <ReplayValidationComparisonPanel intelligence={result?.replayValidationIntelligence} />

          {replayMode === "DETAILED" ? (
            <>
              <div style={detailTwoColumnStyle}>
                <ReplayWindowCard
                  title="Tactical window"
                  horizon="30–45 days"
                  purpose="Tactical"
                  item={tacticalWindow}
                />
                <ReplayWindowCard
                  title="Strategic window"
                  horizon="3–12 months"
                  purpose="Strategic"
                  item={strategicWindow}
                />
              </div>

              <div style={detailTwoColumnStyle}>
                <div style={responseBoxStyle}>
                  <strong>Replay hypothesis</strong>
                  <p>{validation?.expectedChartBehaviour}</p>
                  <div style={smallMutedStyle}>{validation?.pressureExpansionContext}</div>
                </div>
                <div style={whyBoxStyle}>
                  <strong>Advance notice</strong>
                  <div style={{ marginTop: 8 }}>{bestWindow ? compactWindowText(bestWindow, "Best add/leadership candidate") : "No best-window candidate computed yet."}</div>
                  <div style={{ marginTop: 8 }}>{pressureWindow ? compactWindowText(pressureWindow, "Trim/protection watch") : "No pressure-window candidate computed yet."}</div>
                </div>
              </div>
            </>
          ) : null}

          {researchView ? (
            <>
              <div style={replaySummaryGridStyle}>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Stock</div>
                  <div style={bigTextStyle}>{summary.ticker}</div>
                  <div style={smallMutedStyle}>{summary.companyName}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Expression</div>
                  <div style={bigTextStyle}>{summary.expression}</div>
                  <div style={smallMutedStyle}>Base: {summary.baseExpression || "-"}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Confidence</div>
                  <div style={bigNumberStyle}>{summary.confidence}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Leadership</div>
                  <div style={bigNumberStyle}>{summary.leadershipProbability}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Pressure / Expansion</div>
                  <div style={bigTextStyle}>{summary.pressureScore} / {summary.expansionScore}</div>
                  <div style={smallMutedStyle}>Raw {summary.rawPressureScore} / {summary.rawExpansionScore}</div>
                </div>
                <div style={detailMetricStyle}>
                  <div style={miniLabelStyle}>Volatility</div>
                  <div style={bigTextStyle}>{summary.volatility}</div>
                  <div style={smallMutedStyle}>Rotation risk: {summary.rotationRisk}</div>
                </div>
              </div>

              <div style={detailTwoColumnStyle}>
                <div style={detailCardStyle}>
                  <strong>Macro context</strong>
                  <div style={{ marginTop: 8 }}>{macro?.headline || "-"}</div>
                  <div style={smallMutedStyle}>Provider: {macro?.provider || "-"} · {macro?.precision || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Main opportunity:</strong> {macro?.mainOpportunity?.label || "-"}</div>
                  <div><strong>Main risk:</strong> {macro?.mainRisk?.label || "-"}</div>
                  <div style={{ marginTop: 8 }}>{summary.macroStockImplication}</div>
                </div>

                <div style={detailCardStyle}>
                  <strong>Stock organism</strong>
                  <div style={{ marginTop: 8 }}>Natal type: {summary.natalArchetype}</div>
                  <div>Element bias: {summary.elementBias}</div>
                  <div>Dominant planets: {(summary.dominantPlanets || []).join(", ") || "-"}</div>
                  <div>Phase fit: {summary.phaseFit}</div>
                  <div>Multibagger probability: {summary.multibaggerProbability}</div>
                  <div>Historical similarity: {summary.historicalSimilarity}</div>
                </div>
              </div>

              <div style={detailTwoColumnStyle}>
                <div style={whyBoxStyle}>
                  <strong>Validation checklist</strong>
                  {(validation?.whatToCheckOnTradingView || []).map((line, index) => (
                    <div key={index} style={{ marginTop: 6 }}>• {line}</div>
                  ))}
                </div>
                <div style={detailCardStyle}>
                  <strong>Context note</strong>
                  <p style={{ marginBottom: 0 }}>{summary.contextNote}</p>
                </div>
              </div>

              <div style={detailTwoColumnStyle}>
                <div style={detailCardStyle}>
                  <strong>Top natal contacts</strong>
                  {contacts.length ? contacts.slice(0, 5).map((line, index) => (
                    <div key={index} style={contactLineStyle}>{line}</div>
                  )) : <div style={{ marginTop: 8 }}>No major contacts in replay output.</div>}
                </div>
                <div style={detailCardStyle}>
                  <strong>Forward windows</strong>
                  <div style={{ marginTop: 8 }}>{compactWindowText(tacticalWindow, "Tactical 30–45 days")}</div>
                  <div style={{ marginTop: 8 }}>{compactWindowText(strategicWindow, "Strategic 3–12 months")}</div>
                  <div style={{ marginTop: 8 }}>{bestWindow ? compactWindowText(bestWindow, "Best window") : "Best window pending."}</div>
                  <div style={{ marginTop: 8 }}>{pressureWindow ? compactWindowText(pressureWindow, "Pressure window") : "Pressure window pending."}</div>
                </div>
              </div>

              <details style={researchJsonStyle}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Developer / raw JSON preview</summary>
                <pre style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  {JSON.stringify({ input: result.input, replaySummary: summary }, null, 2)}
                </pre>
              </details>
            </>
          ) : null}
        </div>
      ) : (
        <div style={stableBoxStyle}>
          Run a replay to generate a short reading, tactical window, strategic window, and chart-validation checklist.
        </div>
      )}
    </div>
  );
}

function readinessTone(readiness) {
  const value = String(readiness || "").toLowerCase();

  if (value.includes("near")) {
    return "near";
  }

  if (value.includes("prepare")) {
    return "prepare";
  }

  if (value.includes("later")) {
    return "later";
  }

  if (value.includes("add natal")) {
    return "missing";
  }

  return "neutral";
}

function readinessStyle(readiness) {
  const tone = readinessTone(readiness);
  const styles = {
    near: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
    prepare: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
    later: { background: "#e0f2fe", color: "#075985", border: "1px solid #7dd3fc" },
    missing: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" },
    neutral: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }
  };

  return styles[tone];
}

function actionExplanation(stock) {
  if (!stock?.computed_from_natal) {
    return "Natal data is missing, so Fin-Lumen is deliberately withholding stock-specific inference. Add a reliable natal date/source first.";
  }

  const resolvedDecision = finalStockDecision(stock);
  const action = resolvedDecision.tacticalAction || stock.action || "WATCH CLOSELY";
  const readiness = String(stock.catalyst_readiness || stock.current_window || "").toLowerCase();
  const leadership = Number(stock.leadership_probability || 0);
  const strategic = strategicScoreValue(stock) ?? 5;
  const dormancy = capitalDormancyRiskValue(stock);
  const sev = pressureRoutingState(stock).severity;
  const type = stock?.structural_cycle || "this stock";

  if (action.includes("ACCUMULATE")) {
    return `Action is constructive because ${type} has a deployable leadership/catalyst mix. Deploy in stages; the mapped window is the active leadership test.`;
  }

  if (action.includes("STAGGER")) {
    return `A constructive window is opening for ${type}, but it is not an all-in signal. Stagger because pressure/churn still needs astro absorption.`;
  }

  if (action.includes("TRIM") || action.includes("REDUCE")) {
    return `Action is defensive because high/break pressure or weak leadership dominates the stock-specific read. Treat rallies as protection opportunities until repair confirms.`;
  }

  if (sev.key === "low" || sev.key === "medium") {
    if (leadership < 62 || strategic < 6.8 || dormancy !== "LOW") {
      return `This is a watch/repair setup, not a clean rerating. ${sev.label} means churn or delay; leadership is only ${Math.round(leadership)}/100 and dormancy is ${dormancy.toLowerCase()}.`;
    }
    return `${sev.label} is manageable. Hold core or stagger according to the current action label; normal churn is not a strategic break.`;
  }

  if (readiness.includes("near") && leadership >= 60) {
    return "The catalyst is close and leadership is reasonable; the current label remains in force until the next dated astro gate.";
  }

  return "No decisive stock-specific action edge yet. Continue observing upcoming catalysts, natal contacts, and sector/personality response.";
}

function compactContactList(value) {
  const lines = splitLines(value);

  if (!lines.length) {
    return ["No contact text available yet."];
  }

  return lines;
}


function NatalEditor({ stock, form, setForm, onSave, message }) {
  if (!stock) {
    return null;
  }

  const locked = isCoreLocked(stock);

  const update = (field, value) => {
    if (locked) return;

    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={natalEditorStyle}>
      <div style={detailHeaderStyle}>
        <div>
          <div style={miniLabelStyle}>Natal registry editor</div>
          <h3 style={{ margin: 0 }}>{stock.name}</h3>
          <div style={smallMutedStyle}>
            {locked
              ? "Core registry stock — natal data locked. Edit only in code."
              : <>User-added natal data can be edited here and saved to Supabase table <code>natal_registry</code>.</>}
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={locked}
          title={locked ? "Core registry stock — natal data locked" : "Save natal data"}
          style={buttonStyle(locked ? "#9ca3af" : "#7c3aed")}
        >
          {locked ? "Core Locked" : "Save Natal Data"}
        </button>
      </div>

      <div style={natalFormGridStyle}>
        <label>Symbol<input disabled={locked} style={inputStyle} value={form.symbol || ""} onChange={e => update("symbol", e.target.value)} /></label>
        <label>Company name<input disabled={locked} style={inputStyle} value={form.companyName || ""} onChange={e => update("companyName", e.target.value)} /></label>
        <label>Chart type
          <select disabled={locked} style={inputStyle} value={form.chartType || "incorporation"} onChange={e => {
            const chartType = e.target.value;
            const listingLike = chartType.includes("listing") || chartType.includes("record-date");
            setForm(prev => ({ ...prev, chartType, chartId: chartType, birthTime: listingLike ? "09:15" : "11:00", city: listingLike ? "Mumbai" : prev.city }));
          }}>
            <option value="incorporation">incorporation</option><option value="listing">listing</option><option value="record-date">record date</option>
            <option value="demerger-effective">demerger effective</option><option value="scheme-effective">scheme effective</option><option value="foundation">foundation</option>
          </select>
        </label>
        <label>Chart ID<input disabled={locked} style={inputStyle} value={form.chartId || ""} onChange={e => update("chartId", e.target.value)} placeholder="listing / incorporation / custom-event" /></label>
        <label>Natal date<input disabled={locked} style={inputStyle} type="date" value={form.birthDate || ""} onChange={e => update("birthDate", e.target.value)} /></label>
        <label>Natal time<input disabled={locked} style={inputStyle} type="time" value={form.birthTime || ""} onChange={e => update("birthTime", e.target.value)} /></label>
        <label>Place / city<input disabled={locked} style={inputStyle} value={form.city || ""} onChange={e => update("city", e.target.value)} /></label>
        <label>Country<input disabled={locked} style={inputStyle} value={form.country || "India"} onChange={e => update("country", e.target.value)} /></label>
        <label>Timezone<input disabled={locked} style={inputStyle} value={form.timezone || "Asia/Kolkata"} onChange={e => update("timezone", e.target.value)} /></label>
        <label>Confidence<select disabled={locked} style={inputStyle} value={form.confidence || "low"} onChange={e => update("confidence", e.target.value)}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
        <label>Audit status<select disabled={locked} style={inputStyle} value={form.auditStatus || "manual-entry"} onChange={e => update("auditStatus", e.target.value)}><option value="verified">verified</option><option value="provisional">provisional</option><option value="ambiguous">ambiguous</option><option value="restructured-entity">restructured entity</option><option value="manual-entry">manual entry</option></select></label>
        <label>Source / note<input disabled={locked} style={inputStyle} value={form.source || ""} onChange={e => update("source", e.target.value)} /></label>
      </div>
      <div style={smallMutedStyle}>Resolved chart preview: {normalizeUiDate(form.birthDate) || "date required"} · {form.birthTime || "time required"} · {form.city || "place required"} · {form.chartType || "chart type required"}</div>

      {message ? <div style={smallMutedStyle}>{message}</div> : null}
    </div>
  );
}


function strategicSituationText(stock) {
  if (!stock?.computed_from_natal) return "Natal chart pending; no strategic situation can be inferred.";
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const best = bestWindowText(stock);
  const forward = parseForwardLeadership(stock);
  const tactical = tacticalScoreValue(stock);
  const timing = mappedWindowTimingLabel(stock);
  const forwardText = forward !== null ? `${forward}/100 · ${leadershipBand(forward)} forward window` : "no strong forward leadership mapped";
  const pressure = pressureWindowText(stock);
  const phase = cycleStageLabel(stock?.phase_fit || stock?.recovery_window || "Unclear / Watch");

  if (forward !== null && forward >= 85 && (timing === "current/near" || timing === "within 6 months" || hasNearTermDeploymentSignal(stock))) {
    return `Priority forward leadership is mapped: ${forwardText}. Timing: ${timing}. Mapped astro window: ${best}. Current posture: ${action}.`;
  }

  if (forward !== null && forward >= 75 && tactical !== null && tactical < 5) {
    return `Low tactical leadership now (${formatScore(tactical)}), but ${forwardText} is mapped. Timing: ${timing}. Current posture: ${action}. Astro reassessment near ${best}. Pressure/catalyst: ${pressure}.`;
  }

  if (forward !== null && forward >= 75 && timing === "distant") {
    return `Forward leadership is visible but distant: ${forwardText}. This is not current deployability. Current posture: ${action}. Mapped astro window: ${best}.`;
  }

  if (forward !== null && forward >= 75) {
    return `Forward leadership is visible: ${forwardText}. Timing: ${timing}. Current posture: ${action}. Mapped astro window: ${best}.`;
  }

  if (tactical !== null && tactical < 5) {
    return `Low tactical leadership now and no strong forward leadership is mapped. Current posture: ${action}. Accumulation/review map: ${best}.`;
  }

  return `${phase}. Strategic field: ${forwardText}. Current posture: ${action}. Accumulation/review map: ${best}.`;
}

function eventStatusDaysText(stock) {
  const readiness = stock?.catalyst_readiness || stock?.current_window || stock?.next_pressure || "Prepare";
  const timing = readableEventTiming({
    date: stock?.catalyst_date || extractFirstIsoDate(stock?.cycle_potential_window || stock?.recovery_window || ""),
    days: stock?.days_to_event ?? stock?.next_ignition,
    phase: readiness,
    includeShadow: /eclipse|rahu|ketu|shadow/i.test([stock?.catalyst_label, stock?.current_window, stock?.next_pressure, stock?.environment_signature].join(" "))
  });
  return timing || readiness || "timing not mapped";
}

function contactTextPool(stock) {
  return [
    ...(Array.isArray(stock?.top_transits) ? stock.top_transits : []),
    ...(Array.isArray(stock?.catalyst_contact_text) ? stock.catalyst_contact_text : splitLines(stock?.catalyst_contact_text)),
    stock?.catalyst_response,
    stock?.expected_behaviour,
    stock?.environment_signature,
    stock?.catalyst_label
  ].filter(Boolean).map(String);
}

function dominantAstroSignature(stock) {
  if (!stock?.computed_from_natal) return "Natal chart pending.";
  const pool = contactTextPool(stock);
  const timing = eventStatusDaysText(stock);
  const tests = [
    { re: /saturn.*opposition.*jupiter|jupiter.*opposition.*saturn/i, label: "Saturn opposition natal Jupiter", meaning: "expansion test; avoid fresh chase" },
    { re: /saturn.*conjunction.*rahu|rahu.*conjunction.*saturn/i, label: "Saturn–Rahu pressure", meaning: "maturity / reset signature" },
    { re: /saturn.*opposition|saturn.*square/i, label: "Saturn hard natal contact", meaning: "discipline and compression test" },
    { re: /rahu|ketu|eclipse/i, label: "Rahu/Ketu activation", meaning: "narrative heat and reversal sensitivity" },
    { re: /mars.*saturn|saturn.*mars/i, label: "Mars–Saturn activation", meaning: "friction and stop-start pressure" },
    { re: /saturn/i, label: "Saturn activation", meaning: "review, cooling, and patience test" },
    { re: /jupiter.*venus|venus.*jupiter/i, label: "Jupiter–Venus activation", meaning: "rerating and preference window" },
    { re: /jupiter/i, label: "Jupiter activation", meaning: "expansion / rerating search" },
    { re: /venus/i, label: "Venus activation", meaning: "valuation preference trigger" },
    { re: /sun.*rahu|rahu.*sun/i, label: "Sun–Rahu activation", meaning: "spotlight and narrative amplifier" }
  ];

  for (const test of tests) {
    const hit = pool.find(text => test.re.test(text));
    if (hit) {
      return `${test.label} — ${test.meaning} · ${timing}`;
    }
  }

  const catalyst = stock?.catalyst_label || stock?.next_event || "Current catalyst";
  return `${catalyst} — stock-specific catalyst · ${timing}`;
}

function capitalDormancyRiskValue(stock) {
  if (!stock?.computed_from_natal) return "NOT ASSESSED";
  const strategic = strategicScoreValue(stock) ?? 0;
  const tactical = tacticalScoreValue(stock) ?? 0;
  const days = mappedWindowDaysValue(stock);
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const pressureAction = ["EXIT STRENGTH", "REDUCE / EXIT", "HEAVY TRIM", "TRIM SATELLITE"].includes(action);

  if (strategic >= 7.5 && tactical <= 6 && days > 365) return "VERY HIGH";
  if (pressureAction && days > 180) return "VERY HIGH";
  if (strategic >= 7.5 && tactical <= 6 && days > 120) return "HIGH";
  if (strategic >= 7.5 && action === "WATCH CLOSELY") return "HIGH";
  if (tactical < 5 && days > 180) return "HIGH";
  if (tactical < 7 || days > 120) return "MODERATE";
  return "LOW";
}

function dormancyRiskText(stock, { full = false } = {}) {
  const risk = capitalDormancyRiskValue(stock);
  if (!full) return risk;
  const best = bestWindowText(stock);
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const explanations = {
    "VERY HIGH": `VERY HIGH — fresh capital may stay inefficient for an extended period. Current posture: ${action}. Reassess around mapped window ${best}.`,
    HIGH: `HIGH — strategic leadership may be intact, but fresh capital may remain inefficient until the mapped expansion window ${best}.`,
    MODERATE: `MODERATE — some waiting or staggered entry risk remains; prefer confirmation around catalyst / pressure absorption.`,
    LOW: `LOW — capital can work sooner if position size and risk discipline are respected.`,
    "NOT ASSESSED": "NOT ASSESSED — natal data is required before dormancy risk can be inferred."
  };
  return explanations[risk] || risk;
}

function dormancyMapText(stock) {
  if (!stock?.computed_from_natal) return "Natal data pending — dormancy cannot be mapped.";
  const risk = capitalDormancyRiskValue(stock);
  const catalyst = stock?.catalyst_label || stock?.next_event || "current catalyst";
  const catalystTiming = readableEventTiming({
    date: stock?.catalyst_date,
    days: stock?.days_to_event ?? stock?.next_ignition,
    phase: stock?.catalyst_readiness || stock?.current_window || "Prepare",
    includeShadow: /eclipse|rahu|ketu|shadow/i.test([stock?.catalyst_label, stock?.environment_signature, stock?.current_window].join(" "))
  });
  const best = bestWindowText(stock);
  if (risk === "LOW") {
    return formatDatesInText(`Now: capital can work with staggered sizing. Near gate: ${catalyst} — ${catalystTiming}; absorb normal churn. Scale-up gate: ${best}; use only if support remains stronger than pressure.`);
  }
  if (risk === "MODERATE") {
    return formatDatesInText(`Now: capital can work only selectively. Near gate: ${catalyst} — ${catalystTiming}; wait for pressure absorption before adding. Review gate: ${best}.`);
  }
  if (risk === "HIGH" || risk === "VERY HIGH") {
    return formatDatesInText(`Now: fresh capital is inefficient. Near gate: ${catalyst} — ${catalystTiming}; use for review/protection, not deployment. Re-entry gate: ${best}.`);
  }
  return "Dormancy not assessed.";
}

function coreFreshSplitText(stock, tacticalDisplay, strategicDisplay, passiveVerdict) {
  const tacticalBucket = normalizeActionLabel(tacticalDisplay || stock?.action || "WATCH CLOSELY");
  const leadership = Number(stock?.leadership_probability ?? stock?.expansion_score ?? 0);
  const tacticalScore = tacticalScoreValue(stock) ?? 0;
  const strategicScore = strategicScoreValue(stock) ?? 0;
  const lowDormancy = capitalDormancyRiskValue(stock) === "LOW";
  const correction = correctionModeValue(stock).toUpperCase();
  const highPressure = /HIGH|BREAK|VERY HIGH|PRICE CORRECTION/.test(`${stock?.current_pressure || ""} ${correction}`);
  let corePosture = "HOLD CORE";
  if (["EXIT STRENGTH", "HEAVY TRIM", "TRIM SATELLITE"].includes(tacticalBucket)) corePosture = tacticalBucket;
  else if (tacticalBucket === "WATCH CLOSELY") corePosture = "WATCH CLOSELY";
  else if (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(tacticalBucket)) {
    corePosture = leadership >= 70 && tacticalScore >= 7 && strategicScore >= 7.5 && lowDormancy && !highPressure ? "HOLD WINNER" : "HOLD CORE";
  }
  const freshCapital = /NO FRESH|AVOID FRESH|BLOCK FRESH|PROTECT \/ OBSERVE|TRIM|HEAVY|EXIT/i.test(String(tacticalDisplay || ""))
    ? "NO FRESH"
    : (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(tacticalBucket) ? tacticalBucket : "WATCH CLOSELY");
  const existing = corePosture === "HOLD WINNER"
    ? "existing/core: hold winner"
    : corePosture === "HOLD CORE"
      ? "existing/core: hold core"
      : `existing/core: ${corePosture.toLowerCase()}`;
  const fresh = freshCapital === "NO FRESH"
    ? "fresh capital: no fresh entry"
    : `fresh capital: ${String(freshCapital || "watch gate").toLowerCase()}`;
  const strategic = `strategic: ${strategicActionCompact(strategicDisplay, stock).toLowerCase()}`;
  const passive = `passive: ${String(passiveVerdict || "not resolved").replace(/_/g, " ").toLowerCase()}`;
  return `Capital split — ${existing}; ${fresh}; ${strategic}; ${passive}.`;
}

function dormancyTone(value) {
  const v = String(value || "").toUpperCase();
  if (v.includes("VERY") || v === "HIGH") return "pressure";
  if (v === "MODERATE") return "moderate";
  if (v === "LOW") return "high";
  return "neutral";
}

function correctionModeValue(stock) {
  if (!stock?.computed_from_natal) return "Not assessed";
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const tactical = tacticalScoreValue(stock) ?? 5;
  const strategic = strategicScoreValue(stock) ?? 5;
  const days = mappedWindowDaysValue(stock);
  const pressure = numericValue(stock?.pressure_score) ?? 50;
  const routed = pressureRoutingState(stock);
  const severity = routed.severity?.key || "low";

  if (["REDUCE / EXIT", "HEAVY TRIM"].includes(action)) return "Price + time correction";
  if (action === "TRIM SATELLITE") {
    if (severity === "low") return "No major correction";
    if (severity === "medium") return "Time correction";
    return days > 180 ? "Mixed correction" : "Price correction";
  }
  if (strategic >= 7.5 && tactical <= 6 && days > 120) return "Time correction / mixed";
  if (action === "WATCH CLOSELY" && pressure >= 58) return "Mixed correction";
  if (action === "WATCH CLOSELY") return "Time correction";
  if (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(action) && pressure >= 55) return "Volatile digestion";
  return "No major correction";
}

function correctionModeText(stock, { full = false } = {}) {
  const mode = correctionModeValue(stock);
  if (!full) return mode;
  const details = {
    "Time correction": "Time correction — price may not fall much, but capital can sit idle while leadership repairs.",
    "Price correction": "Price correction — drawdown risk is more active than simple waiting risk.",
    "Mixed correction": "Mixed correction — both price drawdown and time-delay risk are active.",
    "Price + time correction": "Price + time correction — pressure can produce both drawdown and a long repair/waiting phase.",
    "Time correction / mixed": "Time correction / mixed — leadership may be intact, but fresh capital may wait; some drawdown risk remains if pressure fails to absorb.",
    "Volatile digestion": "Volatile digestion — choppy action and sharp reversals are possible while the catalyst is absorbed.",
    "No major correction": "No major correction — normal volatility is the main expectation.",
    "Not assessed": "Not assessed — natal data is required."
  };
  return details[mode] || mode;
}

function correctionTone(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("price + time") || v.includes("mixed")) return "pressure";
  if (v.includes("price")) return "pressure";
  if (v.includes("volatile")) return "moderate";
  if (v.includes("time")) return "neutral";
  if (v.includes("no major")) return "high";
  return "neutral";
}

function pressurePathTone(stock) {
  const pressure = numericValue(stock?.pressure_score) ?? 50;
  const expansion = numericValue(stock?.expansion_score) ?? 50;
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");

  if (["REDUCE / EXIT", "HEAVY TRIM"].includes(action)) return "break-risk";
  if (pressure >= expansion + 15) return "pressure-first";
  if (expansion >= pressure + 15) return "expansion-first";
  if (pressure >= 60 && expansion >= 60) return "high-energy-conflict";
  return "balanced";
}

function stockPathBaseIso(stock) {
  return todayIsoDate();
}

function pathRecommendationFromAction(action, { catalyst = "mapped catalyst", timing = "", scope = "week" } = {}) {
  const text = String(action || "");
  const anchor = timing ? `${catalyst} — ${timing}` : catalyst;
  if (/BREAK-RISK|HEAVY TRIM|protect capital/i.test(text)) {
    return `Protect capital into ${anchor}; avoid fresh chase until the pressure window has passed.`;
  }
  if (/TRIM SATELLITE/i.test(text)) {
    return `Trim satellite exposure into ${anchor}; keep only disciplined core risk.`;
  }
  if (/PRESSURE FIRST|AVOID|ASTRO GATE PENDING|WATCH ONLY|WATCH CLOSELY/i.test(text)) {
    return `Astro pressure remains the mapped priority around ${anchor}; fresh capital waits for supportive natal timing.`;
  }
  if (/HOLD WINNER|HIGH-VOLTAGE|VERTICAL/i.test(text)) {
    return `Hold the winner through ${anchor}; trim only blow-off excess, not normal volatility.`;
  }
  if (/STAGGER ADD|BUILDING RERATING|RERATING IGNITION/i.test(text)) {
    return `Stagger deployment around ${anchor}; begin before the cleanest peak, avoid vertical chase.`;
  }
  if (/ACCUMULATE|PRIORITY|STRONG FORWARD LEADER|STRONG LEADER/i.test(text)) {
    return `Use ${anchor} as a deployable leadership window; add in tranches, not all at once.`;
  }
  return `${scope === "month" ? "Maintain" : "Keep"} disciplined sizing around ${anchor}; stock-specific astro remains the guide.`;
}

function stockClusterOverlapContext(stock) {
  const clusters = Array.isArray(stock?.active_clusters) ? stock.active_clusters.filter(Boolean) : splitLines(stock?.active_clusters);
  const clusterDensity = numericValue(stock?.cluster_density);
  const overlap = stock?.overlap_intensity || stock?.overlapIntensity;
  const overlapEntries = overlap && typeof overlap === "object"
    ? Object.entries(overlap).filter(([, count]) => Number(count) >= 2).map(([name, count]) => `${name}×${count}`)
    : [];
  const catalyst = stock?.catalyst_label || stock?.next_event || "mapped catalyst";
  const timing = readableEventTiming({
    date: stock?.catalyst_date,
    days: stock?.days_to_event ?? stock?.next_ignition,
    phase: stock?.catalyst_readiness || stock?.current_window || "Prepare",
    includeShadow: /eclipse|rahu|ketu|shadow/i.test([catalyst, stock?.environment_signature, stock?.current_window].join(" "))
  });
  const contacts = compactContactList(stock?.catalyst_contact_text || stock?.top_transits).slice(0, 2).join("; ");
  const type = stock?.structural_cycle || "stock";
  const sev = pressureRoutingState(stock).severity;
  const behaviour =
    sev.key === "high" || sev.key === "break"
      ? "expect pressure-first behaviour: protect excess/capital and use the mapped repair gate confirmation"
      : sev.key === "medium"
        ? "expect churn, delay, and confirmation tests rather than clean vertical expansion"
        : "expect tactical noise; use supporting natal contacts before upgrading";

  const parts = [];
  parts.push(`Cluster window: ${catalyst} — ${timing}`);
  if (contacts && !contacts.includes("No contact text")) parts.push(`Natal contacts: ${contacts}`);
  if (clusters.length) parts.push(`Cluster planets: ${clusters.slice(0, 4).join(" + ")}`);
  if (overlapEntries.length) parts.push(`Repeated activations: ${overlapEntries.slice(0, 4).join(", ")}`);
  if (clusterDensity !== null && clusterDensity >= 3) parts.push(`Density ${Math.round(clusterDensity)} = crowded window`);
  parts.push(`Expected ${type} response: ${behaviour}.`);
  return parts.join(". ");
}


function buildTacticalPathRows(stock) {
  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const capital = v35.language?.capital || {};
    const gate = v35.timingPath?.tacticalGate || v35.timingPath?.nextGate;
    const rows = [["Now", `Existing position: ${capital.existingPosition}. Fresh tactical capital: ${capital.freshTacticalCapital}.`]];
    if (gate) rows.push([formatDateReadable(gate.date), v35GateSummary(gate)]);
    const shared = gate?.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC";
    rows.push(["After tactical gate", gate
      ? shared
        ? "This is a shared re-entry gate. Rerun the tactical and strategic buckets together before reopening either one."
        : "Rerun the tactical buckets only. Do not use this gate to suspend or revoke the strategic decision."
      : "No later tactical gate is mapped; keep the present tactical decision primary."]);
    return rows;
  }
  const tactical = v347TacticalDecision(stock);
  const catalyst = stock?.catalyst_label || stock?.next_event || "mapped catalyst";
  const timing = readableEventTiming({
    date: stock?.catalyst_date,
    days: stock?.days_to_event ?? stock?.next_ignition,
    phase: stock?.catalyst_readiness || stock?.current_window || "Prepare",
    includeShadow: /eclipse|rahu|ketu|shadow/i.test([catalyst, stock?.environment_signature, stock?.current_window].join(" "))
  });
  const baseIso = stockPathBaseIso(stock);
  const m = stock?.computed_from_natal ? v347AstroMetrics(stock) : null;
  const window = m?.windowText || bestWindowText(stock);

  let phrases;
  if (tactical.kind === "break-protect") {
    phrases = [
      `Hard pressure build-up into ${catalyst} — ${timing}. Fresh capital stays out; protect capital first.`,
      `Pressure peak / absorption week around ${catalyst}. Maintain protection posture; no deployment instruction.`,
      `Post-pressure reset scan. Do not rebuild until a separate expansion review is mapped.`,
      `Core test week: only resilient core exposure remains; no fresh capital.`,
      `Repair scan: wait for a constructive astro contact before restoring risk.`,
      `Tactical checkpoint: protection posture relaxes only when break-pressure is no longer mapped.`
    ];
  } else if (tactical.kind === "pressure-watch") {
    phrases = [
      `Pressure window into ${catalyst} — ${timing}. No fresh capital; protect only excess/satellite exposure.`,
      `Pressure absorption week. Hold core only if conviction remains; do not convert pressure into fresh deployment.`,
      `Noise/reversal week: normal core volatility is not an automatic exit.`,
      `Repair watch: wait for the next expansion review before adding.`,
      `Capital discipline week: fresh capital remains blocked; next change requires an explicit expansion review.`,
      `Tactical checkpoint: continue no-fresh posture until a real expansion review appears.`
    ];
  } else if (tactical.kind === "strong-active" || tactical.kind === "active") {
    phrases = [
      `Leadership window active into ${catalyst} — ${timing}. Stagger fresh capital; do not deploy vertically.`,
      `Catalyst absorption week: tolerate normal astro churn while leadership remains the dominant field.`,
      `Post-catalyst noise window: protect only blow-off excess, not normal volatility.`,
      `Leadership continuation check: keep participation part-sized through the pressure window.`,
      `Sizing checkpoint: add only within the active astro posture; avoid late vertical chase.`,
      `Tactical durability checkpoint: continue while dormancy stays low and no break-risk pressure appears.`
    ];
  } else if (tactical.kind === "future-review" || tactical.kind === "watch") {
    phrases = [
      `Watch posture into ${catalyst} — ${timing}. Fresh capital is not asked to work meaningfully now.`,
      `Capital discipline week: maintain watch/no-fresh posture through the current pressure or churn.`,
      `Review preparation: next useful capital review is ${window}.`,
      `Dormancy control: avoid early deployment before the review date.`,
      `Selective observation: capital waits for the astro field to become deployable.`,
      `Tactical checkpoint: reassess at the next review; no deployment signal is active today.`
    ];
  } else {
    phrases = [
      `Hold-through week into ${catalyst} — ${timing}. Normal astro churn is not an exit signal.`,
      `Maintain disciplined sizing; no aggressive fresh capital.`,
      `Observe pressure and dormancy without forcing a trade.`,
      `Keep capital selective until a clearer expansion or protection review appears.`,
      `No-change week: current posture remains selective.`,
      `Tactical checkpoint: review the next mapped astro date before changing capital.`
    ];
  }

  return phrases.map((text, index) => [weekRangeLabel(index, baseIso), formatDatesInText(text)]);
}

function buildStrategicPathRows(stock) {
  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const capital = v35.language?.capital || {};
    const gate = v35.timingPath?.strategicGate || null;
    const tacticalGate = v35.timingPath?.tacticalGate || v35.timingPath?.nextGate || null;
    const fullBuild = v35.capitalDecision?.strategicCapital === "FULL_BUILD";
    const rows = [["Now", `Strategic capital: ${capital.strategicCapital}. Passive long-term: ${capital.passiveLongTermCapital}. ${v35.language?.strategicNote || ""}`]];
    if (tacticalGate && fullBuild) rows.push([`Tactical context · ${formatDateReadable(tacticalGate.date)}`, `${v35GateRoleLabel(tacticalGate.role)} affects tactical capital only. Continue FULL BUILD through this tactical-only window; it is not a strategic reassessment date.`]);
    if (gate) rows.push([formatDateReadable(gate.date), v35GateSummary(gate)]);
    const shared = gate?.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC";
    rows.push(["Strategic continuity", gate
      ? shared
        ? "Rerun the tactical and strategic buckets together at this shared re-entry gate."
        : "Rerun the strategic bucket at this strategic gate. Tactical gates before it do not change strategic capital."
      : fullBuild
        ? "FULL BUILD remains active. Only a mapped strategic protection/break gate can change it."
        : "No later strategic decision gate is mapped; keep the present strategic decision primary."]);
    return rows;
  }
  const strategic = v347StrategicDecision(stock);
  const tactical = v347TacticalDecision(stock);
  const baseIso = stockPathBaseIso(stock);
  const pressure = pressureWindowText(stock);
  const window = bestWindowText(stock);
  const forward = parseForwardLeadership(stock);
  const dormancy = capitalDormancyRiskValue(stock);
  const reviewDays = daysUntilDate(rawBestWindowSource(stock));
  const reviewMonthIndex = reviewDays === null ? null : Math.max(0, Math.min(8, Math.floor(reviewDays / 30)));

  let phrases;
  if (strategic.label === "FULL BUILD") {
    phrases = [
      `FULL BUILD active: strategic capital remains approved; add in parts and hold through normal astro pressure.`,
      `Continuation: maintain strategic build; a separate Break-Risk Review will be shown only if protection becomes actionable.`,
      `Durability check: forward leadership ${forward ?? "mapped"}/100 remains the guide.`,
      `Normal-pressure tolerance: ordinary churn is not a passive exit signal.`,
      `Scale discipline: add only in parts; avoid vertical chase.`,
      `Strategic checkpoint: keep FULL BUILD while dormancy is ${String(dormancy).toLowerCase()}.`,
      `Long-cycle background: supportive context remains, but it does not create a new action by itself.`,
      `Upgrade status: FULL BUILD is already the active strategic instruction.`,
      `Strategic checkpoint: continue to watch pressure, dormancy, and leadership durability.`
    ];
  } else if (strategic.label === "PART BUILD") {
    phrases = [
      `PART BUILD active now: limited strategic capital is allowed in the current card.`,
      `Capital ceiling: keep it part-sized; this is not passive/full-size approval.`,
      `Durability check: forward leadership ${forward ?? "mapped"}/100 supports the part-build posture.`,
      `Pressure handling: carry normal astro pressure; protect only blow-off excess, not core conviction.`,
      `Sizing discipline: stagger and avoid vertical chase; no all-in instruction.`,
      `Strategic ceiling: PART BUILD remains the ceiling while dormancy is ${String(dormancy).toLowerCase()}.`,
      `Long-cycle background: constructive context remains, but it does not create a new action by itself.`,
      `Full-build status: no passive/full-size approval is mapped in this card.`,
      `Strategic checkpoint: keep PART BUILD unless a later card explicitly changes the strategic action.`
    ];
  } else if (strategic.label === "CORE HOLD") {
    phrases = [
      `CORE HOLD active: existing strategic/core capital can remain; no fresh strategic build during pressure.`,
      `Pressure management: ${pressure}. Protect only excess/satellite exposure, not confirmed core.`,
      `Repair watch: keep fresh strategic capital out until a separate re-entry review is shown.`,
      `Core discipline: do not convert tactical pressure into a forced long-term exit.`,
      `Fresh-build block: no new strategic build while pressure dominates the current card.`,
      `Durability floor: replay learning supports core holding through pressure.`,
      `Long-cycle background: compounder potential remains background, not a fresh buy signal today.`,
      `Upgrade status: no fresh full-build approval is mapped in this card.`,
      `Strategic checkpoint: keep CORE HOLD unless a later card explicitly changes the strategic action.`
    ];
  } else if (strategic.label === "WAIT") {
    phrases = Array.from({ length: 9 }, (_, index) => {
      if (reviewMonthIndex === null) {
        return index === 0
          ? `WAIT active: no fresh strategic capital now; no dated re-entry review is mapped.`
          : `Strategic discipline: remain WAIT until the app maps a dated expansion/re-entry review.`;
      }
      if (index < reviewMonthIndex - 1) {
        return `WAIT active: no fresh strategic capital now; re-entry review remains ${window}.`;
      }
      if (index === reviewMonthIndex - 1) {
        return `Pre-review month: prepare for ${window}; do not pre-empt the dated review.`;
      }
      if (index === reviewMonthIndex) {
        return `Re-entry review month: ${window}. This is the month to rerun the card for a fresh capital decision; this card does not approve deployment before that date.`;
      }
      return `Post-review period: rerun the card after ${window}; today's WAIT instruction should not be projected beyond that review gate.`;
    });
  } else if (strategic.label === "PROTECT" || strategic.label === "AVOID") {
    phrases = [
      `Protection month: ${pressure}. Avoid fresh strategic capital; reduce only excess/satellite exposure if held.`,
      `Pressure management month: do not rebuild strategic exposure during the pressure field.`,
      `Repair watch: next review is ${window}; use it as reassessment, not automatic deployment.`,
      `Capital protection month: keep strategic risk low.`,
      `No-fresh month: pressure/dormancy still controls the strategic map.`,
      `Strategic checkpoint: wait for pressure to clear before considering fresh strategic capital.`,
      `Long-cycle background: future potential does not override current protection.`,
      `Strategic discipline: protection comes before hope.`,
      `Strategic review month: upgrade only when the astro map gives a real expansion review.`
    ];
  } else {
    phrases = [
      `Strategic watch month: larger capital remains selective.`,
      `Maintain watch posture; no passive approval yet.`,
      `Review leadership durability and dormancy.`,
      `Keep capital limited until the astro field clarifies.`,
      `No-change month: strategic capital remains selective.`,
      `Reassess at the next review window.`,
      `Long-cycle context: ${window}.`,
      `Long-cycle context only.`,
      `Strategic review month: wait for a clearer build/protect instruction.`
    ];
  }

  return phrases.map((text, index) => [monthLabel(index, baseIso), formatDatesInText(text)]);
}


function PathTable({ title, subtitle, rows }) {
  return (
    <div style={pathPanelStyle}>
      <div style={miniLabelStyle}>{title}</div>
      <div style={smallMutedStyle}>{subtitle}</div>
      <ReadableInfoTable rows={rows} />
    </div>
  );
}

function coreFreshCapitalGuidance(stock) {
  if (!stock?.computed_from_natal) return "Add natal data before core/fresh-capital guidance.";
  if (stock?.decision_v35) {
    const c = stock.decision_v35.language?.capital || {};
    return `Existing position: ${c.existingPosition}. Fresh tactical capital: ${c.freshTacticalCapital}. Strategic capital: ${c.strategicCapital}. Passive long-term: ${c.passiveLongTermCapital}.`;
  }
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const dormancy = capitalDormancyRiskValue(stock);
  const best = bestWindowText(stock);

  if (["EXIT STRENGTH", "REDUCE / EXIT", "HEAVY TRIM", "TRIM SATELLITE"].includes(action)) {
    return `Core: hold only if conviction is high; satellite: reduce into strength; fresh entry: wait. Astro reassessment near ${best}.`;
  }

  if (dormancy === "HIGH" || dormancy === "VERY HIGH") {
    return `Core: keep intact if strategic conviction remains; fresh entry: use mapped window ${best}; small tactical trim only into strength.`;
  }

  if (action === "WATCH CLOSELY") {
    return `Core: hold; fresh entry: use the catalyst-absorption gate in the natal chart; avoid chasing before pressure absorption.`;
  }

  if (action === "HOLD CORE") {
    return `Core: hold through normal volatility; fresh entry only after cleaner astro catalyst absorption.`;
  }

  if (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(action)) {
    return `Core: hold/add; fresh entry: use staggered deployment around pressure absorption and catalyst confirmation.`;
  }

  return "Keep core/fresh capital decisions tied to the action bucket and mapped window.";
}

function dormancyRationale(stock) {
  return `${dormancyRiskText(stock, { full: true })} Correction mode: ${correctionModeText(stock, { full: true })}`;
}

function ScoreLegend() {
  const rows = [
    ["1–2 /10", "Avoid / dead-money risk"],
    ["3–4 /10", "Weak setup; only watch"],
    ["5 /10", "Neutral / tactical only"],
    ["6 /10", "Usable but not priority"],
    ["7 /10", "Good strategic candidate"],
    ["8 /10", "Strong leadership candidate"],
    ["9 /10", "Rare high-conviction rerating"],
    ["10 /10", "Exceptional alignment"]
  ];

  return (
    <div style={scoreLegendWrapStyle}>
      {rows.map(([score, meaning]) => (
        <div key={score} style={scoreLegendRowStyle}>
          <strong>{score}</strong>
          <span>{meaning}</span>
        </div>
      ))}
    </div>
  );
}

function currentSignalText(stock) {
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  if (action === "ACCUMULATE") return "strong window active";
  if (action === "STAGGER ADD") return "early window forming";
  if (action === "HOLD CORE") return "hold core; avoid fresh chase until pressure absorption is explicitly shown";
  if (action === "TRIM SATELLITE") return "protect excess";
  if (action === "HEAVY TRIM" || action === "EXIT STRENGTH" || action === "REDUCE / EXIT") return "protect capital";
  return "use the next mapped astro gate";
}

function textHasAny(value, needles = []) {
  const text = String(value || "").toLowerCase();
  return needles.some(needle => text.includes(String(needle).toLowerCase()));
}

function stockPressureExpansionState(stock) {
  const pressure = numericValue(stock?.pressure_score) ?? numericValue(stock?.pressureScore) ?? 50;
  const expansion = numericValue(stock?.expansion_score) ?? numericValue(stock?.expansionScore) ?? 50;
  const leadership = numericValue(stock?.leadership_probability) ?? 50;
  const forwardLeadership = parseForwardLeadership(stock);
  return { pressure, expansion, leadership, forwardLeadership };
}

function isActiveStockExpansion(stock) {
  const { pressure, expansion, leadership } = stockPressureExpansionState(stock);
  const readiness = String(stock?.catalyst_readiness || stock?.current_window || "").toLowerCase();
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  return (
    expansion >= 68 ||
    leadership >= 66 ||
    ["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION", "HOLD WINNER"].includes(action) ||
    ((readiness.includes("active") || readiness.includes("near") || readiness.includes("prepare")) && expansion >= pressure - 8)
  );
}

function pressureRoutingState(stock) {
  const state = stockPressureExpansionState(stock);
  const severity = pressureSeverityFromState(state, stock);
  const mediumHighWatch = severity.key === "medium" && state.pressure >= 68 && state.pressure > state.expansion + 8;
  const strategicEligible = severity.key === "high" || severity.key === "break" || mediumHighWatch;
  const tacticalOnly = severity.key === "low" || (severity.key === "medium" && !mediumHighWatch);
  return { ...state, severity, strategicEligible, tacticalOnly, mediumHighWatch };
}

function hardPressureActive(stock) {
  const routed = pressureRoutingState(stock);
  const { pressure, expansion, severity } = routed;
  const text = [
    stock?.current_pressure,
    stock?.expected_behaviour,
    stock?.catalyst_response,
    stock?.environment_signature,
    stock?.top_transits,
    stock?.catalyst_contact_text
  ].join(" ");
  const hardText = textHasAny(text, ["break-risk", "break risk", "hard eclipse", "eclipse square", "eclipse opposition", "reset risk", "heavy pressure", "capital protection"]);

  // v30.04A: pressure routing must respect severity. A raw TRIM label or a LOW/MEDIUM
  // pressure event is not enough to create strategic pressure-first behaviour.
  if (severity.key === "break" || severity.key === "high") return true;
  if (hardText && pressure >= 70 && pressure > expansion) return true;
  return false;
}

function stockWindowDateText(value) {
  const iso = extractFirstIsoDate(value);
  return iso ? formatDateReadable(iso) : formatDatesInText(value || "mapped window");
}

function cleanProductionVerdict(value, fallback = "WATCH") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/PASSIVE LONG-TERM NOT RESOLVED/i, "NOT RESOLVED")
    .trim();
}

function researchStateTitle(stock) {
  const state = cleanProductionVerdict(stock?.production_current_state || "Research synthesis active")
    .replace(/^Current state:\s*/i, "")
    .replace(/\s+—\s+(UP|UP-BIASED|SIDEWAYS \/ UNRESOLVED|DOWN \/ PRESSURE-LED|HIGH \/ RESET RISK|LOW|MEDIUM \/ DIGESTION).*$/i, "");
  const correction = String(correctionModeValue(stock) || "").toUpperCase();
  const sev = pressureRoutingState(stock).severity?.key || "low";
  const breakEvidence = /BREAK|PRICE CORRECTION|MIXED CORRECTION|HIGH|VERY HIGH/.test(correction) || sev === "high" || sev === "break";
  if (!breakEvidence && /EXPANSION THEN BREAK|MAJOR RESET RISK/i.test(state)) {
    return "ACTIVE EXPANSION WITH FUTURE PROTECTION GATE";
  }
  return state;
}

function researchCapitalIntent(stock) {
  const state = cleanProductionVerdict(stock?.production_current_state || "");
  const tactical = cleanProductionVerdict(stock?.production_tactical_action || stock?.action || "");
  const strategic = cleanProductionVerdict(stock?.production_strategic_action || "");
  const passive = cleanProductionVerdict(stock?.production_passive_verdict || "");
  const joined = `${state} ${tactical} ${strategic} ${passive} ${stock?.correction_mode || ""}`;
  const tacticalScore = tacticalScoreValue(stock) ?? Number(stock?.tactical_score ?? 0);
  const leadership = Number(stock?.leadership_probability ?? stock?.tactical_leadership ?? 0);
  const pressure = Number(stock?.pressure_score ?? stock?.current_pressure_score ?? 0);
  const expansion = Number(stock?.expansion_score ?? stock?.current_expansion_score ?? 0);

  const defensive = /EXIT|AVOID|PROTECT \/ OBSERVE|BLOCK FRESH|PRESSURE EXPRESSION|PRICE CORRECTION|DOWN \/ PRESSURE-LED/i.test(joined)
    || (pressure >= 65 && pressure >= expansion + 8)
    || (tacticalScore > 0 && tacticalScore < 5 && leadership < 50);
  const strategicBlocked = /TACTICAL ONLY|NO FRESH STRATEGIC|AVOID FRESH STRATEGIC|NOT PASSIVE|PASSIVE LONG-TERM NO/i.test(joined);
  const conditional = /CONDITIONAL|ACTIVE MANAGEMENT|PROTECTION DATE REQUIRED/i.test(joined);
  const constructive = /ENTER \/ ADD NOW|HOLD \/ PART-SIZED ENTRY|STAGGER ADD|ACCUMULATE|ACTIVE EXPANSION/i.test(joined) && !defensive;

  if (defensive) return "DEFENSIVE";
  if (strategicBlocked && constructive) return "TACTICAL_ONLY";
  if (conditional) return "CONDITIONAL";
  if (constructive) return "CONSTRUCTIVE";
  return "SELECTIVE";
}
function defensiveActionSeverity(stock) {
  const tacticalScore = tacticalScoreValue(stock) ?? Number(stock?.tactical_score ?? 0);
  const leadership = Number(stock?.leadership_probability ?? stock?.tactical_leadership ?? 0);
  const pressure = Number(stock?.pressure_score ?? stock?.current_pressure_score ?? 0);
  const correction = String(correctionModeValue(stock) || stock?.correction_mode || "").toUpperCase();
  const state = cleanProductionVerdict(stock?.production_current_state || stock?.signal || stock?.action || "").toUpperCase();
  const breakLike = /BREAK|SEVERE|STRUCTURAL RESET/.test(`${correction} ${state}`);
  const priceCorrection = /PRICE CORRECTION/.test(correction);

  // EXIT STRENGTH is rare: it means existing exposure should be reduced aggressively into strength.
  if ((breakLike || pressure >= 88) && tacticalScore > 0 && tacticalScore <= 3.2 && leadership < 35) return "EXIT STRENGTH";
  if ((breakLike || pressure >= 78) && tacticalScore > 0 && tacticalScore < 4.2 && leadership < 45) return "HEAVY TRIM";
  if ((priceCorrection || pressure >= 68) && tacticalScore > 0 && tacticalScore < 5.0 && leadership < 50) return "TRIM SATELLITE";
  return "NO FRESH";
}

function defensiveCapitalPhrase(stock) {
  const severity = defensiveActionSeverity(stock);
  if (severity === "EXIT STRENGTH") return "exit-strength protection: use strength to reduce aggressively; no fresh entry";
  if (severity === "HEAVY TRIM") return "heavy-trim protection: reduce meaningfully; no fresh entry until pressure clears";
  if (severity === "TRIM SATELLITE") return "trim satellite/excess exposure; hold only pre-defined core; no fresh entry";
  return "hold existing core; do not add fresh capital until the mapped astro gate clears";
}


function futureGatePhrase(stock, date, opts = {}) {
  if (!date) return "";
  const when = formatDateReadable(date);
  const intent = researchCapitalIntent(stock);
  if (opts.kind === "protection") {
    if (intent === "DEFENSIVE") return `Defensive review near ${when}: check pressure clearance before any re-entry.`;
    return `Protection review near ${when}: protect excess exposure; no fresh capital.`;
  }
  if (intent === "DEFENSIVE") return `Future recovery/re-entry gate near ${when}: reassess after pressure phase clearance.`;
  if (intent === "TACTICAL_ONLY") return `Next tactical acceleration gate near ${when}: use staggered sizing; not passive approval.`;
  if (intent === "CONDITIONAL") return `Conditional build gate near ${when}: reassess build status at this future astro window.`;
  if (intent === "CONSTRUCTIVE") return `Upside acceleration gate near ${when}: deploy only through staggered sizing, not vertical chase.`;
  return `Astro decision gate near ${when}: reassess from the mapped transit shift, not from price confirmation.`;
}

function researchMainLabel(stock) {
  const stateTitle = researchStateTitle(stock);
  const protection = stock?.production_protection_date ? ` ${futureGatePhrase(stock, stock.production_protection_date, { kind: "protection" })}` : "";
  const intent = researchCapitalIntent(stock);

  if (intent === "DEFENSIVE") {
    return `${stateTitle} — defensive now: ${defensiveCapitalPhrase(stock)}.${protection}`;
  }

  if (intent === "TACTICAL_ONLY") {
    return `${stateTitle} — tactical participation allowed; do not convert this into passive long-term capital.${protection}`;
  }

  if (intent === "CONDITIONAL") {
    return `${stateTitle} — conditional build only; capital action depends on the next mapped astro gate.${protection}`;
  }

  if (intent === "CONSTRUCTIVE") {
    return `${stateTitle} — constructive tactical window; stagger entries and protect only excess.${protection}`;
  }

  return `${stateTitle} — selective setup; capital waits for the next mapped astro gate.${protection}`;
}

function tacticalDisplayFromResearch(value, stock = null) {
  const raw = cleanProductionVerdict(value || "WATCH CLOSELY");
  const intent = stock ? researchCapitalIntent(stock) : "SELECTIVE";
  if (intent === "DEFENSIVE") {
    const severity = defensiveActionSeverity(stock);
    if (severity === "EXIT STRENGTH") return "EXIT STRENGTH — use strength to reduce aggressively; no fresh entry.";
    if (severity === "HEAVY TRIM") return "HEAVY TRIM — reduce meaningfully; no fresh entry until pressure clears.";
    if (severity === "TRIM SATELLITE") return "TRIM SATELLITE — reduce excess/satellite exposure; no fresh entry.";
    return "HOLD CORE / NO FRESH — existing core may be held; do not add fresh capital.";
  }
  if (/ENTER \/ ADD NOW/i.test(raw)) return "STAGGER ADD — active tactical window; deploy in parts, not vertically.";
  if (/HOLD \/ PART-SIZED ENTRY/i.test(raw)) return "STAGGER ADD — part-sized entry; keep sizing disciplined.";
  return raw
    .replace(/WATCH CLOSELY —/i, "ASTRO GATE PENDING —")
    .replace(/WATCHLIST ONLY —/i, "NATAL/ASTRO DATA GATE —")
    .replace(/WATCH \/ PROTECT/i, "PROTECT / WAIT FOR PRESSURE CLEARANCE");
}

function strategicDisplayFromResearch(stock) {
  const raw = cleanProductionVerdict(stock?.production_strategic_action || "STRATEGIC WATCH");
  const protection = stock?.production_protection_date ? ` ${futureGatePhrase(stock, stock.production_protection_date, { kind: "protection" })}` : "";
  const accel = stock?.production_acceleration_date ? ` ${futureGatePhrase(stock, stock.production_acceleration_date, { kind: "acceleration" })}` : "";
  const intent = researchCapitalIntent(stock);
  let base = raw
    .replace(/TACTICAL ONLY — NO FRESH STRATEGIC CAPITAL/i, "TACTICAL ONLY — no fresh strategic capital")
    .replace(/CONDITIONAL — PROTECTION DATE REQUIRED/i, "CONDITIONAL — protection date required")
    .replace(/ACTIVE EXPANSION WITH MAJOR RESET RISK/i, "ACTIVE EXPANSION — manage/reset risk")
    .replace(/EXPANSION THEN BREAK \/ POST-BREAK REPAIR/i, "EXPANSION FIRST — then repair/reset phase")
    .replace(/STRATEGIC WATCH/i, "STRATEGIC ASTRO GATE PENDING");

  if (intent === "DEFENSIVE" && !/AVOID|TACTICAL ONLY|NO FRESH/i.test(base)) base = "AVOID FRESH STRATEGIC CAPITAL";
  if (intent === "TACTICAL_ONLY" && /Strong leadership candidate/i.test(base)) base = "FORWARD LEADERSHIP VISIBLE — strategic capital still blocked until reset risk clears";
  return `${base}.${protection}${accel}`.replace(/\.\./g, ".").trim();
}

function strategicActionCompact(value, stock = null) {
  if (stock?.decision_v35) {
    return String(stock.decision_v35.capitalDecision?.strategicCapital || "WAIT").replaceAll("_", " ");
  }
  const text = String(value || "").toUpperCase();
  const intent = stock ? researchCapitalIntent(stock) : "";
  if (/WATCHLIST|ADD NATAL|NATAL DATA/.test(text)) return "NATAL PENDING";
  if (/EXIT|HEAVY TRIM|CAPITAL PROTECTION|PRESSURE FIRST|AVOID FRESH/.test(text) || intent === "DEFENSIVE") return "AVOID FRESH";
  if (/TACTICAL ONLY|NO FRESH STRATEGIC|NOT PASSIVE/.test(text) || intent === "TACTICAL_ONLY") return "TACTICAL ONLY";
  if (/CONDITIONAL BUILD/.test(text)) return "CONDITIONAL BUILD";
  if (/CONDITIONAL|ACTIVE MANAGEMENT|PROTECTION DATE REQUIRED/.test(text) || intent === "CONDITIONAL") return "CONDITIONAL";
  if (/PRIORITY LEADER|STRONG FORWARD LEADER|FORWARD LEADERSHIP|LEADER/.test(text)) return "LEADER";
  if (/DEFERRED/.test(text)) return "DEFERRED";
  if (/WATCH|GATE|WAIT/.test(text)) return "WATCH GATE";
  return shortText(String(value || "WATCH GATE").split(/[.—]/)[0].trim(), 28);
}

function finalStockDecision(stock) {
  if (!stock?.computed_from_natal) {
    return {
      mainLabel: "ADD NATAL DATA — stock-specific reading pending",
      tacticalAction: "WATCHLIST ONLY — natal data required before tactical action.",
      strategicAction: "WATCHLIST ONLY — add natal data before strategic ranking.",
      capitalPosture: "Do not rank as a stock-specific candidate until natal data is available.",
      dormancyText: "UNSCORABLE — natal data pending.",
      correctionText: "Not assessed.",
      primaryBucket: "NATAL_PENDING"
    };
  }

  if (stock?.production_source === "v35.0-holistic-astro-to-capital" && stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const language = v35.language || {};
    const capital = language.capital || {};
    const behaviour = String(v35.behaviour?.state || "").replaceAll("_", " ");
    const pressureType = String(v35.astroTruth?.pressureType || "").replaceAll("_", " ");
    const bucket = v35.capitalDecision?.strategicCapital || "WAIT";
    return {
      mainLabel: language.singleStory || `${behaviour} — ${pressureType}`,
      tacticalAction: `EXISTING POSITION: ${capital.existingPosition || "HOLD / REVIEW"}. FRESH TACTICAL CAPITAL: ${capital.freshTacticalCapital || "NO FRESH"}.`,
      strategicAction: `STRATEGIC CAPITAL: ${capital.strategicCapital || "WAIT"}. ${language.strategicNote || ""} PASSIVE LONG-TERM: ${capital.passiveLongTermCapital || "NOT APPROVED"}.`,
      capitalPosture: `Existing position: ${capital.existingPosition || "HOLD / REVIEW"}. Fresh tactical capital: ${capital.freshTacticalCapital || "NO FRESH"}. Strategic capital: ${capital.strategicCapital || "WAIT"}. Passive long-term capital: ${capital.passiveLongTermCapital || "NOT APPROVED"}.`,
      dormancyText: v35.behaviour?.capitalEfficiency === "LOW"
        ? "DORMANT CAPITAL — current astrology indicates low capital efficiency."
        : `${v35.behaviour?.capitalEfficiency || "SELECTIVE"} — no independent dormancy override applied.`,
      correctionText: `${v35.astroTruth?.correctionMode || "NORMAL"} — ${v35.astroTruth?.breakState?.mapped ? "break/reset risk mapped" : "no break-risk mapped"}.`,
      timingPath: language.timingPath || "No later decision gate mapped.",
      primaryBucket: bucket === "FULL_BUILD" ? "FULL_BUILD" : bucket === "PART_BUILD" ? "PART_BUILD" : "WAIT",
      conflictType: "v35-holistic-pipeline",
      decisionTrace: v35.decisionTrace || []
    };
  }

  if (stock?.production_source === "v33.1-research-promoted" && stock?.production_current_state) {
    const tacticalRaw = cleanProductionVerdict(stock.production_tactical_action || "WATCH CLOSELY");
    const tacticalDisplay = tacticalDisplayFromResearch(tacticalRaw, stock);
    const passiveVerdict = cleanProductionVerdict(stock.production_passive_verdict || "PASSIVE LONG-TERM NOT RESOLVED");
    const dormancy = stock.production_dormancy_type || capitalDormancyRiskValue(stock);
    return {
      mainLabel: formatDatesInText(researchMainLabel(stock)),
      tacticalAction: formatDatesInText(tacticalDisplay),
      strategicAction: formatDatesInText(strategicDisplayFromResearch(stock)),
      capitalPosture: formatDatesInText(coreFreshSplitText(stock, tacticalDisplay, cleanProductionVerdict(stock.production_strategic_action || "astro gate pending"), passiveVerdict)),
      dormancyText: dormancy === "NO CURRENT DORMANCY"
        ? `LOW / ACTIVE WINDOW — ${stock.production_dormancy_reason || "usable current support is present; do not defer capital only because a later window looks cleaner."}`
        : dormancyRiskText(stock, { full: true }),
      correctionText: correctionModeText(stock, { full: true }),
      primaryBucket: researchCapitalIntent(stock) === "DEFENSIVE"
        ? "PRESSURE"
        : researchCapitalIntent(stock) === "TACTICAL_ONLY"
          ? "TACTICAL_MANAGED"
          : researchCapitalIntent(stock) === "CONDITIONAL"
            ? "CONDITIONAL"
            : researchCapitalIntent(stock) === "CONSTRUCTIVE"
              ? "TACTICAL"
              : "RESEARCH_PROMOTED",
      conflictType: "research-promoted"
    };
  }

  const { pressure, expansion, leadership, forwardLeadership } = stockPressureExpansionState(stock);
  const tacticalScoreNum = tacticalScoreValue(stock) ?? 5;
  const strategicScoreNum = strategicScoreValue(stock) ?? 5;
  const baseAction = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const best = bestWindowText(stock);
  const pressureWindow = pressureWindowText(stock);
  const bestWhen = stockWindowDateText(best);
  const pressureWhen = stockWindowDateText(pressureWindow);
  const activeExpansion = isActiveStockExpansion(stock);
  const routedPressure = pressureRoutingState(stock);
  const pressureSeverity = routedPressure.severity;
  const hardPressure = hardPressureActive(stock);
  const strategicPressureActive = hardPressure && routedPressure.strategicEligible;
  const tacticalPressureOnly = routedPressure.tacticalOnly && !routedPressure.mediumHighWatch;
  const volatileConflict = expansion >= 70 && pressure >= 55 && pressure < 82 && !strategicPressureActive;
  const strongForward = strategicScoreNum >= 7.8 || (forwardLeadership !== null && forwardLeadership >= 78);
  const weakNow = tacticalScoreNum < 5.4 && !activeExpansion;
  const dormant = capitalDormancyRiskValue(stock);

  let tacticalAction = tacticalActionText(stock);
  let strategicAction = strategicActionText(stock);
  let mainLabel = `${baseAction} — ${currentSignalText(stock)}`;
  let capitalPosture = coreFreshCapitalGuidance(stock);
  let primaryBucket = "GENERAL";

  if (strategicPressureActive) {
    const severity = pressureSeverity;
    if (severity.key === "break") {
      mainLabel = `BREAK PRESSURE — protect capital near ${pressureWhen}`;
      tacticalAction = `HEAVY TRIM — capital-protection pressure is active near ${pressureWhen}.`;
      strategicAction = `PRESSURE FIRST — reassess only after reset pressure clears near ${pressureWhen}.`;
      capitalPosture = `Core: protect capital; fresh capital waits until break pressure clears.`;
    } else if (leadership >= 65 && tacticalScoreNum >= 6.2 && strategicScoreNum >= 6.2) {
      mainLabel = `HIGH PRESSURE / LEADERSHIP TEST — protect excess near ${pressureWhen}`;
      tacticalAction = `TRIM SATELLITE — protect excess before ${pressureWhen}.`;
      strategicAction = `HOLD CORE / PROTECT EXCESS — pressure is strategic, but leadership is not broken yet.`;
      capitalPosture = `Core: hold selectively and protect excess; fresh capital waits for pressure absorption.`;
    } else {
      mainLabel = `HIGH PRESSURE WINDOW — trim heat near ${pressureWhen}`;
      tacticalAction = `TRIM SATELLITE — protect excess before ${pressureWhen}.`;
      strategicAction = `PRESSURE FIRST — reassess after ${pressureWhen}.`;
      capitalPosture = `Core: protect gains; fresh capital waits until pressure after ${pressureWhen} is absorbed.`;
    }
    primaryBucket = "PRESSURE";
  } else if (expansion >= 84 && volatileConflict) {
    mainLabel = `HIGH-VOLTAGE LEADER — hold core, trim only blow-off spikes`;
    tacticalAction = `HOLD WINNER — ride the active expansion; protect only vertical excess near ${pressureWhen}.`;
    strategicAction = strongForward ? `HIGH-VOLTAGE LEADER — hold core, trim only blow-off spikes.` : `VOLATILE RERATING — participate carefully; protect rallies.`;
    capitalPosture = `Core: hold through churn; fresh capital only in staggered parts, not after vertical spikes.`;
    primaryBucket = "TACTICAL";
  } else if (activeExpansion && expansion >= pressure - 8) {
    const deployableNow = tacticalScoreNum >= 7.0 && leadership >= 65;
    const earlyButUnclean = tacticalScoreNum >= 6.2 && leadership >= 60;
    if (deployableNow) {
      mainLabel = `BUILDING RERATING — stagger entry; tactical window is active, protect only excess around ${pressureWhen}`;
      tacticalAction = `STAGGER ADD — active window forming; deploy gradually, not vertically.`;
      strategicAction = strongForward ? `STRONG FORWARD LEADER — mapped window ${best}.` : `RALLY WITH CHURN — participate through normal/medium pressure; protect excess only.`;
      capitalPosture = `Core: hold/add through current expansion; fresh capital should be staggered. Do not defer only because a later window looks cleaner.`;
      primaryBucket = "TACTICAL";
    } else if (earlyButUnclean) {
      mainLabel = `EARLY WINDOW / CONFIRMATION NEEDED — stagger only after the natal contact turns supportive`;
      tacticalAction = `STAGGER CAREFULLY — early window visible, but leadership is not yet winner-grade (${Math.round(leadership)}/100).`;
      strategicAction = strongForward ? `SELECTIVE FORWARD LEADER — mapped window ${best}; use mapped astro confirmation before sizing up.` : `RALLY WITH CHURN — usable but not priority; protect excess only.`;
      capitalPosture = `Core: hold selectively; fresh capital only in small tranches after supportive natal contact.`;
      primaryBucket = "GENERAL";
    } else {
      mainLabel = `REPAIR GATE — accumulation may be opening, but leadership is not astrologically confirmed`;
      tacticalAction = `WATCH CLOSELY — use the catalyst-absorption gate in the natal chart (${tacticalScoreNum.toFixed(1)}/10; leadership ${Math.round(leadership)}/100).`;
      strategicAction = strategicScoreNum >= 6.5 ? `RALLY WITH CHURN — potential exists, but upgrade to rerating only when supportive natal contacts are mapped.` : `NATAL SUPPORT GATE PENDING — not a strategic leader yet.`;
      capitalPosture = `Core: hold only if already positioned; fresh capital waits for confirmation.`;
      primaryBucket = "GENERAL";
    }
  } else if (pressure >= 70 && pressure > expansion + 8) {
    mainLabel = `PRESSURE FIRST — capital stays out until repair gate near ${bestWhen}`;
    tacticalAction = `PRESSURE GATE ACTIVE — pressure dominates until repair or catalyst confirmation.`;
    strategicAction = strongForward ? `DEFERRED LEADER — use mapped window ${best}.` : `PRESSURE FIRST — reassess near ${best}.`;
    capitalPosture = `Core: hold only if conviction remains; fresh capital waits for pressure absorption.`;
    primaryBucket = "DORMANT";
  } else if (strongForward && weakNow) {
    mainLabel = `DEFERRED LEADER — use mapped window ${bestWhen}`;
    tacticalAction = `ASTRO GATE PENDING — no clean tactical edge yet; use the catalyst-activation gate.`;
    strategicAction = `STRONG FORWARD LEADER — mapped window ${best}.`;
    capitalPosture = `Core: monitor; fresh capital waits for the mapped forward window.`;
    primaryBucket = "DORMANT";
  } else if (strongForward) {
    mainLabel = `STRONG FORWARD LEADER — add on pressure, not chase`;
    tacticalAction = baseAction === "WATCH CLOSELY" ? `HOLD CORE — use pressure absorption before adding.` : tacticalAction;
    strategicAction = `STRONG FORWARD LEADER — mapped window ${best}.`;
    capitalPosture = `Core: hold; fresh capital can be staggered near pressure absorption or mapped window.`;
    primaryBucket = "STRATEGIC";
  }

  // Final score/action sanity checks.
  if (/STAGGER ADD|ACCUMULATE|LEADER|RERATING/i.test(tacticalAction) && tacticalScoreNum < 5.4 && !activeExpansion) {
    tacticalAction = `ASTRO GATE PENDING — tactical idea exists, but score remains selective (${tacticalScoreNum.toFixed(1)}/10).`;
  }
  if (/STAGGER ADD|ACCUMULATE|HOLD WINNER|RERATING/i.test(tacticalAction) && (tacticalScoreNum < 5.5 || leadership < 50)) {
    tacticalAction = `ASTRO GATE PENDING — pressure/score guardrail active (${tacticalScoreNum.toFixed(1)}/10; leadership ${Math.round(leadership)}/100).`;
  }
  if (/PRIORITY|STRONG FORWARD LEADER/i.test(strategicAction) && strategicScoreNum < 6.5) {
    strategicAction = `RALLY WITH CHURN — participate selectively; strategic score is not yet leader-grade.`;
  }

  // v30.04A final-label consistency guard. LOW/MEDIUM pressure belongs to the
  // tactical/digestion layer; it must not become strategic PRESSURE FIRST by itself.
  if (tacticalPressureOnly) {
    const usableWindow = activeExpansion || tacticalScoreNum >= 6.6 || expansion >= pressure - 4;
    if (/HEAVY TRIM|TRIM SATELLITE|PRESSURE FIRST|BREAK PRESSURE|HIGH PRESSURE/i.test(`${mainLabel} ${tacticalAction} ${strategicAction}`)) {
      if (usableWindow) {
        mainLabel = `${pressureSeverity.label} CHURN — usable but not clean; stagger and use mapped astro confirmation`;
        tacticalAction = `STAGGER ONLY IF SUPPORT HOLDS — ${pressureSeverity.label.toLowerCase()} is tactical noise/digestion, not an exit signal.`;
        strategicAction = strongForward
          ? `HOLD CORE / SELECTIVE ACCUMULATION — strategic thesis remains alive; do not let ${pressureSeverity.label.toLowerCase()} dominate.`
          : `WAIT FOR CONFIRMATION — no strategic pressure break is mapped.`;
        capitalPosture = `Core: hold selectively; fresh capital can be staggered only around catalyst absorption. Protect excess, not core.`;
        primaryBucket = usableWindow ? "TACTICAL" : primaryBucket;
      } else {
        mainLabel = `ASTRO REPAIR GATE — ${pressureSeverity.label.toLowerCase()} suggests delay, not strategic break.`;
        tacticalAction = `WATCH CLOSELY — use mapped astro confirmation; do not treat ${pressureSeverity.label.toLowerCase()} as trim pressure.`;
        strategicAction = `WAIT FOR CONFIRMATION — strategic protection requires high/break pressure, not ${pressureSeverity.label.toLowerCase()}.`;
        capitalPosture = `Core: hold only if conviction remains; fresh capital waits for confirmation.`;
      }
    }
  }

  return {
    mainLabel: formatDatesInText(mainLabel),
    tacticalAction: formatDatesInText(tacticalAction),
    strategicAction: formatDatesInText(strategicAction),
    capitalPosture: formatDatesInText(capitalPosture),
    dormancyText: dormancyRiskText(stock, { full: true }),
    correctionText: correctionModeText(stock, { full: true }),
    primaryBucket,
    conflictType: strategicPressureActive ? "hard-pressure" : volatileConflict ? "volatile-conflict" : activeExpansion ? "active-expansion" : "standard"
  };
}

function reratingRunwayObserver(stock) {
  if (!stock?.computed_from_natal) return null;
  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    if (!["RERATING_IGNITION", "CLEAN_EXPANSION", "ACTIVE_TACTICAL_LEADERSHIP", "MATURE_LEADER"].includes(v35.behaviour?.state)) return null;
    const gate = v35.timingPath?.strategicGate || null;
    return {
      kind: "runway",
      tone: "teal",
      title: String(v35.behaviour.state).replaceAll("_", " "),
      level: v35.astroTruth?.cyclePotential >= 85 ? "RARE" : v35.astroTruth?.cyclePotential >= 72 ? "HIGH" : "DEVELOPING",
      reason: `Runway score ${v35.astroTruth?.cyclePotential ?? "—"}/100; confidence ${v35.behaviour?.confidence ?? "—"}/100; ${v35.astroTruth?.breakState?.mapped ? "break-risk mapped" : "no break-risk mapped"}`,
      implication: `${v35.language?.strategicNote || ""}${gate ? ` Next ${v35GateRoleLabel(gate.role).toLowerCase()}: ${formatDateReadable(gate.date)}${gate.signalClass ? ` — ${String(gate.signalClass).replaceAll("_", " ").toLowerCase()}` : ""}.` : " No strategic reversal/protection gate mapped."}`
    };
  }
  const { pressure, expansion, forwardLeadership } = stockPressureExpansionState(stock);
  const tactical = tacticalScoreValue(stock) ?? 5;
  const strategic = strategicScoreValue(stock) ?? 5;
  const leadership = numericValue(stock.leadership_probability) ?? 50;
  const durability = forwardLeadership ?? leadership;
  const cycleMB = String(stock.cycle_multibagger_potential || stock.multibagger_probability || "").toUpperCase();
  const currentMB = String(stock.current_multibagger_probability || "").toUpperCase();
  const dormancy = capitalDormancyRiskValue(stock);
  const sev = pressureRoutingState(stock).severity;
  const days = mappedWindowDaysValue(stock);
  const correction = String(correctionModeValue(stock) || "").toLowerCase();
  const best = bestWindowText(stock);

  // No hope-box for broken or sleepy capital. If money is likely to sit for more
  // than ~6 months, or hard pressure dominates, the stock should not attract
  // rerating attention yet.
  if (days > 180) return null;
  if (["HIGH", "VERY HIGH"].includes(dormancy)) return null;
  if (sev.key === "high" || sev.key === "break") return null;
  if (correction.includes("price correction") || correction.includes("break")) return null;
  if (tactical < 5.8) return null; // tactical slowness blocks rerating attention now

  const nearWindow = days <= 45 || /HIGH|EXTREME/.test(currentMB);
  const nearCandidate =
    nearWindow &&
    tactical >= 7.0 &&
    leadership >= 65 &&
    strategic >= 7.0 &&
    durability >= 65 &&
    dormancy === "LOW" &&
    expansion >= pressure - 5;

  const potentialCandidate =
    !nearCandidate &&
    days <= 180 &&
    tactical >= 5.8 &&
    strategic >= 6.8 &&
    durability >= 65 &&
    (cycleMB === "HIGH" || cycleMB === "EXTREME" || strategic >= 7.2 || durability >= 72) &&
    !["HIGH", "VERY HIGH"].includes(dormancy);

  if (!nearCandidate && !potentialCandidate) return null;

  const reasons = [];
  if (nearCandidate) {
    if (leadership >= 65) reasons.push(`current leadership ${Math.round(leadership)}/100`);
    if (strategic >= 7) reasons.push(`strategic score ${strategic.toFixed(1)}/10`);
    if (dormancy === "LOW") reasons.push("low dormancy");
    if (sev.key === "low" || sev.key === "medium") reasons.push(`${sev.label.toLowerCase()} is manageable`);
    return {
      kind: "runway",
      tone: "teal",
      title: "Near-window rerating candidate",
      level: strategic >= 8 || durability >= 78 || cycleMB === "EXTREME" ? "HIGH" : "MODERATE",
      reason: reasons.join("; ") || "near-term expansion and leadership are aligned",
      implication: `Astro window: ${best}. Instruction: use part-sized capital and tolerate normal astro pressure; this is not full-size or passive approval.`
    };
  }

  reasons.push(`potential window within ${Math.max(0, Math.round(days))} days`);
  if (durability >= 65) reasons.push(`forward leadership ${Math.round(durability)}/100`);
  if (cycleMB === "HIGH" || cycleMB === "EXTREME") reasons.push(`cycle potential ${cycleMB}`);
  return {
    kind: "watch",
    tone: "grey",
    title: "Cycle Watch",
    level: "POTENTIAL",
    reason: reasons.join("; "),
    implication: (tactical >= 7 && dormancy === "LOW")
      ? "Near-term tactical participation is active, but the larger rerating runway is still conditional. Stagger now; do not upgrade to full-size/passive capital yet."
      : "Background rerating potential exists, but deployable capital remains limited. Keep it on the astro review path before giving it larger capital attention."
  };
}


function ReratingRunwayBox({ runway }) {
  // v34.2: this box appears only for rerating-ready / near-window stocks.
  // Cycle-watch and distant potential remain in the tactical/strategic columns
  // so the simple story does not over-promote future hope.
  if (!runway || runway.tone !== "teal") return null;
  return (
    <div style={{
      margin: "14px 0 12px",
      padding: "12px 14px",
      border: "1px solid #5eead4",
      background: "#ccfbf1",
      borderRadius: 14,
      color: "#134e4a"
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        Rerating Window Observer
      </div>
      <div style={{ fontWeight: 900, marginBottom: 4 }}>{runway.title}: {runway.level}</div>
      <div style={{ fontSize: 13, lineHeight: 1.45 }}>{runway.reason}</div>
      <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{runway.implication}</div>
    </div>
  );
}

function v34PressureLabel(stock) {
  return pressureRoutingState(stock).severity?.label || "MAPPED PRESSURE";
}

function v34WindowPrefix(stock) {
  const days = mappedWindowDaysValue(stock);
  if (days <= 0) return "Open now";
  if (days <= 45) return "Near";
  return "Ahead";
}

function v34StrategicCapital(stock) {
  return v347StrategicDecision(stock).label;
}

function v34StrategicCapitalMeaning(label) {
  switch (label) {
    case "FULL BUILD":
      return "Strategic capital is approved. Add in parts and hold through normal astro pressure.";
    case "PART BUILD":
      return "Some strategic capital is allowed, but not full-size or passive long-term yet.";
    case "WAIT":
      return "No fresh strategic capital now. Keep on watch for the next astro review.";
    case "CORE HOLD":
      return "Confirmed strategic core can stay; fresh strategic build waits until the pressure/re-entry map improves.";
    case "PROTECT":
      return "Avoid fresh strategic capital; reduce excess if held.";
    case "AVOID":
      return "No strategic capital; pressure, dormancy, or weak leadership is too high.";
    case "NATAL PENDING":
      return "Natal data is required before strategic capital can be assessed.";
    default:
      return "Strategic capital remains selective.";
  }
}

function V34StrategicCapitalChip({ stock }) {
  const label = v34StrategicCapital(stock);
  return <span style={strategicChipStyle}>{label} — {v34StrategicCapitalMeaning(label)}</span>;
}


// v34.7 considered architecture: generate explicit tactical and strategic decision
// objects first, then let the table/card render those objects. This prevents old
// research text from pushing the two horizons back into one mixed verdict.
function v347AstroMetrics(stock) {
  const scoreState = stockPressureExpansionState(stock);
  const severity = pressureRoutingState(stock).severity || { key: "low", label: "LOW PRESSURE" };
  const tacticalScore = tacticalScoreValue(stock) ?? 0;
  const strategicScore = strategicScoreValue(stock) ?? 0;
  const tacticalLeadership = numericValue(stock?.leadership_probability ?? stock?.tactical_leadership) ?? Math.round(tacticalScore * 10);
  const strategicLeadership = parseForwardLeadership(stock) ?? Math.round(strategicScore * 10);
  const dormancy = capitalDormancyRiskValue(stock);
  const days = mappedWindowDaysValue(stock);
  const pressureDays = pressureWindowDaysValue(stock);
  const windowText = bestWindowText(stock);
  const windowOpen = days <= 7;
  const windowSoon = days > 7 && days <= 45;
  const windowNear = days <= 56;
  const cyclePotential = String(stock?.cycle_multibagger_potential || stock?.multibagger_probability || "").toUpperCase();
  const text = [
    stock?.current_pressure,
    stock?.expected_behaviour,
    stock?.catalyst_response,
    stock?.environment_signature,
    stock?.top_transits,
    stock?.catalyst_contact_text,
    stock?.dominant_signature,
    stock?.action,
    stock?.signal
  ].join(" ");
  const hardPressureText = textHasAny(text, ["hard eclipse", "break-risk", "break risk", "eclipse square", "eclipse opposition", "structural reset", "reset risk", "capital protection"]);
  const expansionStructure = scoreState.expansion >= 60 || strategicLeadership >= 65 || tacticalLeadership >= 65 || /HIGH|EXTREME/.test(cyclePotential);
  const forwardSupport = strategicScore >= 6.7 || strategicLeadership >= 65;
  const highDormancy = ["HIGH", "VERY HIGH"].includes(dormancy);
  const rawBreakRisk = severity.key === "break" || (hardPressureText && scoreState.pressure >= 76 && scoreState.pressure >= scoreState.expansion + 10 && tacticalLeadership < 50);
  const pressureOnly = !rawBreakRisk && (severity.key === "high" || scoreState.pressure >= 68) && scoreState.pressure >= scoreState.expansion + 6;
  const protectionActionable = pressureDays !== null && pressureDays <= 21;
  const hardReductionActionable = pressureDays !== null && pressureDays <= 14;
  const breakRisk = rawBreakRisk && hardReductionActionable;
  const breakRiskAhead = rawBreakRisk && !hardReductionActionable;
  const pressureText = pressureWindowText(stock);
  return {
    ...scoreState,
    severity,
    tacticalScore,
    strategicScore,
    tacticalLeadership,
    strategicLeadership,
    dormancy,
    days,
    windowText,
    windowOpen,
    windowSoon,
    windowNear,
    pressureDays,
    pressureText,
    protectionActionable,
    hardReductionActionable,
    breakRiskAhead,
    cyclePotential,
    hardPressureText,
    expansionStructure,
    forwardSupport,
    highDormancy,
    breakRisk,
    pressureOnly
  };
}

function v347TacticalDecision(stock) {
  if (!stock?.computed_from_natal) {
    return {
      kind: "natal-pending",
      action: "WATCH CLOSELY",
      posture: "Natal data required before tactical posture is available.",
      window: "Natal data pending.",
      review: "Natal Review — add chart data before using tactical capital.",
      dormancy: "Natal data pending — dormancy cannot be assessed."
    };
  }

  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const capital = v35.capitalDecision || {};
    const language = v35.language || {};
    const gate = v35.timingPath?.tacticalGate || v35.timingPath?.nextGate || null;
    const fresh = capital.freshTacticalCapital;
    const breaking = v35.astroTruth?.breakState?.mapped;
    const active = fresh === "STAGGER_ADD" || fresh === "PART_SIZED_ONLY";
    return {
      kind: breaking ? "break-protect" : active ? (v35.behaviour?.velocity === "HIGH" ? "strong-active" : "active") : gate?.role === "PRESSURE_CHECK" ? "pressure-watch" : "watch",
      action: breaking ? "TRIM SATELLITE" : active ? "STAGGER ADD" : "NO FRESH",
      posture: `Existing position: ${language.capital?.existingPosition || "HOLD / REVIEW"}. Fresh tactical capital: ${language.capital?.freshTacticalCapital || "NO FRESH"}.`,
      window: active ? "Active Window — deployment is allowed now in stages." : "No fresh tactical deployment is authorised now.",
      review: language.tacticalTimingPath || language.timingPath || "No later tactical gate is mapped.",
      dormancy: v35.behaviour?.capitalEfficiency === "LOW" ? "Dormant capital is mapped." : "Capital efficiency is productive/selective; no dormancy veto is applied."
    };
  }

  const m = v347AstroMetrics(stock);
  const currentDeployable = m.windowOpen && m.tacticalScore >= 7.0 && m.tacticalLeadership >= 62 && !m.highDormancy && !m.breakRisk && !m.pressureOnly;
  const nearDeployable = !m.windowOpen && m.windowNear && m.tacticalScore >= 7.2 && m.tacticalLeadership >= 65 && !m.highDormancy && !m.breakRisk && !m.pressureOnly;
  const futureBuild = !m.windowOpen && m.tacticalScore >= 6.6 && m.tacticalLeadership >= 58 && !m.highDormancy && !m.breakRisk && !m.pressureOnly;

  if (m.breakRisk) {
    return {
      kind: "break-protect",
      action: m.tacticalScore <= 3.5 && m.tacticalLeadership < 40 ? "HEAVY TRIM" : "TRIM SATELLITE",
      posture: "Break-risk protection is active; reduce only the exposure level called for by the astro pressure map.",
      window: formatDatesInText(`No active accumulation now. Protection comes before fresh deployment. Next re-entry review: ${m.windowText}.`),
      review: formatDatesInText(`Break-Risk Review — ${m.pressureText}. Astro instruction: hard pressure is now actionable; protect capital aggressively.`),
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  if (m.breakRiskAhead) {
    return {
      kind: "pressure-watch",
      action: "NO FRESH",
      posture: "Break-risk pressure is mapped ahead, but the reduction gate is not active yet; keep fresh capital out.",
      window: formatDatesInText(`No active accumulation now. Protection comes before fresh deployment. Next re-entry review: ${m.windowText}.`),
      review: formatDatesInText(`Protection Review — ${m.pressureText}. Astro instruction: prepare to review excess/satellite exposure closer to the pressure gate; no trim instruction today.`),
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  if (m.pressureOnly && m.tacticalScore < 5.2 && m.tacticalLeadership < 50) {
    const action = (!m.protectionActionable || m.forwardSupport || m.expansionStructure) ? "NO FRESH" : "TRIM SATELLITE";
    return {
      kind: "pressure-watch",
      action,
      posture: action === "TRIM SATELLITE"
        ? "Protection posture is active; reduce only excess/satellite exposure, not normal core volatility."
        : "Pressure watch; hold only core if already held and keep fresh capital out.",
      window: formatDatesInText(`No active accumulation now. Next re-entry review: ${m.windowText}. Astro instruction: pressure management comes before fresh deployment.`),
      review: formatDatesInText(`Protection Review — ${m.pressureText}. Astro instruction: ${action === "TRIM SATELLITE" ? "protect excess/satellite exposure; this is pressure management, not an automatic core exit." : "reduction is not active today; keep fresh capital out and review excess exposure closer to the pressure gate."}`),
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  if (currentDeployable) {
    return {
      kind: m.tacticalScore >= 8.4 || m.tacticalLeadership >= 72 ? "strong-active" : "active",
      action: "STAGGER ADD",
      posture: m.tacticalScore >= 8.4 || m.tacticalLeadership >= 72
        ? "Strong tactical leader; participate in parts, not vertically."
        : "Active tactical window; stagger fresh capital in parts.",
      window: formatDatesInText(`Open now — ${m.windowText}. Astro instruction: tactical deployment is active; use part-sized capital rather than vertical deployment.`),
      review: "Active Window — Open now. Astro instruction: participate in parts; this is not an all-in signal.",
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  if (nearDeployable || futureBuild) {
    return {
      kind: "future-review",
      action: nearDeployable ? "WATCH CLOSELY" : "WATCH CLOSELY",
      posture: "Watch posture; fresh capital waits for the next useful astro review.",
      window: formatDatesInText(`No active accumulation now. Re-entry Review — ${m.windowText}. Astro instruction: keep fresh capital limited until this date.`),
      review: formatDatesInText(`Re-entry Review — ${m.windowText}. Astro instruction: fresh capital waits for this date; no deployment instruction today.`),
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  if (m.highDormancy || m.tacticalScore < 6.4 || m.tacticalLeadership < 58) {
    return {
      kind: "watch",
      action: "WATCH CLOSELY",
      posture: m.highDormancy ? "Watch posture; fresh capital is inefficient until the next astro review." : "Selective watch; do not ask fresh capital to work meaningfully yet.",
      window: formatDatesInText(`No active accumulation now. Re-entry Review — ${m.windowText}. Astro instruction: keep fresh capital limited until this date.`),
      review: formatDatesInText(`Re-entry Review — ${m.windowText}. Astro instruction: keep fresh capital out until this date; no deployment instruction today.`),
      dormancy: v34DormancyText(stock, "tactical")
    };
  }

  return {
    kind: "hold",
    action: "HOLD CORE",
    posture: "Hold-through posture; normal astro churn is not an exit signal.",
    window: formatDatesInText(`No active accumulation now. Fresh-Capital Review — ${m.windowText}.`),
    review: formatDatesInText(`Fresh-Capital Review — ${m.windowText}. Astro instruction: reassess fresh capital on this date.`),
    dormancy: v34DormancyText(stock, "tactical")
  };
}

function canonicalSymbol(stock) {
  return String(stock?.name || stock?.symbol || stock?.ticker || "").trim().toUpperCase();
}

function hasDurableCompounderLearning(stock) {
  // Locked replay-learning floor: not a price override. It prevents a durable,
  // validated compounder from being translated as strategic break/protect just
  // because a short tactical pressure window is active.
  return ["ICICIBANK.NS"].includes(canonicalSymbol(stock));
}

function rawBestWindowSource(stock) {
  return stock?.cycle_potential_window || stock?.recovery_window || stock?.phase_fit || stock?.best_window || "";
}

function v347StrategicDecision(stock) {
  if (!stock?.computed_from_natal) {
    return {
      label: "NATAL PENDING",
      posture: "Natal data required before strategic posture is available.",
      meaning: v34StrategicCapitalMeaning("NATAL PENDING"),
      map: "Natal data pending.",
      review: "Natal Review — add chart data before using strategic capital.",
      dormancy: "Natal data pending — dormancy cannot be assessed."
    };
  }

  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const raw = v35.capitalDecision?.strategicCapital || "WAIT";
    const label = raw.replaceAll("_", " ");
    const passive = v35.language?.capital?.passiveLongTermCapital || "NOT APPROVED";
    const strategicGate = v35.timingPath?.strategicGate || null;
    return {
      label,
      posture: `Strategic capital: ${label}. Passive long-term: ${passive}.`,
      meaning: v35.language?.strategicNote || v34StrategicCapitalMeaning(label),
      map: `Strategic build status — ${label}. ${v35.language?.strategicNote || ""}`,
      review: v35.language?.strategicTimingPath || (strategicGate
        ? `${String(strategicGate.role).replaceAll("_", " ")}: ${strategicGate.date}. Rerun the strategic bucket only.`
        : "No later strategic decision gate is mapped."),
      dormancy: v35.behaviour?.capitalEfficiency === "LOW" ? "Dormant capital is mapped." : "No dormancy veto is applied to the present strategic decision."
    };
  }

  const m = v347AstroMetrics(stock);
  const durableCompounder = hasDurableCompounderLearning(stock);
  let label = "WAIT";
  if (durableCompounder && (m.pressureOnly || m.breakRiskAhead || m.breakRisk)) label = "CORE HOLD";
  else if (m.breakRisk || (m.pressureOnly && !m.forwardSupport)) label = "PROTECT";
  else if (m.pressureOnly && m.forwardSupport) label = "PROTECT";
  else if (m.highDormancy) label = "WAIT";
  else if (m.strategicScore >= 9 && m.strategicLeadership >= 82 && m.tacticalScore >= 8.2 && m.windowOpen && m.severity.key === "low") label = "FULL BUILD";
  else if (m.strategicScore >= 7.2 && m.strategicLeadership >= 65 && m.tacticalScore >= 6.8 && !m.highDormancy && !m.pressureOnly && !m.breakRisk) label = "PART BUILD";
  else if (m.strategicScore >= 6.8 && m.strategicLeadership >= 65 && !m.highDormancy) label = "WAIT";
  else if (m.strategicScore < 5.0 && m.tacticalScore < 5.0) label = "AVOID";

  const protectionDate = m.pressureText || "the pressure window";
  let posture = "Strategic capital waits; keep the stock on the astro review list.";
  let map = formatDatesInText(`Strategic Re-entry Review — ${m.windowText}. Astro instruction: no strategic fresh capital now; this is the next dated reassessment point.`);
  let review = formatDatesInText(`Strategic Re-entry Review — ${m.windowText}. Astro instruction: strategic capital waits until this date; no deployment instruction today.`);

  if (label === "FULL BUILD") {
    posture = "Strategic build approved; hold through normal astro pressure.";
    map = "Strategic build status — FULL BUILD. Astro instruction: strategic capital is approved; add in parts and hold through normal pressure.";
    review = "No Upgrade Review Mapped — FULL BUILD remains the active strategic instruction.";
  } else if (label === "PART BUILD") {
    posture = "PART BUILD is active now: limited strategic capital is allowed, but full-size/passive approval is not mapped.";
    map = "PART BUILD NOW — limited strategic capital is allowed because leadership and dormancy are supportive. Astro instruction: keep size partial; do not wait for a Full-Build date to use part-sized capital.";
    review = "Full-Build Upgrade — Not mapped. Continue PART BUILD only; no passive/full-size approval in this card.";
  } else if (label === "CORE HOLD") {
    posture = "Durable compounder core-hold: pressure blocks fresh strategic build, not existing core conviction.";
    map = "Strategic core status — CORE HOLD. Astro instruction: keep existing strategic/core capital; no fresh strategic build during the pressure window.";
    review = formatDatesInText(`Pressure Check — ${protectionDate}. Astro instruction: no fresh strategic capital; protect only excess/satellite exposure, not confirmed core.`);
  } else if (label === "PROTECT") {
    posture = "Strategic capital is protected; pressure management comes first.";
    map = "Strategic protection status. Astro instruction: avoid fresh strategic capital; reduce only excess/satellite exposure if held.";
    review = formatDatesInText(`Protection Review — ${protectionDate}. Astro instruction: no fresh strategic capital; protect only excess/satellite exposure.`);
  } else if (label === "AVOID") {
    posture = "Strategic capital is avoided because pressure, dormancy, or weak leadership is too high.";
    map = formatDatesInText(`No strategic build. Strategic Re-entry Review: ${m.windowText}. Astro instruction: avoid strategic capital now.`);
    review = formatDatesInText(`Strategic Re-entry Review — ${m.windowText}. Astro instruction: no strategic capital now.`);
  }

  return { label, posture, meaning: v34StrategicCapitalMeaning(label), map, review, dormancy: v34DormancyText(stock, "strategic") };
}

function v347DecisionSummaryLabel(stock) {
  if (!stock?.computed_from_natal) return "NATAL DATA PENDING";
  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    return `${String(v35.behaviour?.state || "SELECTIVE").replaceAll("_", " ")} · ${String(v35.capitalDecision?.strategicCapital || "WAIT").replaceAll("_", " ")}`;
  }
  const tactical = v347TacticalDecision(stock);
  const strategic = v347StrategicDecision(stock);
  const m = v347AstroMetrics(stock);
  if (tactical.kind === "break-protect") return "BREAK-RISK PROTECTION · STRATEGIC PROTECT";
  if (strategic.label === "CORE HOLD") return "PRESSURE WATCH · CORE HOLD";
  if (tactical.kind === "pressure-watch" || strategic.label === "PROTECT") return "PRESSURE WATCH · STRATEGIC PROTECT";
  if (tactical.kind === "strong-active" && strategic.label === "FULL BUILD") return "STRONG TACTICAL LEADER · FULL BUILD";
  if (tactical.kind === "strong-active" && strategic.label === "PART BUILD") return "STRONG TACTICAL LEADER · PART BUILD";
  if (tactical.kind === "active" && strategic.label === "PART BUILD") return "ACTIVE TACTICAL LEADER · PART BUILD";
  if (strategic.label === "WAIT" && (m.strategicScore >= 7 || m.strategicLeadership >= 70)) return "WATCH NOW · FORWARD LEADER";
  if (tactical.action === "WATCH CLOSELY" && strategic.label === "PART BUILD") return "TACTICAL WATCH · PART BUILD";
  if (strategic.label === "WAIT") return "SELECTIVE WATCH · WAIT";
  return "SELECTIVE WATCH · CAPITAL DISCIPLINE";
}

function v347MainStory(stock) {
  if (!stock?.computed_from_natal) return `${stock?.name || "This stock"} needs natal data before the app can translate macro weather into stock-specific behaviour.`;
  if (stock?.decision_v35) return stock.decision_v35.language?.singleStory || "v35 decision available.";
  const name = stock?.name || "This stock";
  const tactical = v347TacticalDecision(stock);
  const strategic = v347StrategicDecision(stock);
  const m = v347AstroMetrics(stock);
  const pressure = m.severity.label.toLowerCase();
  const dormancy = String(m.dormancy).toLowerCase();
  if (tactical.kind === "break-protect") return `${name} is in a hard pressure window. The astro instruction is capital protection first; fresh capital stays out and only resilient core exposure should remain.`;
  if (strategic.label === "CORE HOLD") return `${name} is a durable compounder under a tactical pressure window. Fresh strategic capital waits, but existing core conviction is not a forced exit; protect only excess/satellite exposure.`;
  if (tactical.kind === "pressure-watch" || strategic.label === "PROTECT") return `${name} is under pressure. The astro instruction is no fresh capital; protect only excess/satellite exposure; no break-risk reduction is active in this card.`;
  if (tactical.kind === "strong-active" || tactical.kind === "active") return `${name} is in an active tactical leadership window. The astro map supports participation in parts. Strategic capital is ${strategic.label}: ${strategic.meaning} Current pressure is ${pressure} and dormancy is ${dormancy}.`;
  if (strategic.label === "WAIT" && (m.strategicScore >= 7 || m.strategicLeadership >= 70)) return `${name} is a forward-leadership watch case. Fresh tactical capital is not asked to work meaningfully now; the next re-entry review is the dated reassessment point.`;
  if (strategic.label === "PART BUILD") return `${name} has constructive strategic structure, but the tactical window is not clean enough for active deployment. Keep capital part-sized and wait for the next astro review.`;
  return `${name} remains selective. The astro field does not ask for meaningful fresh deployment yet.`;
}

function v34TacticalFreshCapitalLabel(stock) {
  return v347TacticalDecision(stock).action;
}

function v34TacticalPosture(stock) {
  return v347TacticalDecision(stock).posture;
}

function v34StrategicPosture(stock) {
  return v347StrategicDecision(stock).posture;
}

function v34DecisionSummaryLabel(stock) {
  return v347DecisionSummaryLabel(stock);
}

function v34MainStory(stock) {
  return v347MainStory(stock);
}

function v34TacticalAccumulationWindow(stock) {
  return v347TacticalDecision(stock).window;
}

function v34StrategicMapText(stock) {
  return v347StrategicDecision(stock).map;
}

function v34TacticalReviewWindow(stock) {
  return v347TacticalDecision(stock).review;
}

function v34StrategicReviewWindow(stock) {
  return v347StrategicDecision(stock).review;
}

function v34DormancyText(stock, horizon = "tactical") {
  const risk = capitalDormancyRiskValue(stock);
  const window = bestWindowText(stock);
  if (!stock?.computed_from_natal) return "Natal data pending — dormancy cannot be assessed.";
  // Keep this helper deliberately independent from v347StrategicDecision().
  // v347StrategicDecision() calls v34DormancyText(), so calling back into
  // v34StrategicCapital()/v347StrategicDecision() here creates a client-side
  // recursion crash. The strategic capital label is rendered separately.
  if (risk === "LOW") return horizon === "strategic"
    ? "Low. Strategic capital is not dormant; use the strategic capital label for sizing."
    : "Low. Capital can work now through the current tactical posture.";
  if (risk === "MODERATE") return formatDatesInText(`Moderate. Capital may sit idle before ${window}; keep fresh capital limited until that date.`);
  if (risk === "HIGH" || risk === "VERY HIGH") return formatDatesInText(`${risk}. Fresh capital is inefficient now; next re-entry review is ${window}.`);
  return `${risk}.`;
}

function v34StrategicPressureWindow(stock) {
  const pressure = pressureWindowText(stock);
  const strategic = v347StrategicDecision(stock);
  if (strategic.label === "CORE HOLD") return `${pressure}. Astro instruction: pressure blocks fresh strategic build, not confirmed core holding; protect only excess.`;
  if (strategic.label === "PROTECT" || strategic.label === "AVOID") return `${pressure}. Astro instruction: pressure controls strategic capital; avoid fresh capital and protect only excess.`;
  if (strategic.label === "WAIT") return `${pressure}. Astro instruction: strategic capital waits; this pressure window is not a deployment signal.`;
  if (strategic.label === "PART BUILD") return `${pressure}. Astro instruction: carry normal pressure, but keep strategic capital part-sized.`;
  if (strategic.label === "FULL BUILD") return `${pressure}. Astro instruction: hold through normal pressure; a separate Break-Risk Review will appear when mapped.`;
  return `${pressure}. Astro instruction: keep larger capital limited.`;
}

function V34Field({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0, 1fr)", gap: 12, alignItems: "start", padding: "7px 0" }}>
      <div style={{ ...miniLabelStyle, paddingTop: 8 }}>{label}</div>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", lineHeight: 1.45, minHeight: 20 }}>
        {children}
      </div>
    </div>
  );
}

function V34ViewCard({ title, horizon, rows }) {
  return (
    <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, background: "#f8fbff", padding: 14 }}>
      <div style={miniLabelStyle}>{horizon}</div>
      <h4 style={{ margin: "2px 0 12px" }}>{title}</h4>
      {rows.map(([label, value], index) => <V34Field key={`${title}-${label}-${index}`} label={label}>{value}</V34Field>)}
    </div>
  );
}

function v34TacticalRows(stock) {
  const resolved = finalStockDecision(stock);
  const tactical = v347TacticalDecision(stock);
  return [
    ["Posture", v34TacticalPosture(stock)],
    ["Score", tacticalScore(stock)],
    ["Fresh capital", <ActionBadge action={v34TacticalFreshCapitalLabel(stock)} key="v34-fresh" />],
    ["Active / re-entry window", v34TacticalAccumulationWindow(stock)],
    [stock?.decision_v35 ? "Next tactical astro gate" : "Pressure window", stock?.decision_v35 ? pressureWindowText(stock) : `${pressureWindowText(stock)}. Astro instruction: ${v34PressureLabel(stock).toLowerCase()} controls sizing and pace.`],
    [stock?.decision_v35 ? "Capital instruction through gate" : "Tactical decision date", stock?.decision_v35 ? v35TacticalContinuityText(stock) : v34TacticalReviewWindow(stock)],
    ["Capital dormancy", stock?.decision_v35 ? tactical.dormancy : v34DormancyText(stock, "tactical")],
    ["Correction mode", correctionModeText(stock, { full: true })],
    ["Leadership potential", tacticalLeadershipLabel(stock)]
  ];
}

function v34StrategicRows(stock) {
  const strategic = v347StrategicDecision(stock);
  return [
    ["Posture", v34StrategicPosture(stock)],
    ["Score", strategicScore(stock)],
    ["Strategic capital", <V34StrategicCapitalChip stock={stock} key="v34-strategic-capital" />],
    ["Strategic build status", v34StrategicMapText(stock)],
    [stock?.decision_v35 ? "Next strategic astro gate" : "Strategic pressure window", stock?.decision_v35 ? strategicGateText(stock) : v34StrategicPressureWindow(stock)],
    [stock?.decision_v35 ? "Capital instruction through gate" : "Strategic upgrade / protection date", stock?.decision_v35 ? v35StrategicContinuityText(stock) : v34StrategicReviewWindow(stock)],
    ["Capital dormancy", stock?.decision_v35 ? strategic.dormancy : v34DormancyText(stock, "strategic")],
    ["Correction mode", correctionModeText(stock, { full: true })],
    ["Leadership durability", strategicLeadershipLabel(stock)]
  ];
}

function StockDetailPanel({ stock, onClose }) {
  const contacts = compactContactList(stock.top_transits);
  const catalystContacts = compactContactList(stock.catalyst_contact_text);
  const resolvedDecision = finalStockDecision(stock);
  const runway = reratingRunwayObserver(stock);
  const catalystLine = stock.catalyst_label || stock.next_event || "-";
  const timing = stock.next_ignition || stock.days_to_event || "-";
  const catalystTiming = [stock.catalyst_readiness || stock.current_window, timing]
    .filter(value => value && value !== "-")
    .join(" · ") || "-";
  const pressureWindow = pressureWindowText(stock);
  const broad = broadViewText(stock, { full: true });
  const registryLine = `${stock.registry_type || "USER"}${isCoreLocked(stock) ? " · Locked" : " · Editable"}`;
  const tacticalPathRows = buildTacticalPathRows(stock);
  const strategicPathRows = buildStrategicPathRows(stock);

  const decisionRows = [
    ["Main label", resolvedDecision.mainLabel],
    ["Tactical 30–45d", resolvedDecision.tacticalAction],
    ["Strategic 3–12m", resolvedDecision.strategicAction],
    ["Fresh capital action", resolvedActionParts(stock).freshCapital],
    ["Tactical active / re-entry window", v34TacticalAccumulationWindow(stock)],
    ["Strategic build status", v34StrategicMapText(stock)],
    ["Main pressure window", pressureWindow],
    ["Tactical score /10", tacticalScore(stock)],
    ["Strategic score /10", strategicScore(stock)],
    ["Why", actionExplanation(stock)],
    ["Capital dormancy risk", resolvedDecision.dormancyText],
    ["Correction mode", resolvedDecision.correctionText],
    ["Dominant astro signature", dominantAstroSignature(stock)],
    ["Transit receptor expression", stock.transit_receptor_expression ? `${stock.transit_receptor_expression} · score ${stock.transit_receptor_score ?? "-"} · confidence ${stock.transit_receptor_confidence || "-"}` : "-"],
    ["Transit receptor reading", stock.transit_receptor_reading || "-"],
    ["Cluster / overlap context", stockClusterOverlapContext(stock)],
    ["Leadership potential", tacticalLeadershipLabel(stock)],
    ["Leadership durability", strategicLeadershipLabel(stock)]
  ];

  const researchRows = [
    ["Immediate tactical text", `${v347TacticalDecision(stock).action} — ${v347TacticalDecision(stock).posture}`],
    ["Tactical leadership", tacticalLeadershipLabel(stock)],
    ["Strategic leadership", strategicLeadershipLabel(stock)],
    ["Cycle runway", stock?.decision_v35 ? `${stock.cycle_multibagger_potential || "-"} · score ${stock.cycle_potential_score ?? "-"}/100 · confidence ${stock.cycle_potential_confidence ?? "-"}/100. This measures runway strength, not a dated active phase.` : `${stock.cycle_multibagger_potential || stock.multibagger_probability || "-"}${stock.cycle_potential_score ? ` · score ${stock.cycle_potential_score}` : ""}`],
    ["Current pressure", stock.current_pressure || "-"],
    ["Capital dormancy risk", dormancyRiskText(stock, { full: true })],
    ["Capital dormancy map", dormancyMapText(stock)],
    ["Correction mode", correctionModeText(stock, { full: true })],
    ["Core vs fresh capital", coreFreshCapitalGuidance(stock)],
    ["Dominant astro signature", dominantAstroSignature(stock)],
    ["Dormancy / correction rationale", dormancyRationale(stock)],
    ["Catalyst timing", `${catalystLine} — ${eventStatusDaysText(stock)}`],
    ["Expected stock response", stock.catalyst_response || stock.expected_behaviour || "No response generated yet."],
    ["Broad view", broad],
    ["Strategic situation", `${v347StrategicDecision(stock).label} — ${v347StrategicDecision(stock).posture}`],
    ["Attached scores", `Tactical: ${tacticalScore(stock)} · Strategic score: ${strategicScore(stock)} · Expansion: ${asScore(stock.expansion_score)} · Pressure: ${asScore(stock.pressure_score)} · Tactical leadership: ${tacticalLeadershipLabel(stock)} · Strategic leadership: ${strategicLeadershipLabel(stock)}`],
    ["Natal reliability", `Type: ${stock.natal_profile?.natalArchetype || stock.structural_cycle || "-"}; Confidence: ${stock.natal_confidence || "-"}; Source: ${stock.natal_source || "-"}; Birth date: ${formatDatesInText(stock.natal_birth_date || "-")}; Computed: ${stock.computed_from_natal ? "Yes" : "No"}; Registry: ${registryLine}`],
    ["Natal personality", `Element bias: ${stock.natal_profile?.elementBias || "-"}; Dominant planets: ${(stock.natal_profile?.dominantPlanets || []).join(", ") || "-"}; Current multibagger state: ${stock.current_multibagger_probability || stock.multibagger_probability || "-"}; Cycle multibagger potential: ${stock.cycle_multibagger_potential || "-"}; Potential window: ${formatDatesInText(stock.cycle_potential_window || "-")}; Rotation / drawdown note: ${stock.expected_drawdown || "-"}`],
    ["Current astro signature", `${stock.environment_signature || "-"}; Cluster density: ${asScore(stock.cluster_density)}; Expansion score: ${asScore(stock.expansion_score)}; Pressure score: ${asScore(stock.pressure_score)}`],
    ["Transit Receptor Model", stock.transit_receptor_fit ? `${stock.transit_receptor_fit.transit?.family || "-"} → ${stock.transit_receptor_fit.expressionLabel || "-"}; score ${stock.transit_receptor_fit.scores?.expressionScore ?? "-"}; confidence ${stock.transit_receptor_fit.confidenceLabel || "-"}; sector ${stock.transit_receptor_fit.scores?.sectorThemeFit ?? "-"}; receptor ${stock.transit_receptor_fit.scores?.natalReceptorStrength ?? "-"}; pressure ${stock.transit_receptor_fit.scores?.pressureInterference ?? "-"}` : "-"],
    ["Transit Receptor Reading", stock.transit_receptor_fit?.reading || stock.transit_receptor_reading || "-"],
    ["Upcoming catalyst", stock?.decision_v35 ? `${catalystLine}. Proximity: ${catalystTiming}. Strength: ${stock.catalyst_strength || "-"}. Tactical capital meaning: ${stock.decision_v35.language?.tacticalTimingPath || stock.decision_v35.language?.timingPath || "No typed tactical gate mapped."}` : `${catalystLine} — ${catalystTiming}; Strength: ${stock.catalyst_strength || "-"}; Entry window: ${stock.current_window || "-"}`],
    ["Current natal contacts", contacts.length ? contacts.join(" | ") : "-"],
    ["Catalyst contacts", catalystContacts.length ? catalystContacts.join(" | ") : "-"]
  ];

  return (
    <div style={detailPanelStyle}>
      <div style={detailHeaderStyle}>
        <div>
          <div style={miniLabelStyle}>Expanded stock card</div>
          <h3 style={{ margin: 0 }}>{stock.name}</h3>
          <div style={smallMutedStyle}>Simple story first; tactical and strategic astrology separated below.</div>
        </div>
        <button onClick={onClose} style={closeButtonStyle}>Close</button>
      </div>

      <div style={decisionCardStyle}>
        <div style={detailHeaderStyle}>
          <div>
          <div style={miniLabelStyle}>{stock?.decision_v35 ? "v35.4 Astro Truth → Behaviour → Capital → Typed Bucket-Sovereign Timing" : "Legacy v34.13 Decision Path"}</div>
            <div style={{ fontSize: 21, fontWeight: 950, letterSpacing: 0.2 }}>{v34DecisionSummaryLabel(stock)}</div>
            <div style={smallMutedStyle}>Pure astro instruction: review dates come from astrology, not price confirmation.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={miniLabelStyle}>Registry</div>
            <div>{registryLine}</div>
          </div>
        </div>
        <ReratingRunwayBox runway={runway} />
        <div style={{ margin: "12px 0", padding: "12px 14px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 14, fontWeight: 800, lineHeight: 1.45 }}>
          {v34MainStory(stock)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 14, marginTop: 12 }}>
          <V34ViewCard title="Tactical View" horizon="30–45 days" rows={v34TacticalRows(stock)} />
          <V34ViewCard title="Strategic View" horizon="3–12/18 months" rows={v34StrategicRows(stock)} />
        </div>
        <details style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Decision summary fields</summary>
          <ReadableInfoTable rows={decisionRows} />
        </details>
      </div>

      <div style={pathGridStyle}>
        <PathTable
          title={stock?.decision_v35 ? "Tactical Timing Path — through next astro gate" : "Tactical Path — next 6 weeks"}
          subtitle={stock?.decision_v35 ? "Only real mapped astro gates; rerun at the next gate." : "Week-by-week path after the simplified tactical view."}
          rows={tacticalPathRows}
        />

        <PathTable
          title={stock?.decision_v35 ? "Strategic Timing Path — through next strategic gate" : "Strategic Path — next 9 months"}
          subtitle={stock?.decision_v35 ? "Strategic capital changes only at a strategic gate; tactical checks cannot override it." : "Month-by-month path for leadership durability, dormancy, and pressure management."}
          rows={strategicPathRows}
        />
      </div>

      <div style={scoreLegendPanelStyle}>
        <div style={miniLabelStyle}>Score legend</div>
        <ScoreLegend />
      </div>

      <details style={researchDetailsStyle}>
        <summary style={researchSummaryStyle}>Astro Research Details</summary>
        <ReadableInfoTable rows={researchRows} />
      </details>
    </div>
  );
}

function ReadableInfoTable({ rows }) {
  return (
    <table style={infoTableStyle}>
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={`${label}-${index}`}>
            <th style={infoThStyle}>{label}</th>
            <td style={infoTdStyle}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryBadge({ label, tone = "neutral" }) {
  const styles = {
    high: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
    moderate: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
    low: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" },
    pressure: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" },
    neutral: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }
  };

  return (
    <span style={{ ...miniBadgeStyle, ...(styles[tone] || styles.neutral) }}>
      {label || "-"}
    </span>
  );
}

function potentialTone(value) {
  const v = String(value || "").toUpperCase();
  if (["HIGH", "EXTREME"].includes(v)) return "high";
  if (v === "MODERATE") return "moderate";
  if (v === "LOW") return "low";
  return "neutral";
}

function pressureTone(value) {
  const v = String(value || "").toUpperCase();
  if (v.includes("HIGH") || v.includes("ELEVATED")) return "pressure";
  if (v.includes("MODERATE")) return "moderate";
  return "low";
}

function shortText(value, max = 130) {
  const text = String(value || "-");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function numericValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function strategicScoreValue(stock) {
  if (!stock?.computed_from_natal) {
    return null;
  }

  const forwardLeadership = parseForwardLeadership(stock);
  const currentLeadership = numericValue(stock.leadership_probability);
  const expansion = numericValue(stock.expansion_score);
  const pressure = numericValue(stock.pressure_score);
  const currentMB = String(stock.current_multibagger_probability || "").toUpperCase();
  const cycleMB = String(stock.cycle_multibagger_potential || stock.multibagger_probability || "").toUpperCase();
  const rotation = String(stock.expected_drawdown || "").toLowerCase();
  const confidence = String(stock.natal_confidence || "").toLowerCase();

  // Strategic Score is forward opportunity quality, not near-term deployability.
  // Near-term deployability belongs in Tactical Score / Tactical Action.
  let score = forwardLeadership !== null
    ? forwardLeadership / 10
    : (currentLeadership !== null ? currentLeadership / 10 : 5);

  if (cycleMB === "EXTREME") score += 0.45;
  if (cycleMB === "HIGH") score += 0.25;
  if (cycleMB === "LOW") score -= 0.35;
  if (currentMB === "EXTREME") score += 0.25;
  if (currentMB === "HIGH") score += 0.15;

  if (expansion !== null && pressure !== null) {
    // Strategic score should notice current pressure, but not let it erase a strong mapped future window.
    score += Math.max(-0.7, Math.min(0.6, (expansion - pressure) / 70));
  }

  if (rotation.includes("high")) score -= 0.35;
  if (rotation.includes("moderate")) score -= 0.1;
  if (rotation.includes("low")) score += 0.15;

  if (confidence === "high") score += 0.15;
  if (confidence === "low") score -= 0.2;

  return Math.max(1, Math.min(10, score));
}

function tacticalScoreValue(stock) {
  if (!stock?.computed_from_natal) {
    return null;
  }

  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const leadership = numericValue(stock.leadership_probability) ?? 50;
  const expansion = numericValue(stock.expansion_score) ?? 50;
  const pressure = numericValue(stock.pressure_score) ?? 50;
  const readiness = String(stock.catalyst_readiness || stock.current_window || "").toLowerCase();

  const actionBase = {
    "EXIT STRENGTH": 2.0,
    "REDUCE / EXIT": 2.0,
    "HEAVY TRIM": 2.8,
    "TRIM SATELLITE": 3.8,
    "WATCH CLOSELY": 5.0,
    "HOLD CORE / NO FRESH": 5.2,
    "NO FRESH ENTRY": 5.2,
    "HOLD CORE": 5.8,
    "STAGGER ADD": 6.6,
    "ACCUMULATE": 7.8,
    "AGGRESSIVE ACCUMULATION": 9.0
  }[action] ?? 5.0;

  let score = actionBase;
  score += (expansion - pressure) / 45;
  score += (leadership - 55) / 55;

  if (readiness.includes("active") || readiness.includes("near")) score += 0.3;
  if (readiness.includes("prepare")) score += 0.1;

  return Math.max(1, Math.min(10, score));
}

function scoreMeaning(value) {
  const n = numericValue(value);
  if (n === null) return "Not scored";
  if (n < 3) return "Avoid / protect capital";
  if (n < 5) return "Weak setup; only watch";
  if (n < 6) return "Neutral / tactical only";
  if (n < 7) return "Usable, not priority";
  if (n < 8) return "Good candidate";
  if (n < 9) return "Strong leadership candidate";
  if (n < 10) return "Rare high-conviction rerating";
  return "Exceptional alignment";
}

function formatScore(value) {
  const n = numericValue(value);
  if (n === null) return "-";
  return `${n.toFixed(1)}/10 · ${scoreMeaning(n)}`;
}

function strategicScore(stock) {
  return formatScore(strategicScoreValue(stock));
}

function tacticalScore(stock) {
  return formatScore(tacticalScoreValue(stock));
}

function leadershipBand(value) {
  const n = numericValue(value);
  if (n === null) return "Not scored";
  if (n >= 75) return "Strong";
  if (n >= 60) return "Developing";
  if (n >= 45) return "Mixed";
  return "Weak";
}

function leadershipLabel(value) {
  const n = numericValue(value);
  if (n === null) return "-";
  return `${n} · ${leadershipBand(n)}`;
}

function tacticalLeadershipLabel(stock) {
  const n = numericValue(stock?.leadership_probability);
  if (n === null) return "-";
  return `${n}/100 · ${leadershipBand(n)} current catalyst`;
}

function parseForwardLeadership(stock) {
  const candidates = [
    stock?.cycle_potential_window,
    stock?.view_2026_28,
    stock?.cycle_potential_note,
    stock?.strategic_window,
    stock?.best_window
  ].filter(Boolean).map(String);

  for (const text of candidates) {
    const match = text.match(/leadership\s*([0-9]{1,3})/i);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }
  }

  return null;
}

function strategicLeadershipLabel(stock) {
  if (stock?.decision_v35) {
    const n = numericValue(stock.decision_v35.astroTruth?.strategicLeadership);
    if (n === null) return "-";
    const date = stock.decision_v35.astroTruth?.strategicLeadershipDate;
    return `${n}/100 · ${leadershipBand(n)} strategic horizon${date ? ` · mapped ${formatDateReadable(date)}` : ""}`;
  }
  const forwardLeadership = parseForwardLeadership(stock);
  if (forwardLeadership !== null) {
    return `${forwardLeadership}/100 · ${leadershipBand(forwardLeadership)} forward window`;
  }

  const score = strategicScoreValue(stock);
  if (score === null) return "-";
  const implied = Math.round(score * 10);
  return `${implied}/100 · ${leadershipBand(implied)} strategic field`;
}

function bestWindowText(stock) {
  return formatDatesInText(stock?.cycle_potential_window || stock?.recovery_window || stock?.phase_fit || "-");
}

function accumulationReviewWindowText(stock) {
  const window = bestWindowText(stock);
  if (!window || window === "-") return "No accumulation/review window mapped yet.";
  const forward = parseForwardLeadership(stock);
  const score = strategicScoreValue(stock);
  const lead = forward !== null ? forward : numericValue(stock?.leadership_probability);
  const prefix = lead !== null && lead < 60 ? "Earliest review window" : "Accumulation window opens";
  const caution = lead !== null && lead < 60
    ? ` Leadership is only ${Math.round(lead)}/100, so this is a review date, not a growth signal.`
    : score !== null && score < 7
      ? " Treat as selective accumulation after catalyst absorption."
      : " Use staggered deployment; this is not an all-in signal.";
  return formatDatesInText(`${prefix}: ${window}.${caution}`);
}

function reratingGrowthWindowText(stock) {
  const runway = reratingRunwayObserver(stock);
  const window = bestWindowText(stock);
  const forward = parseForwardLeadership(stock);
  const tactical = tacticalScoreValue(stock);
  const strategic = strategicScoreValue(stock);
  const dormancy = capitalDormancyRiskValue(stock);
  const pressure = pressureRoutingState(stock).severity;

  if (runway?.tone === "teal") {
    return formatDatesInText(`Near-window rerating/growth window: ${window}. Leadership ${forward ?? numericValue(stock?.leadership_probability) ?? "-"}/100; ${pressure.label.toLowerCase()} is manageable; dormancy ${String(dormancy).toLowerCase()}.`);
  }
  if (runway?.tone === "grey") {
    const activeTactical = (tactical ?? 0) >= 7 && dormancy === "LOW";
    return formatDatesInText(activeTactical
      ? `Cycle watch, not full rerating yet: ${window}. Tactical participation is active, but the larger rerating runway remains conditional until the mapped cycle gate.`
      : `Cycle watch, not active rerating: ${window}. Potential exists, but deployment still waits for stronger mapped astro support.`);
  }
  if ((forward ?? 0) >= 70 && (strategic ?? 0) >= 7.2 && (tactical ?? 0) >= 6.2 && !["HIGH", "VERY HIGH"].includes(dormancy)) {
    return formatDatesInText(`Possible forward growth window: ${window}. Needs stronger near-window astro before becoming a rerating candidate.`);
  }
  return "No confirmed rerating/growth window yet.";
}

function v35GateRoleLabel(role) {
  const labels = {
    PRESSURE_CHECK: "Pressure check",
    EXPANSION_REVIEW: "Expansion review",
    CATALYST_REVIEW: "Catalyst review",
    REENTRY_REVIEW: "Re-entry review",
    STRATEGIC_BUILD_REVIEW: "Strategic build review",
    FULL_BUILD_UPGRADE_REVIEW: "Full-build upgrade review",
    STRATEGIC_PROTECTION_REVIEW: "Strategic protection review"
  };
  return labels[role] || String(role || "Astro gate").replaceAll("_", " ").toLowerCase();
}

function v35GateSummary(gate, { includeExpectedBehaviour = false } = {}) {
  if (!gate) return "No mapped astro gate.";
  const role = v35GateRoleLabel(gate.role);
  const label = gate.label ? ` — ${gate.label}` : "";
  const reading = gate.astroReading
    ? ` Astro reading: ${gate.astroReading}`
    : gate.signalClass
      ? ` Mapped type: ${String(gate.signalClass).replaceAll("_", " ")}.`
      : "";
  const expected = includeExpectedBehaviour && gate.expectedBehaviour
    ? ` Expected stock expression: ${gate.expectedBehaviour}`
    : "";
  const instruction = gate.whatChanges
    ? ` Capital instruction: ${String(gate.whatChanges).replaceAll("_", " ")}.`
    : "";
  return formatDatesInText(`${role}: ${gate.date}${label}.${reading}${expected}${instruction}`);
}

function v35TacticalContinuityText(stock) {
  const v35 = stock?.decision_v35;
  const gate = v35?.timingPath?.tacticalGate || v35?.timingPath?.nextGate || null;
  const capital = v35?.language?.capital || {};
  if (!gate) return `Fresh tactical capital remains ${capital.freshTacticalCapital || "NO FRESH"}; no later tactical gate is mapped.`;
  const shared = gate.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC";
  return formatDatesInText(`Until ${gate.date}: keep ${capital.freshTacticalCapital || "NO FRESH"}. At the gate, rerun ${shared ? "the tactical and strategic buckets together" : "the tactical bucket only"}; do not wait for price behaviour to define the astrology.`);
}

function v35StrategicContinuityText(stock) {
  const v35 = stock?.decision_v35;
  const gate = v35?.timingPath?.strategicGate || null;
  const capital = v35?.language?.capital || {};
  if (!gate) return `Strategic capital remains ${capital.strategicCapital || "WAIT"}; no later strategic decision gate is mapped.`;
  const shared = gate.capitalBucket === "FRESH_TACTICAL_AND_STRATEGIC";
  return formatDatesInText(`Until ${gate.date}: strategic capital remains ${capital.strategicCapital || "WAIT"}. At the gate, rerun ${shared ? "the tactical and strategic buckets together" : "the strategic bucket only"}.`);
}

function pressureWindowText(stock) {
  if (stock?.decision_v35) {
    const gate = stock.decision_v35?.timingPath?.tacticalGate || stock.decision_v35?.timingPath?.nextGate;
    if (!gate) return "No next pressure or catalyst gate is mapped; keep the present decision primary.";
    return v35GateSummary(gate, { includeExpectedBehaviour: true });
  }
  const catalystLine = stock?.catalyst_label || stock?.next_event || "Current catalyst";
  const readiness = stock?.catalyst_readiness || stock?.current_window || stock?.next_pressure || stock?.current_pressure || "Prepare";
  const timing = readableEventTiming({
    date: stock?.catalyst_date,
    days: stock?.days_to_event ?? stock?.next_ignition,
    phase: readiness,
    includeShadow: /eclipse|rahu|ketu|shadow/i.test([catalystLine, readiness, stock?.environment_signature].join(" "))
  });
  const sev = pressureSeverityFromState({ ...stockPressureExpansionState(stock), expression: String(stock?.current_pressure || stock?.currentRegime || stock?.regime || "") }, stock);
  return formatDatesInText(`${sev.label}: ${catalystLine} — ${timing}`);
}

function strategicGateText(stock) {
  if (!stock?.decision_v35) return v34StrategicPressureWindow(stock);
  const v35 = stock.decision_v35;
  const gate = v35.timingPath?.strategicGate || null;
  if (!gate) {
    if (v35.capitalDecision?.strategicCapital === "FULL_BUILD") {
      return "No strategic protection/break gate is mapped. FULL BUILD remains active; tactical pressure checks do not pause or revoke it.";
    }
    return v35.language?.strategicTimingPath || "No later strategic decision gate is mapped; keep the present strategic decision primary.";
  }
  return v35GateSummary(gate, { includeExpectedBehaviour: true });
}


function pressureGateDateText(stock) {
  const iso = extractFirstIsoDate(stock?.catalyst_date) || isoFromDaysAhead(stock?.days_to_event ?? stock?.next_ignition);
  return iso ? formatDateReadable(iso) : stockWindowDateText(pressureWindowText(stock));
}

function actionDateWindowRaw(stock) {
  return stock?.cycle_potential_window || stock?.recovery_window || stock?.phase_fit || stock?.best_window || "";
}

function actionDateStatus(rawWindow) {
  const days = daysUntilDate(rawWindow);
  const dateText = stockWindowDateText(rawWindow);
  if (!rawWindow || rawWindow === "-" || dateText === "mapped window") return "No date mapped";
  if (days === null) return dateText;
  if (days < -14) return `Past · ${dateText}`;
  if (days <= 0) return `Open now · ${dateText}`;
  if (days <= 45) return `Near · ${dateText}`;
  return `Ahead · ${dateText}`;
}

function actionDateForStock(stock) {
  if (!stock?.computed_from_natal) {
    return { label: "Natal data", date: "Pending", note: "Add natal chart" };
  }

  if (stock?.decision_v35) {
    const v35 = stock.decision_v35;
    const gate = v35.timingPath?.nextGate;
    const active = ["STAGGER_ADD", "PART_SIZED_ONLY"].includes(v35.capitalDecision?.freshTacticalCapital);
    if (active) return { label: "Active now", date: gate ? `Next: ${String(gate.role).replaceAll("_", " ")} · ${formatDateReadable(gate.date)}` : "No later gate mapped", note: "Staged deployment" };
    if (gate) return { label: String(gate.role).replaceAll("_", " "), date: formatDateReadable(gate.date), note: String(gate.capitalBucket).replaceAll("_", " ") };
    return { label: "Current decision", date: "No later gate mapped", note: "Keep present posture" };
  }

  const tactical = v347TacticalDecision(stock);
  const strategic = v347StrategicDecision(stock);
  const rawBest = actionDateWindowRaw(stock);
  const bestStatus = actionDateStatus(rawBest);
  const pressureText = pressureGateDateText(stock);

  if (tactical.kind === "break-protect") {
    return { label: "Break-risk", date: pressureText, note: "Hard pressure" };
  }

  if (tactical.kind === "pressure-watch" || strategic.label === "PROTECT") {
    return { label: "Protection", date: pressureText, note: "Nearest pressure gate" };
  }

  if (tactical.kind === "strong-active" || tactical.kind === "active") {
    return { label: "Expansion", date: bestStatus, note: "Part-sized add" };
  }

  if (strategic.label === "WAIT" || tactical.kind === "future-review" || tactical.kind === "watch") {
    return { label: "Review", date: bestStatus, note: "No action today" };
  }

  if (strategic.label === "PART BUILD" || strategic.label === "FULL BUILD") {
    return { label: "Strategic", date: bestStatus, note: strategic.label };
  }

  return { label: "Review", date: bestStatus, note: "No action today" };
}

function tacticalActionText(stock) {
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const readiness = stock?.catalyst_readiness || stock?.current_window || "";

  const map = {
    "EXIT STRENGTH": "Exit into strength only when hard pressure is active; capital protection first.",
    "REDUCE / EXIT": "Exit into strength only when hard pressure is active; capital protection first.",
    "HEAVY TRIM": "Reduce meaningfully; do not add until pressure repairs.",
    "TRIM SATELLITE": "Use rallies to reduce heat; avoid fresh chase.",
    "WATCH CLOSELY": "Use the mapped catalyst-absorption gate; keep position size disciplined.",
    "HOLD CORE": "Hold existing core through normal volatility.",
    "STAGGER ADD": "Begin slowly; add in parts around pressure or catalyst confirmation.",
    "ACCUMULATE": "Add meaningfully if position sizing and risk allow.",
    "AGGRESSIVE ACCUMULATION": "Priority setup; deploy aggressively on dips."
  };

  const base = map[action] || "Monitor catalyst response.";
  return readiness && readiness !== "-" ? `${base} Window: ${readiness}.` : base;
}

function strategicActionText(stock) {
  if (!stock?.computed_from_natal) {
    return "Add natal data before strategic reading.";
  }

  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const phase = cycleStageLabel(stock?.phase_fit || stock?.recovery_window || "Unclear / Watch");
  const best = bestWindowText(stock);
  const forward = parseForwardLeadership(stock);
  const tactical = tacticalScoreValue(stock);
  const timing = mappedWindowTimingLabel(stock);
  const nearDeploy = hasNearTermDeploymentSignal(stock);
  const pressureAction = ["EXIT STRENGTH", "REDUCE / EXIT", "HEAVY TRIM", "TRIM SATELLITE"].includes(action);
  const weakNow = tactical !== null && tactical < 5;
  const selectiveNow = tactical !== null && tactical < 7;
  const distant = timing === "distant" || timing === "later this cycle";

  if (forward !== null && forward >= 85 && (timing === "current/near" || timing === "within 6 months" || nearDeploy)) {
    return formatDatesInText(`PRIORITY LEADER — mapped window ${best}.`);
  }

  if (forward !== null && forward >= 75 && (timing === "current/near" || timing === "within 6 months" || timing === "within 8 months" || nearDeploy) && !weakNow) {
    return formatDatesInText(`STRONG FORWARD LEADER — mapped window ${best}.`);
  }

  if (forward !== null && forward >= 75 && pressureAction) {
    return formatDatesInText(`PRESSURE FIRST — reassess near ${best}.`);
  }

  if (forward !== null && forward >= 75 && weakNow) {
    return formatDatesInText(`LOW LEADERSHIP NOW — mapped window ${best}.`);
  }

  if (forward !== null && forward >= 75 && (selectiveNow || distant)) {
    return formatDatesInText(`DEFERRED LEADER — use mapped window ${best}.`);
  }

  if (forward !== null && forward >= 70) {
    return formatDatesInText(`STRATEGIC CANDIDATE — mapped window ${best}.`);
  }

  if (pressureAction) {
    return formatDatesInText(`CAPITAL PROTECTION — no clean leadership before ${best}.`);
  }

  if (["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(action)) {
    return formatDatesInText(`${phase}: build position only around mapped window ${best}.`);
  }

  return formatDatesInText(`${phase}: strategic watch. Forward window: ${best}.`);
}

function broadViewText(stock, { full = false } = {}) {
  if (!stock?.computed_from_natal) {
    return "Natal chart pending; stock-specific response is not inferred.";
  }
  if (stock?.decision_v35) {
    const text = `${stock.decision_v35.language?.astroSummary || ""} ${stock.decision_v35.language?.strategicNote || ""} Tactical: ${stock.decision_v35.language?.tacticalTimingPath || stock.decision_v35.language?.timingPath || ""} Strategic: ${stock.decision_v35.language?.strategicTimingPath || ""}`.trim();
    return full ? text : shortText(text, 145);
  }

  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");
  const phase = stock?.phase_fit || "Unclear";
  const rotation = stock?.expected_drawdown ? ` Rotation risk: ${stock.expected_drawdown}.` : "";
  const note = formatDatesInText(stock?.cycle_potential_note || stock?.view_2026_28 || "");

  if (note) {
    return full ? note : shortText(note, 145);
  }

  const fallback = formatDatesInText(`${action}. ${phase}.${rotation}`);
  return full ? fallback : shortText(fallback, 145);
}


function firstNumber(value) {
  const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function catalystDaysValue(stock) {
  const readiness = String(stock?.catalyst_readiness || stock?.current_window || "").toLowerCase();
  if (readiness.includes("active")) return 0;

  const timing = stock?.next_ignition || stock?.days_to_event || stock?.catalyst_timing || "";
  const number = firstNumber(timing);
  if (number !== null) return Math.max(0, number);

  return 9999;
}

function pressureWindowDaysValue(stock) {
  const direct = daysUntilDate(stock?.production_protection_date || stock?.catalyst_date || "");
  if (direct !== null) return Math.max(0, direct);

  const number = firstNumber(stock?.days_to_event ?? stock?.next_ignition ?? stock?.catalyst_timing ?? "");
  if (number !== null) return Math.max(0, number);

  return null;
}

function mappedWindowDaysValue(stock) {
  const bestRaw = stock?.cycle_potential_window || stock?.recovery_window || stock?.phase_fit || stock?.best_window || "";
  const days = daysUntilDate(bestRaw);
  return days === null ? 9999 : Math.max(0, days);
}

function stockRegistryGroup(stock) {
  if (!stock?.computed_from_natal) return "NATAL_PENDING";
  if (isCoreLocked(stock)) return "CORE";
  return "USER";
}

function matchesTableFilter(stock, filter) {
  const action = normalizeActionLabel(stock?.action || "WATCH CLOSELY");

  if (filter === "ADD") {
    return ["STAGGER ADD", "ACCUMULATE", "AGGRESSIVE ACCUMULATION"].includes(action);
  }

  if (filter === "WATCH_TRIM") {
    return ["WATCH CLOSELY", "HOLD CORE / NO FRESH", "NO FRESH ENTRY", "TRIM SATELLITE", "HEAVY TRIM", "EXIT STRENGTH", "REDUCE / EXIT"].includes(action);
  }

  if (filter === "HOLD") {
    return action === "HOLD CORE";
  }

  if (filter === "LEADERS") {
    return (strategicScoreValue(stock) ?? 0) >= 8;
  }

  if (filter === "TACTICAL_NOW") {
    return (tacticalScoreValue(stock) ?? 0) >= 7;
  }

  return true;
}

function matchesRegistryFilter(stock, filter) {
  if (filter === "ALL") return true;
  return stockRegistryGroup(stock) === filter;
}

function filterAndSortStocks(stocks, { tableFilter, tableSort, registryFilter }) {
  const filtered = [...stocks].filter(stock =>
    matchesTableFilter(stock, tableFilter) && matchesRegistryFilter(stock, registryFilter)
  );

  const sorters = {
    NAME_ASC: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
    STRATEGIC_DESC: (a, b) => (strategicScoreValue(b) ?? -1) - (strategicScoreValue(a) ?? -1),
    TACTICAL_DESC: (a, b) => (tacticalScoreValue(b) ?? -1) - (tacticalScoreValue(a) ?? -1),
    CATALYST_ASC: (a, b) => catalystDaysValue(a) - catalystDaysValue(b),
    WINDOW_ASC: (a, b) => mappedWindowDaysValue(a) - mappedWindowDaysValue(b),
    PRESSURE_FIRST: (a, b) => {
      const order = { "EXIT STRENGTH": 0, "REDUCE / EXIT": 0, "HEAVY TRIM": 1, "TRIM SATELLITE": 2, "WATCH CLOSELY": 3, "HOLD CORE / NO FRESH": 4, "NO FRESH ENTRY": 4, "HOLD CORE": 5, "HOLD WINNER": 6, "STAGGER ADD": 7, "ACCUMULATE": 8, "AGGRESSIVE ACCUMULATION": 9 };
      return (order[normalizeActionLabel(a?.action)] ?? 9) - (order[normalizeActionLabel(b?.action)] ?? 9);
    }
  };

  return filtered.sort(sorters[tableSort] || sorters.NAME_ASC);
}


function PriorityPanels({ stocks, onSelectStock, setTableFilter, setTableSort }) {
  const computed = Array.isArray(stocks) ? stocks.filter(stock => stock?.computed_from_natal) : [];
  const bucketed = computed.map(stock => ({ stock, decision: finalStockDecision(stock) }));
  const byBucket = bucket => bucketed.filter(item => item.decision.primaryBucket === bucket).map(item => item.stock);

  const topTactical = byBucket("TACTICAL")
    .sort((a, b) => (tacticalScoreValue(b) ?? 0) - (tacticalScoreValue(a) ?? 0))
    .slice(0, 4);
  const topStrategic = byBucket("STRATEGIC").concat(byBucket("CONDITIONAL"))
    .sort((a, b) => (strategicScoreValue(b) ?? 0) - (strategicScoreValue(a) ?? 0))
    .slice(0, 4);
  const dormancyWatch = byBucket("DORMANT").concat(byBucket("TACTICAL_MANAGED"))
    .sort((a, b) => (strategicScoreValue(b) ?? 0) - (strategicScoreValue(a) ?? 0))
    .slice(0, 4);
  const pressureWatch = byBucket("PRESSURE")
    .sort((a, b) => (tacticalScoreValue(a) ?? 10) - (tacticalScoreValue(b) ?? 10))
    .slice(0, 4);
  const freshCapital = computed
    .filter(stock => ["LOW", "MODERATE"].includes(capitalDormancyRiskValue(stock)) && finalStockDecision(stock).primaryBucket === "TACTICAL")
    .sort((a, b) => (tacticalScoreValue(b) ?? 0) - (tacticalScoreValue(a) ?? 0))
    .slice(0, 4);

  const panels = [
    {
      title: "Clean tactical add candidates",
      note: "Current add candidates after capital gates",
      items: topTactical,
      onClick: () => { setTableFilter?.("TACTICAL_NOW"); setTableSort?.("TACTICAL_DESC"); }
    },
    {
      title: "Forward leadership candidates",
      note: "Leadership quality; still respect capital gates",
      items: topStrategic,
      onClick: () => { setTableFilter?.("LEADERS"); setTableSort?.("STRATEGIC_DESC"); }
    },
    {
      title: "Tactical-only / future gates",
      note: "Active names where strategic/passive capital is not approved",
      items: dormancyWatch,
      onClick: () => { setTableFilter?.("ALL"); setTableSort?.("WINDOW_ASC"); }
    },
    {
      title: "Pressure / trim gates",
      note: "Known pressure gates and defensive windows",
      items: pressureWatch,
      onClick: () => { setTableFilter?.("WATCH_TRIM"); setTableSort?.("PRESSURE_FIRST"); }
    },
    {
      title: "Fresh capital candidates",
      note: "Low dormancy plus deployable action",
      items: freshCapital,
      onClick: () => { setTableFilter?.("ADD"); setTableSort?.("TACTICAL_DESC"); }
    }
  ];

  return (
    <div style={priorityPanelWrapStyle}>
      {panels.map(panel => (
        <div key={panel.title} style={priorityCardStyle}>
          <button type="button" onClick={panel.onClick} style={priorityTitleButtonStyle}>
            {panel.title}
          </button>
          <div style={smallMutedStyle}>{panel.note}</div>
          <div style={priorityListStyle}>
            {panel.items.length ? panel.items.map(stock => (
              <button
                key={`${panel.title}-${stockKey(stock)}`}
                type="button"
                onClick={() => onSelectStock?.(String(stockKey(stock)))}
                style={priorityItemStyle}
              >
                <strong>{stock.name}</strong>
                <span>{formatScore(panel.title.includes("tactical") ? tacticalScoreValue(stock) : strategicScoreValue(stock))}</span>
                <small style={smallMutedStyle}>{shortText(finalStockDecision(stock).mainLabel, 70)}</small>
              </button>
            )) : <span style={smallMutedStyle}>No current matches.</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableControls({ totalCount, visibleCount, tableFilter, setTableFilter, tableSort, setTableSort, registryFilter, setRegistryFilter }) {
  return (
    <div style={filterPanelStyle}>
      <div>
        <strong>Scanner Filters</strong>
        <div style={smallMutedStyle}>{visibleCount} of {totalCount} stocks shown</div>
      </div>

      <label style={filterLabelStyle}>
        Action view
        <select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} style={filterSelectStyle}>
          <option value="ALL">All actions</option>
          <option value="ADD">Add / Accumulate only</option>
          <option value="WATCH_TRIM">Pressure / Trim / Exit only</option>
          <option value="HOLD">Hold Core only</option>
          <option value="LEADERS">Strategic leaders only</option>
          <option value="TACTICAL_NOW">Tactical opportunities now</option>
        </select>
      </label>

      <label style={filterLabelStyle}>
        Sort by
        <select value={tableSort} onChange={(event) => setTableSort(event.target.value)} style={filterSelectStyle}>
          <option value="NAME_ASC">Stock name</option>
          <option value="STRATEGIC_DESC">Strategic Score — high to low</option>
          <option value="TACTICAL_DESC">Tactical Score — high to low</option>
          <option value="CATALYST_ASC">Nearest catalyst</option>
          <option value="WINDOW_ASC">Mapped future window</option>
          <option value="PRESSURE_FIRST">Pressure / trim first</option>
        </select>
      </label>

      <label style={filterLabelStyle}>
        Registry
        <select value={registryFilter} onChange={(event) => setRegistryFilter(event.target.value)} style={filterSelectStyle}>
          <option value="ALL">All registry states</option>
          <option value="CORE">Core locked</option>
          <option value="USER">User added</option>
          <option value="NATAL_PENDING">Natal pending</option>
        </select>
      </label>
    </div>
  );
}

function StockTable({ stocks, researchView, selectedStock, onSelectStock }) {
  const simpleHeaders = [
    "Stock",
    "Regime",
    "Tactical Leadership",
    "Tactical Score /10",
    "Tactical Action",
    "Date",
    "Cycle / Rerating Potential",
    "Correction Mode",
    "Strategic Leadership",
    "Strategic Score /10",
    "Strategic Action"
  ];

  const researchHeaders = [
    "Stock",
    "Natal Type",
    "Catalyst Window",
    "Expected Response",
    "Regime",
    "Tactical Leadership",
    "Tactical Score /10",
    "Tactical Action",
    "Action Bucket",
    "Date",
    "Cycle / Rerating Potential",
    "Dormancy Risk",
    "Correction Mode",
    "Strategic Leadership",
    "Strategic Score /10",
    "Strategic Action"
  ];

  return (
    <div style={tableScrollStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {(researchView ? researchHeaders : simpleHeaders).map(header => (
              <th key={header} style={thStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map(stock => {
            const selected = String(stockKey(stock)) === String(selectedStock);
            const cyclePotential = stock.cycle_multibagger_potential || stock.multibagger_probability || "-";
            const currentPotential = stock.current_multibagger_probability || "-";
            const regime = stock.current_regime_label || stock.current_regime || stock.current_pressure || "-";
            const catalystLine = stock.catalyst_label || stock.next_event || "-";
            const timing = stock.next_ignition || stock.days_to_event || "-";
            const phase = cycleStageLabel(stock.phase_fit || stock.recovery_window || "-");
            const locked = isCoreLocked(stock);
            const actionDate = actionDateForStock(stock);
            const decision = finalStockDecision(stock);

            const stockCell = (
              <td style={{ ...tdStyle, minWidth: 105, maxWidth: 115 }}>
                <strong>{stock.name}</strong>
                <br />
                <span style={smallMutedStyle}>{String(stock.natal_confidence || "-").toUpperCase()} · {locked ? "locked" : "editable"}</span>
              </td>
            );

            const regimeCell = (
              <td style={{ ...tdStyle, minWidth: 78, maxWidth: 90 }}>
                <SummaryBadge label={regime} tone={pressureTone(stock.current_pressure)} />
              </td>
            );

            const tacticalLeadershipCell = (
              <td style={{ ...tdStyle, minWidth: 112, maxWidth: 128, fontWeight: "bold", color: stock.leadership_probability >= 75 ? "#16a34a" : stock.leadership_probability < 45 ? "#dc2626" : "#111827" }}>
                {tacticalLeadershipLabel(stock)}
              </td>
            );

            const tacticalScoreCell = (
              <td style={{ ...tdStyle, minWidth: 110, maxWidth: 125, fontWeight: "bold" }}>
                {tacticalScore(stock)}
              </td>
            );

            const simpleTactical = v347TacticalDecision(stock);
            const simpleStrategic = v347StrategicDecision(stock);

            const tacticalActionCell = (
              <td style={{ ...tdStyle, minWidth: researchView ? 135 : 150, maxWidth: researchView ? 155 : 170 }}>
                {researchView ? (
                  <div style={cellClampStyle}>{shortText(decision.tacticalAction, 115)}</div>
                ) : (
                  <div title={simpleTactical.posture}>
                    <ActionBadge action={simpleTactical.action} compact />
                    <br />
                    <span style={smallMutedStyle}>{shortText(simpleTactical.posture, 70)}</span>
                  </div>
                )}
              </td>
            );

            const dateCell = (
              <td style={{ ...tdStyle, minWidth: 115, maxWidth: 135 }}>
                <strong>{actionDate.label}</strong>
                <br />
                <span style={smallMutedStyle}>{formatDatesInText(actionDate.date)}</span>
              </td>
            );

            const cycleCell = (
              <td style={{ ...tdStyle, minWidth: 125, maxWidth: 140 }}>
                {stock?.decision_v35 ? (
                  <>
                    <strong>{String(stock.decision_v35.behaviour?.state || "SELECTIVE").replaceAll("_", " ")}</strong>
                    <br />
                    <span style={smallMutedStyle}>Runway: {cyclePotential} ({stock.cycle_potential_score ?? "-"}/100) · confidence {stock.cycle_potential_confidence ?? "-"}/100</span>
                  </>
                ) : (
                  <>
                    <strong>{phase}</strong>
                    <br />
                    <span style={smallMutedStyle}>Current: {currentPotential} · Cycle: {cyclePotential}</span>
                  </>
                )}
              </td>
            );

            const correctionCell = (
              <td style={{ ...tdStyle, minWidth: 112, maxWidth: 130 }}>
                <SummaryBadge label={correctionModeValue(stock)} tone={correctionTone(correctionModeValue(stock))} />
              </td>
            );

            const strategicLeadershipCell = (
              <td style={{ ...tdStyle, minWidth: 118, maxWidth: 135, fontWeight: "bold" }}>
                {strategicLeadershipLabel(stock)}
              </td>
            );

            const strategicScoreCell = (
              <td style={{ ...tdStyle, minWidth: 112, maxWidth: 128, fontWeight: "bold" }}>
                {strategicScore(stock)}
              </td>
            );

            const strategicActionCell = (
              <td style={{ ...tdStyle, minWidth: researchView ? 145 : 150, maxWidth: researchView ? 165 : 170 }}>
                {researchView ? (
                  <div title={finalStockDecision(stock).strategicAction} style={cellClampStyle}>{strategicActionCompact(decision.strategicAction, stock)}</div>
                ) : (
                  <div title={simpleStrategic.meaning} style={cellClampStyle}>
                    <span style={strategicChipStyle}>{simpleStrategic.label}</span>
                    <br />
                    <span style={smallMutedStyle}>{shortText(simpleStrategic.meaning, 72)}</span>
                  </div>
                )}
              </td>
            );

            return (
              <tr
                key={stockKey(stock)}
                onClick={() => onSelectStock?.(String(stockKey(stock)))}
                title="Click row for Fin-Lumen expanded stock card"
                style={{ cursor: "pointer", background: selected ? "#fff7ed" : "white" }}
              >
                {stockCell}
                {researchView ? (
                  <>
                    <td style={{ ...tdStyle, minWidth: 110, maxWidth: 125 }}><div style={cellClampStyle}>{stock.structural_cycle || "-"}</div></td>
                    <td style={{ ...tdStyle, minWidth: 125, maxWidth: 140 }}>
                      <strong>{formatDatesInText(catalystLine)}</strong>
                      <br />
                      <span style={smallMutedStyle}>{stock.catalyst_readiness || stock.current_window || "-"} · {formatDatesInText(timing)}</span>
                    </td>
                    <td style={{ ...tdStyle, minWidth: 145, maxWidth: 165 }}>
                      <div style={cellClampStyle}>{shortText(formatDatesInText(stock.catalyst_response || stock.expected_behaviour), 120)}</div>
                    </td>
                    {regimeCell}
                    {tacticalLeadershipCell}
                    {tacticalScoreCell}
                    {tacticalActionCell}
                    <td style={{ ...tdStyle, minWidth: 105, maxWidth: 115, textAlign: "center" }}>
                      <ActionBadge action={resolvedActionParts(stock).tacticalBucket || normalizeActionLabel(decision.tacticalAction)} compact />
                    </td>
                    {dateCell}
                    {cycleCell}
                    <td style={{ ...tdStyle, minWidth: 92, maxWidth: 105 }}>
                      <SummaryBadge label={dormancyRiskText(stock)} tone={dormancyTone(dormancyRiskText(stock))} />
                    </td>
                    {correctionCell}
                    {strategicLeadershipCell}
                    {strategicScoreCell}
                    {strategicActionCell}
                  </>
                ) : (
                  <>
                    {regimeCell}
                    {tacticalLeadershipCell}
                    {tacticalScoreCell}
                    {tacticalActionCell}
                    {dateCell}
                    {cycleCell}
                    {correctionCell}
                    {strategicLeadershipCell}
                    {strategicScoreCell}
                    {strategicActionCell}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}




const miniBadgeStyle = {
  display: "inline-block",
  borderRadius: 999,
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: 12,
  whiteSpace: "nowrap"
};

const readableCardStyle = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  lineHeight: 1.45,
  color: "#111827",
  border: "1px solid rgba(0,0,0,0.06)"
};

const miniLabelStyle = {
  textTransform: "uppercase",
  letterSpacing: 0.4,
  fontSize: 11,
  color: "#4b5563",
  marginBottom: 4,
  fontWeight: "bold"
};

const smallMutedStyle = {
  marginTop: 4,
  color: "#4b5563",
  fontSize: 13
};

const compactSkyStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
  padding: 12,
  background: "rgba(255,255,255,0.75)",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 14
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12
};

const insightBoxStyle = {
  padding: 12,
  borderRadius: 10,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  lineHeight: 1.5
};

const miniEventListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 8
};

const timelineStyle = {
  marginTop: 10,
  display: "grid",
  rowGap: 12
};

const timelineItemStyle = {
  display: "grid",
  gridTemplateColumns: "14px 1fr",
  gap: 10,
  alignItems: "start",
  padding: 10,
  borderRadius: 10,
  background: "#fff",
  border: "1px solid #e5e7eb"
};

const timelineDotStyle = color => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: color,
  marginTop: 6
});

const macroHeadlineStyle = {
  fontSize: 18,
  fontWeight: "bold",
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.65)",
  border: "1px solid #e5e7eb"
};

const scoreStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10,
  padding: 12,
  background: "rgba(255,255,255,0.75)",
  border: "1px solid #e5e7eb",
  borderRadius: 10
};

const macroEventCardStyle = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  lineHeight: 1.45,
  color: "#111827"
};


const analyticsBoxStyle = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  lineHeight: 1.55,
  background: "#ecfeff",
  borderLeft: "5px solid #06b6d4"
};

const stableBoxStyle = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  background: "#f3f4f6",
  borderLeft: "5px solid #9ca3af"
};

const metadataStyle = {
  marginTop: 8,
  fontSize: 12,
  color: "#6b7280",
  borderTop: "1px solid #e5e7eb",
  paddingTop: 8
};

const pageStyle = {
  padding: 20,
  background: "#e5e7eb",
  minHeight: "100vh",
  color: "#111827",
  fontFamily: "Arial"
};

const controlStyle = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap: "wrap"
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111827",
  minWidth: 220
};

const buttonStyle = background => ({
  padding: "10px 16px",
  background,
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: background === "#9ca3af" ? "not-allowed" : "pointer"
});

const macroGridStyle = {
  display: "flex",
  gap: 20,
  marginBottom: 20,
  flexWrap: "wrap"
};

const cardStyle = background => ({
  flex: 1,
  minWidth: 420,
  background,
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
});

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: 15,
  fontSize: 22
};

const lineGridStyle = {
  display: "grid",
  rowGap: 12,
  fontSize: 16,
  lineHeight: 1.6
};

const skyBoxStyle = {
  marginTop: 10,
  paddingLeft: 10,
  color: "#374151"
};

const eventBoxStyle = {
  marginTop: 10,
  paddingLeft: 10
};

const collapsibleSectionStyle = {
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  marginBottom: 18,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
};

const collapsibleSummaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  cursor: "pointer",
  padding: "13px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: "bold",
  color: "#0f172a"
};

const collapsibleTitleStyle = {
  fontSize: 17,
  lineHeight: 1.2,
  letterSpacing: "0.01em"
};

const collapsibleSubtitleStyle = {
  fontWeight: 500,
  color: "#64748b",
  fontSize: 13
};

const collapsibleBodyStyle = {
  padding: 14
};

const alwaysOnSectionStyle = {
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  marginBottom: 18,
  padding: 14,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
};

const alwaysOnHeaderStyle = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 10
};

const alwaysOnTitleStyle = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.2
};

const alwaysOnSubtitleStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13
};

const legendWrapStyle = {
  background: "white",
  padding: 6,
  borderRadius: 12,
  border: "none",
  marginBottom: 0
};

const legendGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(8, minmax(128px, 1fr))",
  gap: 8,
  overflowX: "auto"
};

const legendItemStyle = {
  color: "#111827",
  background: "#ffffff",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  minHeight: 74,
  fontSize: 12
};

const scoreLegendWrapStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
  fontSize: 12
};

const scoreLegendRowStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "7px 8px",
  borderRadius: 8,
  background: "#f8fafc",
  border: "1px solid #e5e7eb"
};

const actionBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
  fontWeight: "bold",
  borderRadius: 999,
  lineHeight: 1.1,
  letterSpacing: 0.2,
  boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)"
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6
};

const subtitleStyle = {
  marginTop: 6,
  marginBottom: 18,
  color: "#4b5563"
};

const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  cursor: "pointer",
  fontWeight: 500
};


const natalEditorStyle = {
  background: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: 14,
  padding: 18,
  marginBottom: 18,
  boxShadow: "0 8px 22px rgba(76,29,149,0.07)"
};

const natalFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
  marginTop: 14,
  marginBottom: 10
};

const pathPanelStyle = {
  background: "#ffffff",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  padding: 14,
  marginBottom: 16,
  marginTop: 12
};

const pathGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 14,
  alignItems: "start"
};

const actionChipRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const actionChipPanelStyle = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12
};

const strategicChipStyle = {
  ...actionBadgeStyle,
  background: "#dbeafe",
  color: "#1e3a8a",
  border: "1px solid #bfdbfe",
  padding: "8px 11px",
  fontSize: 12
};

const detailPanelStyle = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 14,
  padding: 18,
  marginBottom: 20,
  boxShadow: "0 8px 22px rgba(124,45,18,0.08)"
};

const detailHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 14
};

const closeButtonStyle = {
  border: "1px solid #fed7aa",
  background: "white",
  color: "#9a3412",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold"
};

const detailSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const detailMetricStyle = {
  background: "white",
  border: "1px solid #fed7aa",
  borderRadius: 12,
  padding: 12
};

const decisionCardStyle = {
  background: "#ffffff",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  padding: 14,
  marginBottom: 16
};

const decisionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const decisionMetricStyle = {
  background: "#f8fafc",
  border: "1px solid #dbeafe",
  borderRadius: 12,
  padding: 12,
  lineHeight: 1.5
};

const infoTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
  border: "1px solid #e5e7eb",
  lineHeight: 1.65,
  tableLayout: "fixed"
};

const infoThStyle = {
  width: "250px",
  minWidth: "210px",
  verticalAlign: "top",
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#374151",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 0.35
};

const infoTdStyle = {
  verticalAlign: "top",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  fontSize: 14
};

const researchDetailsStyle = {
  marginTop: 16,
  background: "#fffaf0",
  border: "1px solid #fed7aa",
  borderRadius: 14,
  padding: 14
};

const researchSummaryStyle = {
  cursor: "pointer",
  fontWeight: "bold",
  marginBottom: 12
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  lineHeight: 1.6,
  marginTop: 12
};

const detailCardStyle = {
  background: "white",
  border: "1px solid #fed7aa",
  borderRadius: 12,
  padding: 12,
  lineHeight: 1.6
};

const detailTwoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
  marginTop: 14
};

const actionPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "7px 12px",
  fontWeight: "bold",
  marginTop: 6,
  background: "#f9fafb",
  border: "1px solid #e5e7eb"
};

const readinessPillStyle = {
  display: "inline-block",
  borderRadius: 999,
  padding: "7px 12px",
  fontWeight: "bold",
  marginTop: 6
};

const bigNumberStyle = {
  fontSize: 26,
  fontWeight: "bold",
  marginTop: 4
};

const bigTextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  marginTop: 6
};

const responseBoxStyle = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: 12,
  padding: 14,
  lineHeight: 1.65
};

const whyBoxStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 12,
  padding: 14,
  lineHeight: 1.65
};

const contactLineStyle = {
  padding: "6px 0",
  borderBottom: "1px solid #ffedd5",
  fontSize: 14
};

const filterPanelStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: 12,
  marginBottom: 0
};

const filterLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 12,
  fontWeight: "bold",
  color: "#374151"
};

const filterSelectStyle = {
  minWidth: 190,
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#f8fafc",
  fontWeight: "bold"
};

const tableScrollStyle = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "white"
};

const tableStyle = {
  width: "100%",
  minWidth: 1320,
  borderCollapse: "collapse",
  background: "white",
  tableLayout: "fixed"
};

const thStyle = {
  border: "1px solid #d1d5db",
  padding: "8px 6px",
  textAlign: "left",
  background: "#f9fafb",
  position: "sticky",
  top: 0,
  zIndex: 1
};

const tdStyle = {
  border: "1px solid #d1d5db",
  padding: "7px 6px",
  verticalAlign: "top",
  fontSize: 11.5,
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "normal"
};


const cellClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  overflowWrap: "anywhere",
  wordBreak: "normal"
};

const smallButtonStyle = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: "bold"
};


const replayLabStyle = {
  background: "#f0fdfa",
  border: "1px solid #99f6e4",
  borderRadius: 14,
  padding: 18,
  marginBottom: 0,
  boxShadow: "0 8px 22px rgba(15,118,110,0.08)"
};

const replayFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const replayResultStyle = {
  marginTop: 16
};

const replaySummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 14
};

const errorBoxStyle = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 10,
  padding: 12,
  marginTop: 10
};

const researchJsonStyle = {
  background: "#111827",
  color: "#e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginTop: 14,
  fontSize: 12,
  overflowX: "auto"
};

const simpleReplayLineStyle = {
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
  lineHeight: 1.55,
  fontSize: 15
};

const replayChipRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12
};

const windowCardStyle = {
  background: "white",
  border: "1px solid #99f6e4",
  borderRadius: 12,
  padding: 14,
  lineHeight: 1.6
};

const replayModeToggleWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  margin: "12px 0"
};

const replayModeButtonStyle = active => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: active ? "1px solid #0f766e" : "1px solid #cbd5e1",
  background: active ? "#0f766e" : "#ffffff",
  color: active ? "#ffffff" : "#0f172a",
  cursor: "pointer",
  fontWeight: "bold"
});

const scoreLegendPanelStyle = {
  background: "#ffffff",
  border: "1px solid #dbeafe",
  borderRadius: 14,
  padding: 12,
  marginBottom: 16
};

const priorityPanelWrapStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 0
};

const priorityCardStyle = {
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
};

const priorityTitleButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#0f172a",
  padding: 0,
  margin: 0,
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14
};

const priorityListStyle = {
  display: "grid",
  gap: 6,
  marginTop: 10
};

const priorityItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 8,
  padding: "7px 8px",
  cursor: "pointer",
  fontSize: 12,
  textAlign: "left"
};
