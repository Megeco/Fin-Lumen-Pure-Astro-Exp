export function
translateMacro(
  resonance
) {

  const
    volatility =
      resonance
        .environmentVolatility;

  const
    pressure =
      resonance
        .pressureScore;

  const
    expansion =
      resonance
        .expansionScore;

  const
    moon =
      resonance
        .moonEnvironment;

  const
    clusters =
      resonance
        .activeClusters ||
      [];

  const
    behaviour =
      resonance
        .resonanceProfile
        ?.likelyBehaviour
      ||
      "Mixed";

  let recommendation =
    "🔵 HOLD CORE — normal volatility";

  if (
    pressure >=
    80
  ) {

    recommendation =
      "🔴 HEAVY TRIM — protect capital";
  }

  else if (
    pressure >=
    65
  ) {

    recommendation =
      "🟠 HEAVY TRIM — reset risk active";
  }

  else if (
    pressure >=
    55
  ) {

    recommendation =
      "🟡 TRIM SATELLITE — protect excess";
  }

  else if (
    volatility >=
    60
  ) {

    recommendation =
      "⚫ WATCH CLOSELY — trigger forming";
  }

  else if (
    expansion >=
    70
  ) {

    recommendation =
      "🟢 ACCUMULATE — strong window active";
  }

  let environment =
    resonance
      .environmentType;

  if (
    pressure >=
    75 &&
    volatility >=
    60
  ) {

    environment =
      "EXTREME PRESSURE";
  }

  return {

    environment,

    pressureScore:
      pressure,

    expansionScore:
      expansion,

    volatility,

    moonEnvironment:
      moon,

    activeTransits:
      clusters,

    behaviour,

    recommendation
  };
}
