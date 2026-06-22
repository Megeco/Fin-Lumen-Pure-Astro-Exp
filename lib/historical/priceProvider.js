function unixSeconds(date) { return Math.floor(new Date(date).getTime() / 1000); }

export async function fetchYahooDailyPrices(ticker, startDate, endDate) {
  const period1 = unixSeconds(startDate);
  const period2 = unixSeconds(endDate) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Fin-Lumen research" } });
  if (!response.ok) throw new Error(`Price provider failed (${response.status})`);
  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description || "No price data returned");
  const q = result.indicators?.quote?.[0] || {};
  return (result.timestamp || []).map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0,10),
    open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i]
  })).filter(r => Number.isFinite(r.close));
}

export function calculateForwardMetrics(prices = [], eventDate, benchmarkPrices = []) {
  const idx = prices.findIndex(p => p.date >= eventDate);
  if (idx < 0) return null;
  const base = prices[idx].close;
  const horizon = days => prices.find(p => p.date >= new Date(new Date(eventDate).getTime()+days*86400000).toISOString().slice(0,10)) || prices[prices.length-1];
  const sliceTo = days => prices.slice(idx, Math.max(idx+1, prices.findIndex(p => p.date >= new Date(new Date(eventDate).getTime()+days*86400000).toISOString().slice(0,10)) + 1));
  const ret = days => (horizon(days).close / base) - 1;
  const range = days => {
    const s = sliceTo(days);
    return {
      maxGain: Math.max(...s.map(p => p.high || p.close))/base - 1,
      maxDrawdown: Math.min(...s.map(p => p.low || p.close))/base - 1
    };
  };
  const r90 = range(90), r180 = range(180);
  return {
    eventPrice: base,
    return5d: ret(7), return10d: ret(14), return20d: ret(30), return30d: ret(30), return60d: ret(60), return90d: ret(90), return180d: ret(180), return365d: ret(365),
    maxGain90d: r90.maxGain, maxDrawdown90d: r90.maxDrawdown,
    maxGain180d: r180.maxGain, maxDrawdown180d: r180.maxDrawdown,
    relativeReturn90d: null
  };
}
