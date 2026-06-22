const PLANET_WEIGHTS = {

  saturn: 3,

  jupiter: 3,

  mars: 2.5,

  rahu: 2.5,

  ketu: 2.5,

  sun: 2,

  moon: 1,

  mercury: 1,

  venus: 1
};

function getPlanetWeight(
  planet
) {
  return (
    PLANET_WEIGHTS[
      planet
    ] || 1
  );
}

function orbStrength(
  orb,
  maxOrb
) {
  return Math.max(
    0,
    (
      maxOrb -
      orb
    ) / maxOrb
  );
}

export function
calculateResonance(
  aspects
) {

  let pressure =
    0;

  let expansion =
    0;

  const ranked =
    [];

  for (
    const aspect
    of aspects
  ) {

    const planetPower =
      getPlanetWeight(
        aspect
          .transitPlanet
      );

    const orbPower =
      orbStrength(
        aspect.orb,
        8
      );

    const signal =
      aspect.weight *
      planetPower *
      orbPower;

    if (
      signal > 0
    ) {

      expansion +=
        signal;

    } else {

      pressure +=
        Math.abs(
          signal
        );
    }

    ranked.push({

      ...aspect,

      signalStrength:
        Number(
          signal
            .toFixed(2)
        )
    });
  }

  ranked.sort(
    (a, b) =>
      Math.abs(
        b.signalStrength
      ) -
      Math.abs(
        a.signalStrength
      )
  );

  let dominantTheme =
    "Balanced";

  if (
    expansion >
      pressure *
        1.5
  ) {

    dominantTheme =
      "Expansion Regime";
  }

  else if (
    pressure >
      expansion *
        1.5
  ) {

    dominantTheme =
      "Pressure Regime";
  }

  else if (
    pressure > 5 &&
    expansion > 5
  ) {

    dominantTheme =
      "High Volatility Expansion";
  }

  return {

    pressureScore:
      Number(
        pressure.toFixed(
          2
        )
      ),

    expansionScore:
      Number(
        expansion.toFixed(
          2
        )
      ),

    dominantTheme,

    topSignals:
      ranked.slice(
        0,
        8
      )
  };
}
