export default async function handler(req, res) {
  const cache = globalThis.__FINLUMEN_CACHE__ || {};
  const entries = Object.entries(cache).map(([key, value]) => ({
    key,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    ageSeconds: value.createdAt ? Math.round((Date.now() - value.createdAt) / 1000) : null,
    rows: Array.isArray(value.payload) ? value.payload.length : null
  }));

  return res.status(200).json({
    success: true,
    route: "/api/cache-status",
    cacheEntries: entries,
    note: "Serverless memory cache is best-effort. It speeds repeat loads on warm Vercel functions but may reset between cold starts."
  });
}
