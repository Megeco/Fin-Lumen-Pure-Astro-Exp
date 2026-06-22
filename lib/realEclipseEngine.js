import * as Astronomy from "astronomy-engine";
import {
  getSign,
  toSidereal
} from "./realTransitGenerator.js";
import {
  getStaticSwissUpcomingEvents
} from "./staticSwissProvider.js";

const ASPECTS = [
  {
    name: "conjunction",
    angle: 0,
    weight: 3
  },
  {
    name: "sextile",
    angle: 60,
    weight: 1
  },
  {
    name: "square",
    angle: 90,
    weight: -2
  },
  {
    name: "trine",
    angle: 120,
    weight: 2
  },
  {
    name: "opposition",
    angle: 180,
    weight: -3
  }
];

function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function roundDegree(degree) {
  return Number(normalizeDegree(degree).toFixed(2));
}

function angleDifference(a, b) {
  let diff = Math.abs(normalizeDegree(a) - normalizeDegree(b));

  if (diff > 180) {
    diff = 360 - diff;
  }

  return diff;
}

function severity(orb) {
  if (orb <= 2) {
    return "major";
  }

  if (orb <= 5) {
    return "moderate";
  }

  return "weak";
}

function signalStrength(weight, orb, eclipseType) {
  const base = weight * (8 - orb);
  const multiplier = eclipseType === "solar" ? 1.15 : 1;

  return Number((base * multiplier).toFixed(2));
}

function getSunLongitudeTropical(date) {
  return Astronomy.SunPosition(new Astronomy.AstroTime(date)).elon;
}

function getMoonLongitudeTropical(date) {
  const moonVec = Astronomy.GeoMoon(new Astronomy.AstroTime(date));
  const coords = Astronomy.Ecliptic(moonVec);
  return coords.elon;
}

function dateOnly(date) {
  return date.toISOString().split("T")[0];
}

function getEclipseSearchRange(referenceDate, daysBefore, daysAfter) {
  const center = new Date(`${referenceDate}T12:00:00Z`);
  const start = new Date(center.getTime() - daysBefore * 86400000);
  const end = new Date(center.getTime() + daysAfter * 86400000);

  return {
    center,
    start,
    end
  };
}

export function getRelevantEclipses(referenceDate, options = {}) {
  const daysBefore = options.daysBefore ?? 30;
  const daysAfter = options.daysAfter ?? 30;

  const futureEvents = getStaticSwissUpcomingEvents(referenceDate, "eclipses", 80, daysAfter);
  const pastEvents = getStaticSwissUpcomingEvents(referenceDate, "eclipses", 80, daysBefore)
    .filter(() => false);

  // The static event helper is forward-looking. For eclipse relevance, read a symmetric
  // window by using the event table directly when possible through a wider forward
  // pass from the earlier boundary.
  const boundary = new Date(`${referenceDate}T12:00:00Z`);
  boundary.setUTCDate(boundary.getUTCDate() - daysBefore);
  const symmetricStatic = getStaticSwissUpcomingEvents(boundary.toISOString().slice(0, 10), "eclipses", 120, daysBefore + daysAfter + 2)
    .map(item => {
      const center = new Date(`${referenceDate}T12:00:00Z`);
      const exact = new Date(item.exactUtc);
      const daysFromReference = Math.round((exact.getTime() - center.getTime()) / 86400000);
      return {
        type: item.eclipseKind || item.type,
        kind: item.eclipseType || item.kind,
        date: item.date,
        exactUtc: item.exactUtc,
        exactIst: item.exactIst,
        daysFromReference,
        siderealLongitude: roundDegree(item.degree),
        sign: item.sign,
        source: item.source || "static Swiss eclipse event table"
      };
    })
    .filter(item => item.daysFromReference >= -daysBefore && item.daysFromReference <= daysAfter);

  if (symmetricStatic.length) {
    return symmetricStatic.sort(
      (a, b) => Math.abs(a.daysFromReference) - Math.abs(b.daysFromReference)
    );
  }

  const {
    center,
    start,
    end
  } = getEclipseSearchRange(referenceDate, daysBefore, daysAfter);

  const eclipses = [];

  let solar = Astronomy.SearchGlobalSolarEclipse(start);

  while (solar?.peak?.date) {
    const peakDate = solar.peak.date;

    if (peakDate > end) {
      break;
    }

    const tropicalLongitude = getSunLongitudeTropical(peakDate);
    const siderealLongitude = toSidereal(tropicalLongitude, peakDate);

    eclipses.push({
      type: "solar",
      kind: solar.kind,
      date: dateOnly(peakDate),
      daysFromReference: Math.round((peakDate - center) / 86400000),
      tropicalLongitude: roundDegree(tropicalLongitude),
      siderealLongitude: roundDegree(siderealLongitude),
      sign: getSign(siderealLongitude)
    });

    solar = Astronomy.NextGlobalSolarEclipse(solar.peak);
  }

  let lunar = Astronomy.SearchLunarEclipse(start);

  while (lunar?.peak?.date) {
    const peakDate = lunar.peak.date;

    if (peakDate > end) {
      break;
    }

    const tropicalLongitude = getMoonLongitudeTropical(peakDate);
    const siderealLongitude = toSidereal(tropicalLongitude, peakDate);

    eclipses.push({
      type: "lunar",
      kind: lunar.kind,
      date: dateOnly(peakDate),
      daysFromReference: Math.round((peakDate - center) / 86400000),
      tropicalLongitude: roundDegree(tropicalLongitude),
      siderealLongitude: roundDegree(siderealLongitude),
      sign: getSign(siderealLongitude)
    });

    lunar = Astronomy.NextLunarEclipse(lunar.peak);
  }

  return eclipses.sort(
    (a, b) => Math.abs(a.daysFromReference) - Math.abs(b.daysFromReference)
  );
}

function getNatalPlanets(natal) {
  return natal?.planets || natal || {};
}

export function calculateRealEclipseHits(natal, options = {}) {
  const referenceDate =
    options.referenceDate ||
    new Date()
      .toISOString()
      .split("T")[0];

  const orbLimit = options.orbLimit ?? 8;

  const eclipses =
    options.eclipses ||
    getRelevantEclipses(referenceDate, {
      daysBefore: options.daysBefore ?? 30,
      daysAfter: options.daysAfter ?? 30
    });

  const planets = getNatalPlanets(natal);
  const hits = [];

  for (const eclipse of eclipses) {
    for (const [planet, degree] of Object.entries(planets)) {
      if (typeof degree !== "number" || !Number.isFinite(degree)) {
        continue;
      }

      const exactAngle = angleDifference(eclipse.siderealLongitude, degree);

      for (const aspect of ASPECTS) {
        const orb = Math.abs(exactAngle - aspect.angle);

        if (orb <= orbLimit) {
          hits.push({
            eclipseType: eclipse.type,
            eclipseKind: eclipse.kind,
            eclipseDate: eclipse.date,
            daysFromReference: eclipse.daysFromReference,
            eclipseDegree: eclipse.siderealLongitude,
            eclipseSign: eclipse.sign,
            natalPlanet: planet,
            natalDegree: roundDegree(degree),
            aspect: aspect.name,
            exactAngle: Number(exactAngle.toFixed(2)),
            orb: Number(orb.toFixed(2)),
            severity: severity(orb),
            weight: aspect.weight,
            signalStrength: signalStrength(aspect.weight, orb, eclipse.type)
          });
        }
      }
    }
  }

  return hits.sort(
    (a, b) => Math.abs(b.signalStrength) - Math.abs(a.signalStrength)
  );
}

export default calculateRealEclipseHits;
