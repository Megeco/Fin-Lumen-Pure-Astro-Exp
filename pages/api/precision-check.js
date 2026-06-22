import {
  generateRealTransits
} from "../../lib/realTransitGenerator.js";
import {
  staticSwissMetadata,
  hasStaticSwissData,
  getStaticSwissEventsMetadata,
  getStaticSwissUpcomingEvents
} from "../../lib/staticSwissProvider.js";

export default async function handler(req, res) {
  const date = req.query.date || new Date().toISOString();

  try {
    const transits = generateRealTransits(date);
    const metadata = staticSwissMetadata();
    const eventsMetadata = getStaticSwissEventsMetadata();
    const upcomingAspects = getStaticSwissUpcomingEvents(date, "macroAspects", 5, 45);
    const upcomingStations = getStaticSwissUpcomingEvents(date, "stations", 5, 90);
    const upcomingEclipses = getStaticSwissUpcomingEvents(date, "eclipses", 5, 180);

    return res.status(200).json({
      success: hasStaticSwissData(),
      route: "/api/precision-check",
      activeEngine: transits?.provider || transits?.ephemeris || "unknown",
      date,
      staticSwissAvailable: hasStaticSwissData(),
      exactEventsAvailable: Boolean(eventsMetadata?.available),
      metadata,
      eventsMetadata,
      upcomingEventSamples: {
        macroAspects: upcomingAspects,
        stations: upcomingStations,
        eclipses: upcomingEclipses
      },
      positions: transits?.positions || null,
      note: hasStaticSwissData()
        ? "Static Swiss Ephemeris data layer is active. Date-only calculations use exact Swiss Ephemeris positions generated offline at 12:00 UTC for 1990-01-01 through 2032-12-31."
        : "Static Swiss data file is not available; app will fall back to astronomy-engine."
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
