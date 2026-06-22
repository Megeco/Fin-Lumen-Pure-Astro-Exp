import * as Astronomy from "astronomy-engine";
import {
  getStaticSwissBodyPosition,
  getStaticSwissTransits,
  staticSwissMetadata,
  hasStaticSwissData,
  getStaticSwissUpcomingEvents
} from "./staticSwissProvider.js";

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const BODY_MAP = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn
};

export function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

export function roundDegree(degree, digits = 4) {
  return Number(normalizeDegree(degree).toFixed(digits));
}

export function parseUtcDate(input, defaultHour = 12) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  if (typeof input === "string" && input.includes("T")) {
    return new Date(input);
  }

  return new Date(`${input}T${String(defaultHour).padStart(2, "0")}:00:00Z`);
}

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function getLahiriAyanamsa(dateOrYear) {
  const year =
    typeof dateOrYear === "number"
      ? dateOrYear
      : parseUtcDate(dateOrYear).getUTCFullYear();

  return 23.85 + (year - 2000) * 0.0139;
}

export function toSidereal(tropicalDegree, date) {
  return normalizeDegree(
    tropicalDegree - getLahiriAyanamsa(date)
  );
}

export function getSignIndex(degree) {
  return Math.floor(normalizeDegree(degree) / 30);
}

export function getSign(degree) {
  return SIGNS[getSignIndex(degree)];
}

export function getElement(degree) {
  const signIndex = getSignIndex(degree);

  if ([0, 4, 8].includes(signIndex)) {
    return "fire";
  }

  if ([1, 5, 9].includes(signIndex)) {
    return "earth";
  }

  if ([2, 6, 10].includes(signIndex)) {
    return "air";
  }

  return "water";
}

function meanLunarNodeTropical(date) {
  const jd = julianDay(date);
  const t = (jd - 2451545.0) / 36525;

  return normalizeDegree(
    125.04452 -
      1934.136261 * t +
      0.0020708 * t * t +
      (t * t * t) / 450000
  );
}

function tropicalLongitudeForBody(body, date) {
  const time = new Astronomy.AstroTime(date);

  if (body === Astronomy.Body.Sun) {
    return Astronomy.SunPosition(time).elon;
  }

  if (body === Astronomy.Body.Moon) {
    const moonVector = Astronomy.GeoMoon(time);
    return Astronomy.Ecliptic(moonVector).elon;
  }

  const vector = Astronomy.GeoVector(body, time, true);
  return Astronomy.Ecliptic(vector).elon;
}

function siderealBodyLongitude(planet, date) {
  if (planet === "rahu") {
    return roundDegree(
      toSidereal(
        meanLunarNodeTropical(date),
        date
      )
    );
  }

  if (planet === "ketu") {
    return roundDegree(
      siderealBodyLongitude("rahu", date) + 180
    );
  }

  const body = BODY_MAP[planet];

  if (!body) {
    throw new Error(`Unsupported planet: ${planet}`);
  }

  return roundDegree(
    toSidereal(
      tropicalLongitudeForBody(body, date),
      date
    )
  );
}

function signedMovement(fromDegree, toDegree) {
  let delta = normalizeDegree(toDegree) - normalizeDegree(fromDegree);

  if (delta > 180) {
    delta -= 360;
  }

  if (delta < -180) {
    delta += 360;
  }

  return delta;
}

function addDays(date, days) {
  const d = parseUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMs(date, ms) {
  return new Date(parseUtcDate(date).getTime() + ms);
}

function speedLongitude(planet, date) {
  if (["sun", "moon"].includes(planet)) {
    return null;
  }

  if (["rahu", "ketu"].includes(planet)) {
    return -0.05295;
  }

  const before = addMs(date, -12 * 3600000);
  const after = addMs(date, 12 * 3600000);
  const beforeDegree = siderealBodyLongitude(planet, before);
  const afterDegree = siderealBodyLongitude(planet, after);

  return Number(signedMovement(beforeDegree, afterDegree).toFixed(8));
}

function decoratePosition(planet, degree, date) {
  const speed = speedLongitude(planet, date);

  return {
    name: planet,
    planet,
    degree: roundDegree(degree),
    longitude: roundDegree(degree),
    rawLongitude: normalizeDegree(degree),
    sign: getSign(degree),
    signIndex: getSignIndex(degree),
    element: getElement(degree),
    speedLongitude: speed,
    retrograde:
      typeof speed === "number"
        ? speed < 0
        : false,
    node:
      planet === "rahu"
        ? "mean north node"
        : planet === "ketu"
          ? "mean south node"
          : undefined,
    source: "astronomy-engine ephemeris + Lahiri sidereal conversion"
  };
}

export function getBodyPosition(planet, input, options = {}) {
  const exactTimestamp = typeof input === "string" && input.includes("T");
  const useStatic = options.preferStatic !== false && !(exactTimestamp && options.bypassStaticForExact !== false);
  const staticPosition = useStatic ? getStaticSwissBodyPosition(planet, input) : null;

  if (staticPosition) {
    return staticPosition;
  }

  const date = parseUtcDate(input);
  const degree = siderealBodyLongitude(planet, date);

  return decoratePosition(planet, degree, date);
}

export function generateRealTransits(date, options = {}) {
  const exactTimestamp = typeof date === "string" && date.includes("T");
  const useStatic = options.preferStatic !== false && !(exactTimestamp && options.bypassStaticForExact !== false);
  const staticTransits = useStatic ? getStaticSwissTransits(date) : null;

  if (staticTransits) {
    return staticTransits;
  }

  const transitDate = parseUtcDate(date);
  const dateOnly = transitDate.toISOString().split("T")[0];

  const planets = [
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

  const positions = {};

  for (const planet of planets) {
    positions[planet] = getBodyPosition(planet, transitDate, { preferStatic: false });
  }

  return {
    date: dateOnly,
    dateOnly,
    calculation: "astronomy-engine geocentric ephemeris, sidereal Lahiri conversion",
    ephemeris: "astronomy-engine",
    zodiac: "sidereal",
    ayanamsa: "Lahiri model",
    ayanamsaValue: Number(getLahiriAyanamsa(transitDate).toFixed(6)),
    nodeType: "mean lunar node",
    timeBasis: "UTC noon unless exact time supplied",
    noHardcodedEvents: true,
    sun: positions.sun.degree,
    moon: positions.moon.degree,
    mercury: positions.mercury.degree,
    venus: positions.venus.degree,
    mars: positions.mars.degree,
    jupiter: positions.jupiter.degree,
    saturn: positions.saturn.degree,
    rahu: positions.rahu.degree,
    ketu: positions.ketu.degree,
    positions
  };
}

export function nextSignIngress(planet, startDate, scanDays = 730) {
  const staticHits = getStaticSwissUpcomingEvents(startDate, "ingresses", 80, scanDays)
    .filter(item => item.planet === planet);

  if (staticHits.length) {
    const hit = staticHits[0];
    return {
      planet,
      from: hit.from,
      to: hit.to,
      date: hit.date,
      exactUtc: hit.exactUtc,
      exactIst: hit.exactIst,
      daysTill: hit.daysTill,
      daysRemaining: hit.daysRemaining,
      degree: hit.degree,
      sign: hit.sign,
      source: hit.source || "static Swiss event table",
      zodiac: hit.zodiac || "sidereal",
      ayanamsa: hit.ayanamsa || "Lahiri"
    };
  }

  const start = parseUtcDate(startDate);
  const startPosition = getBodyPosition(planet, start);
  const startSign = startPosition.signIndex;

  let low = start;
  let high = null;

  for (let i = 1; i <= scanDays; i += 1) {
    const test = addDays(start, i);
    const position = getBodyPosition(planet, test);

    if (position.signIndex !== startSign) {
      low = addDays(start, i - 1);
      high = test;
      break;
    }
  }

  if (!high) {
    return null;
  }

  for (let i = 0; i < 48; i += 1) {
    const mid = new Date((low.getTime() + high.getTime()) / 2);
    const midPosition = getBodyPosition(planet, mid);

    if (midPosition.signIndex === startSign) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const exact = high;
  const exactPosition = getBodyPosition(planet, exact);
  const daysTill = (exact.getTime() - start.getTime()) / 86400000;

  return {
    planet,
    from: startPosition.sign,
    to: exactPosition.sign,
    date: exact.toISOString().split("T")[0],
    exactUtc: exact.toISOString(),
    exactIst: new Date(exact.getTime() + 5.5 * 3600000)
      .toISOString()
      .replace("Z", "+05:30"),
    daysTill: Number(daysTill.toFixed(2)),
    degree: exactPosition.degree,
    source: "ephemeris scan + binary search",
    zodiac: "sidereal",
    ayanamsa: "Lahiri model"
  };
}

export function nextRetrogradeTransitions(planet, startDate, scanDays = 730) {
  if (["sun", "moon", "rahu", "ketu"].includes(planet)) {
    return [];
  }

  const staticHits = getStaticSwissUpcomingEvents(startDate, "stations", 80, scanDays)
    .filter(item => item.planet === planet);

  if (staticHits.length) {
    return staticHits.map(hit => ({
      planet,
      date: hit.date,
      exactUtc: hit.exactUtc,
      exactIst: hit.exactIst,
      daysTill: hit.daysTill,
      daysRemaining: hit.daysRemaining,
      station: hit.station,
      sign: hit.sign,
      degree: hit.degree,
      source: hit.source || "static Swiss event table",
      zodiac: hit.zodiac || "sidereal",
      ayanamsa: hit.ayanamsa || "Lahiri"
    }));
  }

  const start = parseUtcDate(startDate);
  const events = [];
  let previousDate = start;
  let previousSpeed = speedLongitude(planet, previousDate);
  let previousRetrograde = previousSpeed < 0;

  for (let i = 1; i <= scanDays; i += 1) {
    const testDate = addDays(start, i);
    const currentSpeed = speedLongitude(planet, testDate);
    const currentRetrograde = currentSpeed < 0;

    if (currentRetrograde !== previousRetrograde) {
      let low = previousDate;
      let high = testDate;

      for (let j = 0; j < 44; j += 1) {
        const mid = new Date((low.getTime() + high.getTime()) / 2);
        const midRetrograde = speedLongitude(planet, mid) < 0;

        if (midRetrograde === previousRetrograde) {
          low = mid;
        } else {
          high = mid;
        }
      }

      const exact = high;
      const pos = getBodyPosition(planet, exact);
      const nowRetrograde = speedLongitude(planet, addMs(exact, 60 * 1000)) < 0;
      const daysTill = (exact.getTime() - start.getTime()) / 86400000;

      events.push({
        planet,
        date: exact.toISOString().split("T")[0],
        exactUtc: exact.toISOString(),
        exactIst: new Date(exact.getTime() + 5.5 * 3600000)
          .toISOString()
          .replace("Z", "+05:30"),
        daysTill: Number(daysTill.toFixed(2)),
        station: nowRetrograde ? "retrograde begins" : "direct begins",
        sign: pos.sign,
        degree: pos.degree,
        source: "ephemeris speed zero-crossing",
        zodiac: "sidereal",
        ayanamsa: "Lahiri model"
      });

      previousRetrograde = currentRetrograde;
    }

    previousDate = testDate;
    previousSpeed = currentSpeed;
  }

  return events;
}

export function ephemerisMetadata() {
  if (hasStaticSwissData()) {
    return staticSwissMetadata();
  }

  return {
    ephemeris: "astronomy-engine",
    zodiac: "sidereal",
    ayanamsa: "Lahiri model",
    nodeType: "mean lunar node",
    timeBasis: "UTC; IST shown for readability where relevant",
    noHardcodedEvents: true,
    note: "Live ephemeris-derived API output. No hard-coded macro events. Planetary positions use astronomy-engine with sidereal Lahiri conversion."
  };
}

export default generateRealTransits;
