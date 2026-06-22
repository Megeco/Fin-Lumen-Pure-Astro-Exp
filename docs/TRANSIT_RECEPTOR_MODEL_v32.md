# Transit Receptor Model — v32 TRM-1

This patch adds a company-specific expression layer above the existing v31.5 replay-validation architecture.

## Locked principle

Macro transit creates weather. Sector fit creates eligibility. Natal receptor creates expression. Historical replay creates confidence. Fundamentals create investability.

The model therefore does **not** allow a transit such as Jupiter in Cancer to become a universal bullish label.

## New engine

`lib/transitReceptorFitEngine.js`

Main export:

```js
evaluateTransitReceptorFit({ company, natal, transits, replay, macro, fundamentals })
```

## Output classes

- `RERATING_TRANSIT`
- `CONSTRUCTIVE_EXPRESSION`
- `SUPPORTIVE_BUT_MUTED`
- `CONTESTED_EXPANSION`
- `NON_RESPONSIVE_OR_ROTATION_AWAY`
- `PRESSURE_EXPRESSION`
- `PRESSURE_OR_ROTATION_AWAY`
- `WEAK_OR_BACKGROUND`

## Component scores

- `sectorThemeFit`
- `natalReceptorStrength`
- `supportNetworkQuality`
- `pressureInterference`
- `sectorRotationFit`
- `historicalEcho`
- `fundamentalTransmission`
- `natalReliability`
- `expressionScore`
- `confidenceScore`

## Hard guardrails

- No rerating label if natal receptor strength is below 60.
- No clean rerating label if pressure interference is above 55.
- No strong constructive label if sector fit is below 40 unless natal receptor is exceptional.
- Confidence is capped when natal reliability is weak.
- Investment-strength language is capped when fundamental transmission is weak.

## Acutaas / Lupin / BDL logic

The same Jupiter-in-Cancer weather can now map differently:

- Acutaas-style setup: high sector fit + strong natal receptor + support network = `RERATING_TRANSIT`
- Lupin-style setup: sector fit but weaker receptor/network or more pressure = `SUPPORTIVE_BUT_MUTED`
- BDL-style setup: weak Cancer sector fit and no exceptional natal compensation = `NON_RESPONSIVE_OR_ROTATION_AWAY` or pressure expression

## Wiring

The engine is now surfaced in:

- `lib/astroEngine.js` as `transit_receptor_fit`, `transit_receptor_expression`, `transit_receptor_score`, `transit_receptor_confidence`, and `transit_receptor_reading`
- `pages/api/replay.js` as `transitReceptorFit`
- `pages/api/replay-lab.js` as `transitReceptorFit` and inside `replaySummary`
- `pages/index.js` in stock detail and research rows

## Important implementation note

`fundamentalTransmission` is currently a lightweight placeholder using available company fields/text. For production, replace or enrich it with verified balance-sheet, earnings visibility, debt, capital intensity, and sector-demand fields.
