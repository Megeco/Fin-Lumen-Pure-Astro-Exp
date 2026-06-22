import {
  getRealEphemeris
} from "./realEphemeris.js";

export function computeMacroEnvironment(date) {
  const ephemeris = getRealEphemeris(date);

  const pressure = ephemeris.pressure;
  const expansion = ephemeris.expansion;

  let recommendation = "HOLD";

  if (pressure >= 45) {
    recommendation = "TRIM & PREPARE";
  } else if (pressure >= 28) {
    recommendation = "WATCH CLOSELY";
  } else if (pressure >= 15) {
    recommendation = "WATCH CLOSELY";
  } else if (expansion >= 20) {
    recommendation = "SELECTIVE ACCUMULATION";
  }

  return {
    environment: ephemeris.environment,
    pressureScore: pressure,
    expansionScore: expansion,
    volatility: ephemeris.volatility,
    moonClimate: ephemeris.moonClimate,
    moonSign: ephemeris.moonSign,
    activeEvents: ephemeris.activeEvents.slice(0, 5),
    phases: ephemeris.phases.slice(0, 5),
    transits: ephemeris.transits,
    recommendation
  };
}

export default computeMacroEnvironment;
