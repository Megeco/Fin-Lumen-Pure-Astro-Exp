export const EVENT_SCORING_MAP = {

  // ==========================
  // PRESSURE EVENTS
  // ==========================

  MARS_SQUARE_PLUTO: {
    label:
      "Mars Square Pluto",

    bias:
      "PRESSURE",

    pressure:
      8.8,

    expansion:
      0.0,

    volatility:
      8.5,

    duration:
      14,

    category:
      "PANIC",

    notes:
      "Forced selling, emotional intensity, sharp drawdowns"
  },

  MARS_OPPOSE_SATURN: {
    label:
      "Mars Opposite Saturn",

    bias:
      "PRESSURE",

    pressure:
      7.8,

    expansion:
      0.0,

    volatility:
      6.8,

    duration:
      10,

    category:
      "COMPRESSION",

    notes:
      "Frustration, blocked momentum, slowdown"
  },

  SATURN_HARD_ASPECT: {
    label:
      "Saturn Hard Aspect",

    bias:
      "PRESSURE",

    pressure:
      8.2,

    expansion:
      0.0,

    volatility:
      4.5,

    duration:
      30,

    category:
      "COMPRESSION",

    notes:
      "Valuation compression, slower growth, patience required"
  },

  MERCURY_RETROGRADE: {
    label:
      "Mercury Retrograde",

    bias:
      "PRESSURE",

    pressure:
      4.2,

    expansion:
      0.0,

    volatility:
      7.2,

    duration:
      21,

    category:
      "CONFUSION",

    notes:
      "Noise, fake-outs, volatility, indecision"
  },

  SOLAR_ECLIPSE: {
    label:
      "Solar Eclipse",

    bias:
      "PRESSURE",

    pressure:
      8.5,

    expansion:
      0.0,

    volatility:
      8.4,

    duration:
      7,

    category:
      "RESET",

    notes:
      "Sudden pivots, emotional market reactions"
  },

  LUNAR_ECLIPSE: {
    label:
      "Lunar Eclipse",

    bias:
      "PRESSURE",

    pressure:
      7.6,

    expansion:
      0.0,

    volatility:
      8.0,

    duration:
      5,

    category:
      "EMOTIONAL",

    notes:
      "Sentiment swings, overshoots, emotional behaviour"
  },

  NODE_ACTIVATION: {
    label:
      "Rahu/Ketu Activation",

    bias:
      "PRESSURE",

    pressure:
      7.3,

    expansion:
      0.0,

    volatility:
      7.0,

    duration:
      20,

    category:
      "DISTORTION",

    notes:
      "Narrative excess, overreaction, amplification"
  },

  PLUTO_PRESSURE: {
    label:
      "Pluto Pressure",

    bias:
      "PRESSURE",

    pressure:
      7.0,

    expansion:
      0.0,

    volatility:
      5.5,

    duration:
      45,

    category:
      "TRANSFORMATION",

    notes:
      "Deep structural pressure and sentiment reset"
  },

  // ==========================
  // EXPANSION EVENTS
  // ==========================

  JUPITER_INGRESS: {
    label:
      "Jupiter Ingress",

    bias:
      "EXPANSION",

    pressure:
      0.0,

    expansion:
      8.4,

    volatility:
      2.0,

    duration:
      45,

    category:
      "TAILWIND",

    notes:
      "Liquidity, optimism, expansion potential"
  },

  JUPITER_TRINE_VENUS: {
    label:
      "Jupiter Trine Venus",

    bias:
      "EXPANSION",

    pressure:
      0.0,

    expansion:
      8.8,

    volatility:
      1.8,

    duration:
      14,

    category:
      "LIQUIDITY",

    notes:
      "Institutional participation and expansion"
  },

  JUPITER_TRINE_URANUS: {
    label:
      "Jupiter Trine Uranus",

    bias:
      "EXPANSION",

    pressure:
      0.0,

    expansion:
      9.1,

    volatility:
      4.0,

    duration:
      21,

    category:
      "IGNITION",

    notes:
      "Breakouts, innovation, momentum ignition"
  },

  VENUS_SUPPORT: {
    label:
      "Venus Support",

    bias:
      "EXPANSION",

    pressure:
      0.0,

    expansion:
      6.8,

    volatility:
      1.5,

    duration:
      10,

    category:
      "SENTIMENT",

    notes:
      "Improved sentiment and smoother participation"
  },

  URANUS_IGNITION: {
    label:
      "Uranus Ignition",

    bias:
      "EXPANSION",

    pressure:
      0.0,

    expansion:
      8.0,

    volatility:
      5.8,

    duration:
      20,

    category:
      "BREAKOUT",

    notes:
      "Sudden re-rating and momentum shifts"
  },

  // ==========================
  // MOON MODIFIERS
  // ==========================

  FULL_MOON: {
    label:
      "Full Moon",

    bias:
      "MODIFIER",

    pressure:
      0.0,

    expansion:
      0.0,

    volatility:
      1.0,

    duration:
      2,

    category:
      "EMOTIONAL",

    notes:
      "Emotional amplification only"
  },

  NEW_MOON: {
    label:
      "New Moon",

    bias:
      "MODIFIER",

    pressure:
      0.0,

    expansion:
      0.0,

    volatility:
      0.5,

    duration:
      2,

    category:
      "RESET",

    notes:
      "Minor reset effect"
  },

  BLUE_MOON: {
    label:
      "Blue Moon",

    bias:
      "MODIFIER",

    pressure:
      0.0,

    expansion:
      0.0,

    volatility:
      1.2,

    duration:
      1,

    category:
      "AMPLIFIER",

    notes:
      "Minor emotional amplification"
  }
};
