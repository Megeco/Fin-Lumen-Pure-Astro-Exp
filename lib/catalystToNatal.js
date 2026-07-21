function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function angleDistance(a, b) {
  const diff = Math.abs(normalizeDegree(a) - normalizeDegree(b));
  return Math.min(diff, 360 - diff);
}

const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 6, weight: 1.0 },
  { name: "opposition", angle: 180, orb: 5, weight: 0.85 },
  { name: "trine", angle: 120, orb: 5, weight: 0.75 },
  { name: "square", angle: 90, orb: 5, weight: 0.65 },
  { name: "sextile", angle: 60, orb: 4, weight: 0.5 }
];

const PLANET_IMPORTANCE = {
  sun: 1.0,
  moon: 1.0,
  mercury: 0.9,
  venus: 1.0,
  mars: 0.85,
  jupiter: 1.0,
  saturn: 0.9,
  rahu: 1.0,
  ketu: 0.8
};

function title(value) {
  return String(value || "")
    .charAt(0)
    .toUpperCase() + String(value || "").slice(1);
}

function getNatalPlanets(natal) {
  return natal?.planets || natal || {};
}

function eventTone(eventItem) {
  const text = `${eventItem?.type || ""} ${eventItem?.resultingEnvironment || ""} ${eventItem?.label || ""}`.toLowerCase();

  if (text.includes("pressure") || text.includes("saturn") || text.includes("square")) {
    return "pressure";
  }

  if (text.includes("retrograde") || text.includes("volatility") || text.includes("rahu")) {
    return "volatility";
  }

  if (text.includes("eclipse") || text.includes("reset")) {
    return "reset";
  }

  if (text.includes("jupiter") || text.includes("venus") || text.includes("expansion")) {
    return "expansion";
  }

  return "transition";
}

function eventDegrees(eventItem) {
  const degrees = [];

  if (eventItem?.p1?.degree !== undefined) {
    degrees.push({
      planet: eventItem.p1.planet || eventItem.planets?.[0] || "macro",
      degree: eventItem.p1.degree
    });
  }

  if (eventItem?.p2?.degree !== undefined) {
    degrees.push({
      planet: eventItem.p2.planet || eventItem.planets?.[1] || "macro",
      degree: eventItem.p2.degree
    });
  }

  if (!degrees.length && typeof eventItem?.degree === "number") {
    degrees.push({
      planet: eventItem.planets?.[0] || eventItem.name || eventItem.label || "macro",
      degree: eventItem.degree
    });
  }

  if (!degrees.length && typeof eventItem?.siderealLongitude === "number") {
    degrees.push({
      planet: "eclipse",
      degree: eventItem.siderealLongitude
    });
  }

  return degrees.filter(item => typeof item.degree === "number" && Number.isFinite(item.degree));
}

function scoreHit(macroPlanet, natalPlanet, aspect, orb, tone) {
  const base = Math.max(0, 1 - orb / aspect.orb) * 100 * aspect.weight;
  const natalWeight = PLANET_IMPORTANCE[natalPlanet] || 0.7;
  let multiplier = natalWeight;

  if (tone === "expansion" && ["venus", "jupiter", "moon", "sun", "rahu"].includes(natalPlanet)) {
    multiplier += 0.35;
  }

  if (tone === "pressure" && ["saturn", "mercury", "sun", "mars", "venus"].includes(natalPlanet)) {
    multiplier += 0.3;
  }

  if (tone === "volatility" && ["rahu", "ketu", "moon", "mercury", "mars"].includes(natalPlanet)) {
    multiplier += 0.35;
  }

  if (String(macroPlanet).toLowerCase().includes("jupiter") && ["jupiter", "venus", "moon", "sun", "rahu"].includes(natalPlanet)) {
    multiplier += 0.25;
  }

  if (String(macroPlanet).toLowerCase().includes("venus") && ["venus", "moon", "jupiter", "rahu"].includes(natalPlanet)) {
    multiplier += 0.25;
  }

  return Math.round(base * multiplier);
}

function findNatalHitsForEvent(eventItem, natal) {
  const degrees = eventDegrees(eventItem);
  const natalPlanets = getNatalPlanets(natal);
  const tone = eventTone(eventItem);
  const hits = [];

  for (const macro of degrees) {
    for (const [natalPlanet, natalDegree] of Object.entries(natalPlanets)) {
      if (typeof natalDegree !== "number") {
        continue;
      }

      const distance = angleDistance(macro.degree, natalDegree);

      for (const aspect of ASPECTS) {
        const orb = Math.abs(distance - aspect.angle);

        if (orb <= aspect.orb) {
          hits.push({
            macroPlanet: macro.planet,
            natalPlanet,
            aspect: aspect.name,
            orb: Number(orb.toFixed(2)),
            score: scoreHit(macro.planet, natalPlanet, aspect, orb, tone),
            tone
          });
        }
      }
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function strengthLabel(score) {
  if (score >= 145) return "VERY HIGH";
  if (score >= 100) return "HIGH";
  if (score >= 60) return "MODERATE";
  if (score > 0) return "LOW";
  return "NO DIRECT HIT";
}

function readinessLabel(days, strength) {
  if (strength === "NO DIRECT HIT") return "Monitor only";
  if (days <= 2) return "Active now";
  if (days <= 10) return "Near catalyst";
  if (days <= 30) return "Prepare";
  return "Later window";
}

function classifyResponse(eventItem, hits, totalScore) {
  const tone = eventTone(eventItem);
  const label = eventItem?.label || "Upcoming macro catalyst";
  const top = hits[0];

  if (!hits.length) {
    return `${label} is near, but Fin-Lumen does not detect a strong direct natal hit for this stock. Treat as macro background rather than stock-specific trigger.`;
  }

  const mainContact = `${title(top.macroPlanet)} ${top.aspect} natal ${top.natalPlanet}`;
  const supportiveContacts = hits.filter(hit => ["trine", "sextile"].includes(hit.aspect));
  const challengingContacts = hits.filter(hit => ["square", "opposition"].includes(hit.aspect));
  const receptorIsSupportive = supportiveContacts.length > challengingContacts.length || ["trine", "sextile"].includes(top.aspect);
  const receptorIsChallenging = challengingContacts.length > supportiveContacts.length || ["square", "opposition"].includes(top.aspect);

  if (tone === "expansion") {
    if (receptorIsChallenging) {
      return `${label} brings an expansion impulse, but it reaches the natal chart through ${mainContact}. Expected response: rerating potential with tension, overextension or reversals rather than a clean one-way bid.`;
    }
    if (totalScore >= 100) {
      return `${label} directly activates the natal chart through ${mainContact}. Expected response: rerating/leadership search, improved confidence, and stronger bid where broader astro pressure does not block it.`;
    }

    return `${label} gives some natal support via ${mainContact}. Expected response: constructive bias, but follow-through depends on whether current Saturn/Rahu pressure stays contained.`;
  }

  if (tone === "pressure") {
    if (receptorIsSupportive) {
      return `${label} creates a restrictive macro backdrop but meets a supportive natal receptor through ${mainContact}. Expected response: constrained or delayed support rather than automatic valuation compression; test whether natal support survives the broader pressure field.`;
    }
    return `${label} pressures the natal chart through ${mainContact}. Expected response: review, hesitation, valuation compression or temporary cooling before repair.`;
  }

  if (tone === "volatility") {
    return `${label} activates the natal chart through ${mainContact}. Expected response: narrative heat, volatility, quick reversals, and crowd sensitivity rather than clean expansion.`;
  }

  if (tone === "reset") {
    return `${label} touches the natal chart through ${mainContact}. Expected response: inflection/reset potential; direction depends on whether Jupiter/Rahu support or Saturn pressure dominates.`;
  }

  return `${label} touches the natal chart through ${mainContact}. Expected response: transitional behaviour; use the next mapped transit gate to resolve expansion versus pressure.`;
}

export function scanCatalystToNatal(natal, macroPhases = [], options = {}) {
  const limit = options.limit || 8;
  const candidates = (macroPhases || [])
    .filter(item => typeof item.daysRemaining === "number" || typeof item.daysTill === "number")
    .filter(item => Number(item.daysRemaining ?? item.daysTill) <= (options.daysAhead || 45))
    .slice(0, limit);

  const scored = candidates.map(eventItem => {
    const hits = findNatalHitsForEvent(eventItem, natal);
    const totalScore = hits.reduce((sum, hit) => sum + hit.score, 0);
    const days = Number(eventItem.daysRemaining ?? eventItem.daysTill ?? 999);
    const strength = strengthLabel(totalScore);

    return {
      label: eventItem.label || eventItem.name || "Macro catalyst",
      date: eventItem.date,
      exactIst: eventItem.exactIst,
      daysRemaining: days,
      tone: eventTone(eventItem),
      strength,
      score: totalScore,
      readiness: readinessLabel(days, strength),
      contacts: hits,
      contactText: hits.length
        ? hits.slice(0, 3).map(hit => `${title(hit.macroPlanet)} ${hit.aspect} natal ${hit.natalPlanet} (${hit.orb}°)`).join("; ")
        : "No tight natal contact detected",
      expectedResponse: classifyResponse(eventItem, hits, totalScore)
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.daysRemaining - b.daysRemaining;
  });

  const best = scored[0] || null;

  return {
    best,
    candidates: scored,
    summary: best
      ? `${best.label}: ${best.strength} catalyst; ${best.readiness}; ${best.contactText}`
      : "No upcoming macro catalyst available for natal scan."
  };
}

export default scanCatalystToNatal;
