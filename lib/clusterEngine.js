function exactPlanet(planet) {
  return String(planet || "").toLowerCase();
}

function buildExactClusterKey(aspect) {
  const transit = exactPlanet(aspect?.transitPlanet);
  const natal = exactPlanet(aspect?.natalPlanet);
  const aspectName = String(aspect?.aspect || aspect?.aspectName || "").toLowerCase();
  const date = String(aspect?.date || aspect?.exactDate || "");
  const orb = Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb).toFixed(2) : "";
  return `${transit}-${natal}-${aspectName}-${date}-${orb}`;
}

function thematicKey(aspect) {
  const transit = exactPlanet(aspect?.transitPlanet);
  const natal = exactPlanet(aspect?.natalPlanet);
  return `${transit}-${natal}`;
}

function aspectStrength(aspect) {
  return Math.abs(Number(aspect?.weight || 0)) * Math.max(0, 10 - Number(aspect?.orb || 0));
}

export function deduplicateClusters(aspects = []) {
  // v28.5: dedupe exact duplicates only. Do not normalize Rahu/Ketu into a single
  // nodes bucket and do not collapse Jupiter-Moon, Jupiter-Mercury, Jupiter-Venus,
  // etc. into one representative. Multi-planet thematic layering is model signal.
  const exact = new Map();

  for (const aspect of aspects || []) {
    const key = buildExactClusterKey(aspect);
    const current = exact.get(key);

    if (!current || aspectStrength(aspect) > aspectStrength(current)) {
      exact.set(key, aspect);
    }
  }

  return Array.from(exact.values()).map(aspect => ({
    ...aspect,
    thematicKey: aspect?.thematicKey || thematicKey(aspect)
  }));
}

export function groupThematicClusters(aspects = []) {
  const groups = {};
  for (const aspect of aspects || []) {
    const key = aspect?.thematicKey || thematicKey(aspect);
    if (!groups[key]) groups[key] = [];
    groups[key].push(aspect);
  }
  return Object.entries(groups).map(([key, items]) => ({
    key,
    items,
    count: items.length,
    strength: Number(items.reduce((sum, item) => sum + aspectStrength(item), 0).toFixed(2))
  }));
}
