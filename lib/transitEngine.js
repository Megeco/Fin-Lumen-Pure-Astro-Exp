import {
  generateRealTransits
} from "./realTransitGenerator.js";

export function generateTransitChart(date) {
  const targetDate =
    date ||
    new Date()
      .toISOString()
      .split("T")[0];

  const transits = generateRealTransits(targetDate);

  return {
    date: targetDate,
    planets: {
      sun: transits.sun,
      moon: transits.moon,
      mercury: transits.mercury,
      venus: transits.venus,
      mars: transits.mars,
      jupiter: transits.jupiter,
      saturn: transits.saturn,
      rahu: transits.rahu,
      ketu: transits.ketu
    },
    positions: transits.positions,
    ayanamsa: transits.ayanamsa,
    status: "computed-real-sidereal"
  };
}

export default generateTransitChart;
