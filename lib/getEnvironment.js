import {
  getRealEphemeris
} from "./realEphemeris";

export function
getEnvironment() {

  const
    ephemeris =
      getRealEphemeris();

  const
    pressureScore =
      ephemeris
        ?.pressure ?? 0;

  const
    expansionScore =
      ephemeris
        ?.expansion ?? 0;

  const
    volatilityScore =
      ephemeris
        ?.volatility ?? 0;

  let
    recommendation =
      "HOLD CORE";

  if (
    pressureScore >=
    30
  ) {

    recommendation =
      "HEAVY TRIM";
  }

  else if (
    pressureScore >=
    20
  ) {

    recommendation =
      "WATCH CLOSELY";
  }

  else if (
    expansionScore >=
    20
  ) {

    recommendation =
      "ACCUMULATE";
  }

  return {

    today:
      ephemeris
        ?.today,

    metadata:
      ephemeris
        ?.metadata
      || {},

    currentClimate:
      ephemeris
        ?.environment
      || "BALANCED",

    pressureScore,

    expansionScore,

    volatilityScore,

    moonEnvironment:
      ephemeris
        ?.moonClimate
      || "NEUTRAL",

    moonSign:
      ephemeris
        ?.moonSign
      || "-",

    recommendation,

    transits:
      ephemeris
        ?.transits
      || {},

    currentPositions:
      ephemeris
        ?.transits
        ?.positions
      || {},

    behaviourOutline:
      ephemeris
        ?.behaviourOutline
      || [],

    activeEvents:
      ephemeris
        ?.activeEvents
      || [],

    phases:
      ephemeris
        ?.phases
      || []
  };
}

export default getEnvironment;
