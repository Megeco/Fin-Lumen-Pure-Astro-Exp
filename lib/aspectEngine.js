const ASPECTS = [

  {
    name:
      "conjunction",

    angle: 0,

    orb: 8,

    weight: 3
  },

  {
    name:
      "sextile",

    angle: 60,

    orb: 4,

    weight: 1
  },

  {
    name:
      "square",

    angle: 90,

    orb: 6,

    weight: -2
  },

  {
    name:
      "trine",

    angle: 120,

    orb: 6,

    weight: 2
  },

  {
    name:
      "opposition",

    angle: 180,

    orb: 8,

    weight: -3
  }
];

function angleDifference(
  a,
  b
) {

  let diff =
    Math.abs(a - b);

  if (diff > 180) {
    diff =
      360 - diff;
  }

  return diff;
}

export function
calculateAspects(
  natal,
  transit
) {

  const results =
    [];

  const natalPlanets =
    natal.planets;

  const transitPlanets =
    transit.planets;

  for (
    const [
      transitPlanet,
      transitDegree
    ]

    of Object.entries(
      transitPlanets
    )
  ) {

    for (
      const [
        natalPlanet,
        natalDegree
      ]

      of Object.entries(
        natalPlanets
      )
    ) {

      const diff =
        angleDifference(
          transitDegree,
          natalDegree
        );

      for (
        const aspect
        of ASPECTS
      ) {

        const orb =
          Math.abs(
            diff -
            aspect.angle
          );

        if (
          orb <=
          aspect.orb
        ) {

          results.push({

            transitPlanet,

            natalPlanet,

            aspect:
              aspect.name,

            exactAngle:
              diff,

            orb:
              Number(
                orb.toFixed(
                  2
                )
              ),

            weight:
              aspect.weight
          });
        }
      }
    }
  }

  return results;
}
