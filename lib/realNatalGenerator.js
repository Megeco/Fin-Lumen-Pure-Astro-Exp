import {
  generateRealTransits,
  getElement,
  getSign
} from "./realTransitGenerator.js";

const CORE_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "rahu",
  "ketu"
];

const TIMEZONE_OFFSETS = {
  "Asia/Kolkata": "+05:30",
  "UTC": "+00:00"
};

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topKeys(counts, limit = 2) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function cleanDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function inferChartType(company = {}) {
  const raw = String(company.chartType || company.natalChartType || company.birthChartType || company.sourceType || "").toLowerCase();
  const symbol = String(company.symbol || company.ticker || "").toUpperCase();
  if (raw.includes("bse")) return "BSE listing";
  if (raw.includes("nse")) return "NSE listing";
  if (raw.includes("listing")) return "listing";
  if (raw.includes("foundation")) return "foundation";
  if (symbol.includes("BSE_LISTING")) return "BSE listing";
  if (symbol.includes("NSE_LISTING") || symbol.includes("LISTING_TEST")) return "NSE listing";
  if (company.listingDate && !company.incorporationDate) return "listing";
  return "incorporation";
}

function defaultBirthTime(chartType) {
  const t = String(chartType || "").toLowerCase();
  if (t.includes("listing")) return "09:15";
  return "11:00";
}

function timezoneOffset(timezone) {
  return TIMEZONE_OFFSETS[timezone] || "+00:00";
}

function dateWithLocalTimeToUtcIso(date, time, timezone) {
  const d = cleanDate(date) || "2000-01-01";
  const t = String(time || "12:00").slice(0, 5);
  const offset = timezoneOffset(timezone);
  const parsed = new Date(`${d}T${t}:00${offset}`);
  if (Number.isNaN(parsed.getTime())) {
    return `${d}T12:00:00Z`;
  }
  return parsed.toISOString();
}

function safeNatalContext(company) {
  const chartType = inferChartType(company);
  const birthDate =
    cleanDate(company?.birthDate) ||
    cleanDate(company?.natalBirthDate) ||
    cleanDate(company?.listingDate) ||
    cleanDate(company?.incorporationDate) ||
    cleanDate(company?.date) ||
    "2000-01-01";

  const office = company?.registeredOffice || {};
  const city = company?.city || office.city || (String(chartType).toLowerCase().includes("listing") ? "Mumbai" : "");
  const country = company?.country || office.country || "India";
  const timezone = company?.timezone || office.timezone || "Asia/Kolkata";
  const birthTime = company?.birthTime || company?.natalBirthTime || company?.time || defaultBirthTime(chartType);
  const timestampUtc = dateWithLocalTimeToUtcIso(birthDate, birthTime, timezone);

  return {
    birthDate,
    birthTime,
    city,
    country,
    timezone,
    chartType,
    timestampUtc
  };
}

export function buildNatalProfile(planets) {
  const elementCounts = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0
  };

  const signCounts = {};

  for (const planet of CORE_PLANETS) {
    const degree = planets[planet];

    if (typeof degree !== "number") {
      continue;
    }

    const element = getElement(degree);
    const sign = getSign(degree);

    elementCounts[element] += 1;
    signCounts[sign] = (signCounts[sign] || 0) + 1;
  }

  const elementBias = topKeys(elementCounts, 2).join("-");

  const dominantPlanets = [];

  if (elementCounts.air >= 3) {
    dominantPlanets.push("Mercury");
  }

  if (elementCounts.earth >= 3) {
    dominantPlanets.push("Saturn");
  }

  if (elementCounts.fire >= 3) {
    dominantPlanets.push("Mars");
  }

  if (elementCounts.water >= 3) {
    dominantPlanets.push("Moon");
  }

  if (typeof planets.jupiter === "number") {
    const jupiterElement = getElement(planets.jupiter);

    if (jupiterElement === "fire" || jupiterElement === "water") {
      dominantPlanets.push("Jupiter");
    }
  }

  if (typeof planets.rahu === "number") {
    dominantPlanets.push("Rahu");
  }

  const sensitivity = {
    moon: elementCounts.water >= 2 || elementCounts.air >= 3 ? "high" : "medium",
    mercury: elementCounts.air >= 2 ? "high" : "medium",
    venus: elementCounts.earth >= 2 || elementCounts.water >= 2 ? "medium-high" : "medium",
    mars: elementCounts.fire >= 2 ? "high" : "medium",
    jupiter: elementCounts.fire + elementCounts.water >= 4 ? "high" : "medium",
    saturn: elementCounts.earth >= 2 ? "high" : "medium",
    rahu: elementCounts.air >= 2 || typeof planets.rahu === "number" ? "high" : "medium"
  };

  let natalArchetype = "Balanced Astro Organism";

  if (elementCounts.air >= 3 && sensitivity.rahu === "high") {
    natalArchetype = "Narrative / Rahu-Sensitive";
  }

  if (elementCounts.fire >= 3) {
    natalArchetype = "Ignition / Momentum-Oriented";
  }

  if (elementCounts.earth >= 4) {
    natalArchetype = "Saturnian Structural Compounder";
  }

  if (elementCounts.water >= 3) {
    natalArchetype = "Moon-Sensitive Sentiment Vehicle";
  }

  return {
    elementCounts,
    signCounts,
    elementBias,
    dominantPlanets: [...new Set(dominantPlanets)].slice(0, 4),
    sensitivity,
    natalArchetype
  };
}

export function generateRealNatalChart(company) {
  const natalContext = safeNatalContext(company);
  const transits = generateRealTransits(natalContext.timestampUtc, { preferStatic: false });

  const planets = {};

  for (const planet of CORE_PLANETS) {
    planets[planet] = transits[planet];
  }

  return {
    ...planets,
    planets,
    metadata: {
      companyName: company?.companyName || company?.symbol || "Unknown",
      symbol: company?.symbol,
      chartType: natalContext.chartType,
      birthDate: natalContext.birthDate,
      birthTime: natalContext.birthTime,
      city: natalContext.city,
      country: natalContext.country,
      timezone: natalContext.timezone,
      timestampUtc: natalContext.timestampUtc,
      incorporationDate: company?.incorporationDate || null,
      listingDate: company?.listingDate || null,
      registeredOffice: company?.registeredOffice || null,
      confidence: company?.confidence || "unknown",
      calculation: "company natal chart from date + local time + timezone; geocentric ephemeris with sidereal Lahiri conversion; city/place stored for audit and future topocentric upgrade"
    },
    natalProfile: buildNatalProfile(planets)
  };
}

export default generateRealNatalChart;
