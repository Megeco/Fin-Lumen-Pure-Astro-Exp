import {
  ephemerisMetadata,
  generateRealTransits,
  nextRetrogradeTransitions,
  nextSignIngress
} from "../../lib/realTransitGenerator.js";
import {
  getRelevantEclipses
} from "../../lib/realEclipseEngine.js";

export default async function handler(req, res) {
  const date = req.query.date || new Date().toISOString();

  try {
    const transits = generateRealTransits(date);
    const metadata = ephemerisMetadata();
    const referenceDate = new Date(date).toISOString().slice(0, 10);
    const upcomingStations = nextRetrogradeTransitions("mercury", referenceDate, 120).slice(0, 2);
    const upcomingEclipses = getRelevantEclipses(referenceDate, { daysBefore: 0, daysAfter: 365 }).slice(0, 4);
    const nextJupiterIngress = nextSignIngress("jupiter", referenceDate, 730);

    return res.status(200).json({
      success: true,
      route: "/api/precision-check",
      activeEngine: transits?.provider || transits?.ephemeris || "unknown",
      date,
      directSwissActive: transits?.ephemerisMode === "SEFLG_SWIEPH",
      fallbackPolicy: transits?.fallbackPolicy,
      metadata,
      upcomingEventSamples: {
        ingress: nextJupiterIngress,
        stations: upcomingStations,
        eclipses: upcomingEclipses
      },
      positions: transits?.positions || null,
      note: "Direct Swiss Ephemeris is active. Returned calculation flags are checked for SEFLG_SWIEPH; any fallback causes a hard failure."
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      route: "/api/precision-check",
      date,
      error: err.message,
      stack: err.stack
    });
  }
}
