import {
  ephemerisMetadata,
  generateRealTransits
} from "../../lib/realTransitGenerator.js";
import {
  getRelevantEclipses
} from "../../lib/realEclipseEngine.js";

// Compatibility route retained so an older GitHub checkout cannot keep an
// Astronomy Engine import alive. The filename is legacy; its engine is Swiss.
export default function handler(req, res) {
  const input = req.query.date || new Date().toISOString();

  try {
    const transits = generateRealTransits(input);
    const date = transits.dateOnly;
    const eclipses = getRelevantEclipses(date, {
      daysBefore: 0,
      daysAfter: 365
    }).slice(0, 4);

    return res.status(200).json({
      success: true,
      route: "/api/debug-astronomy",
      compatibilityRoute: true,
      activeEngine: "Swiss Ephemeris",
      provider: transits.provider,
      ephemerisMode: transits.ephemerisMode,
      fallbackPolicy: transits.fallbackPolicy,
      metadata: ephemerisMetadata(),
      positions: transits.positions,
      upcomingEclipses: eclipses,
      note: "Legacy route name only. All calculations use direct Swiss Ephemeris."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      route: "/api/debug-astronomy",
      activeEngine: "Swiss Ephemeris",
      fallbackPolicy: "hard-fail",
      error: error.message
    });
  }
}
