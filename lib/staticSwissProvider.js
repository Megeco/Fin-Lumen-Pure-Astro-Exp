import fs from "fs";
import path from "path";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const ELEMENTS = [
  "fire", "earth", "air", "water", "fire", "earth",
  "air", "water", "fire", "earth", "air", "water"
];

let cache = null;
let eventCache = null;

function loadData() {
  if (cache) return cache;

  const file = path.join(process.cwd(), "data", "staticSwissEphemeris.json");

  if (!fs.existsSync(file)) {
    cache = { available: false, error: `Static Swiss ephemeris file not found: ${file}` };
    return cache;
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    cache = { available: true, data };
  } catch (err) {
    cache = { available: false, error: err.message };
  }

  return cache;
}

function loadEvents() {
  if (eventCache) return eventCache;

  const file = path.join(process.cwd(), "data", "staticSwissEvents.json");

  if (!fs.existsSync(file)) {
    eventCache = { available: false, error: `Static Swiss events file not found: ${file}` };
    return eventCache;
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    eventCache = { available: true, data };
  } catch (err) {
    eventCache = { available: false, error: err.message };
  }

  return eventCache;
}

function daysFromStart(startDate, exactUtc) {
  const start = new Date(`${dateOnly(startDate)}T12:00:00Z`).getTime();
  const t = new Date(exactUtc).getTime();
  return (t - start) / 86400000;
}

function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function signedMovement(fromDegree, toDegree) {
  let delta = normalizeDegree(toDegree) - normalizeDegree(fromDegree);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function dateOnly(input) {
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  if (typeof input === "string") return input.slice(0, 10);
  return new Date(input).toISOString().slice(0, 10);
}

function planetIndex(data, planet) {
  return (data.planets || []).indexOf(String(planet).toLowerCase());
}

function signIndex(degree) {
  return Math.floor(normalizeDegree(degree) / 30);
}

function decorate(planet, degree, speed, rowDate, meta) {
  const sIdx = signIndex(degree);
  return {
    name: planet,
    planet,
    degree: Number(normalizeDegree(degree).toFixed(6)),
    longitude: Number(normalizeDegree(degree).toFixed(6)),
    rawLongitude: normalizeDegree(degree),
    sign: SIGNS[sIdx],
    signIndex: sIdx,
    element: ELEMENTS[sIdx],
    speedLongitude: typeof speed === "number" ? Number(speed.toFixed(7)) : null,
    retrograde: typeof speed === "number" ? speed < 0 : false,
    node: planet === "rahu" ? "mean north node" : planet === "ketu" ? "mean south node" : undefined,
    source: "static Swiss Ephemeris daily noon UTC dataset",
    rowDate,
    metadata: meta
  };
}

export function hasStaticSwissData() {
  return loadData().available;
}

export function staticSwissMetadata() {
  const loaded = loadData();
  if (!loaded.available) {
    return {
      provider: "static-swiss",
      available: false,
      error: loaded.error
    };
  }

  const events = loadEvents();

  return {
    ...loaded.data.metadata,
    available: true,
    exactEventsAvailable: Boolean(events.available),
    exactEventsMetadata: events.available ? events.data.metadata : null,
    noHardcodedEvents: true,
    note: "Positions are generated offline from Swiss Ephemeris via pyswisseph for private research use. Current file covers 1990-01-01 through 2032-12-31 at 12:00 UTC."
  };
}

export function getStaticSwissBodyPosition(planet, input) {
  const loaded = loadData();
  if (!loaded.available) return null;

  const data = loaded.data;
  const rowDate = dateOnly(input);
  const row = data.dailyNoonUtc?.[rowDate];
  if (!row) return null;

  const idx = planetIndex(data, planet);
  if (idx < 0 || !row[idx]) return null;

  const [degree, speed] = row[idx];
  return decorate(String(planet).toLowerCase(), degree, speed, rowDate, data.metadata);
}

export function getStaticSwissTransits(input) {
  const loaded = loadData();
  if (!loaded.available) return null;

  const data = loaded.data;
  const rowDate = dateOnly(input);
  const row = data.dailyNoonUtc?.[rowDate];
  if (!row) return null;

  const positions = {};
  for (const planet of data.planets || []) {
    const p = getStaticSwissBodyPosition(planet, rowDate);
    if (p) positions[planet] = p;
  }

  return {
    date: rowDate,
    dateOnly: rowDate,
    calculation: "static Swiss Ephemeris sidereal Lahiri dataset, daily 12:00 UTC",
    ephemeris: "static Swiss Ephemeris",
    zodiac: "sidereal",
    ayanamsa: "Lahiri",
    nodeType: "mean lunar node",
    timeBasis: "daily positions at 12:00 UTC; date-only Fin-Lumen calculations use this timestamp",
    noHardcodedEvents: true,
    provider: "static-swiss",
    sun: positions.sun?.degree,
    moon: positions.moon?.degree,
    mercury: positions.mercury?.degree,
    venus: positions.venus?.degree,
    mars: positions.mars?.degree,
    jupiter: positions.jupiter?.degree,
    saturn: positions.saturn?.degree,
    rahu: positions.rahu?.degree,
    ketu: positions.ketu?.degree,
    positions,
    metadata: staticSwissMetadata()
  };
}

export function getStaticSwissUpcomingEvents(startDate, kind, limit = 12, scanDays = 730) {
  const eventsLoaded = loadEvents();

  if (eventsLoaded.available) {
    const kindMap = {
      ingresses: "ingresses",
      stations: "stations",
      macroAspects: "macroAspects",
      eclipses: "eclipses"
    };

    const key = kindMap[kind] || kind;
    const start = new Date(`${dateOnly(startDate)}T12:00:00Z`).getTime();
    const end = start + scanDays * 86400000;
    const events = eventsLoaded.data[key] || [];

    return events
      .filter(item => {
        if (!item.exactUtc) return false;
        const t = new Date(item.exactUtc).getTime();
        return t >= start && t <= end;
      })
      .map(item => {
        const daysTill = daysFromStart(startDate, item.exactUtc);
        return {
          ...item,
          daysTill: Number(daysTill.toFixed(2)),
          daysRemaining: Number(daysTill.toFixed(2)),
          timing: daysTill <= 7 ? "NEAR" : "UPCOMING",
          eventTableSource: "static-swiss-events"
        };
      })
      .slice(0, limit);
  }

  const loaded = loadData();
  if (!loaded.available) return [];
  const start = new Date(`${dateOnly(startDate)}T12:00:00Z`).getTime();
  const end = start + scanDays * 86400000;
  const events = loaded.data.events?.[kind] || [];

  return events
    .filter(item => {
      if (!item.exactUtc) return false;
      const t = new Date(item.exactUtc).getTime();
      return t >= start && t <= end;
    })
    .map(item => {
      const t = new Date(item.exactUtc).getTime();
      const daysTill = (t - start) / 86400000;
      return {
        ...item,
        daysTill: Number(daysTill.toFixed(2)),
        daysRemaining: Number(daysTill.toFixed(2))
      };
    })
    .slice(0, limit);
}

export function getStaticSwissEventsMetadata() {
  const events = loadEvents();

  if (!events.available) {
    return {
      available: false,
      error: events.error
    };
  }

  return {
    ...events.data.metadata,
    available: true
  };
}

export default {
  hasStaticSwissData,
  staticSwissMetadata,
  getStaticSwissBodyPosition,
  getStaticSwissTransits,
  getStaticSwissUpcomingEvents,
  getStaticSwissEventsMetadata
};
