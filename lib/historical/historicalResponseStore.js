import fs from "fs";
import path from "path";
import registry from "../../data/historicalResponseRegistry.json";

let cached = null;

function readGeneratedArchives() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    return fs.readdirSync(dataDir)
      .filter(name => /^historical-.*\.json$/i.test(name) && name !== "historicalResponseRegistry.json")
      .flatMap(name => {
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
          return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function getHistoricalRegistry() {
  if (cached) return cached;
  const base = Array.isArray(registry) ? registry : [];
  const generated = readGeneratedArchives();
  const byId = new Map();
  for (const record of [...base, ...generated]) {
    if (!record) continue;
    const id = record.id || `${record.ticker}|${record.transitFamily}|${record.eventDate}`;
    byId.set(id, record);
  }
  cached = [...byId.values()];
  return cached;
}

export function clearHistoricalRegistryCache() {
  cached = null;
}
