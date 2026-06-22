# Fin-Lumen v35 — Natal Validation + Chart Selector

# Fin-Lumen v35 — Natal Validation + Chart Selector

Private-use release.

## Core principle

No composite charts.

The app keeps all credible corporate chart candidates available, selects the best current astro-match as the main-table default, and lets the expanded stock card compare alternate charts without blending them.

## What changed

- Added `lib/v35CandidateCharts.js` seeded from the manual pre-testing list.
- Legacy remarks from the list are intentionally ignored.
- Added `lib/natalValidationEngine.js`.
- Added `/api/natal-validation`.
- Expanded stock cards now include a Natal Validation + Chart Selector panel.
- Main table now shows chart match, selection status, score, and alternate count.
- `/api/replay` and `/api/replay-lab` can run a requested `chartId`.
- Existing TRM/replay/narrative logic remains intact.

## Status labels

- `BEST CURRENT MATCH`
- `TENTATIVE BEST MATCH`
- `LOCKED MANUAL`
- `ALTERNATE VIEW`
- `CANDIDATE`
- `INSUFFICIENT DATA`

## Important limitation

v35.0 provides the chart selector and conservative readiness scoring. Full empirical price-outcome scoring should be added in a later v35.x/v36 build through a Historical Event Store and Price Behaviour Labeller.

## User workflow

Main table:
- shows the best current astro-match chart.

Expanded stock card:
- shows all candidate charts.
- click a chart to run a chart-specific replay preview.
- no chart is averaged with another chart.


---

# Fin-Lumen Pure Astro v33.1 — Synthesis Hardening Build

This package starts from **v32 TRM-1** and restores the stronger **v31.5.4 replay/capital/governance guardrails**.


## v33.1 — Production-Hardening Patch

This build incorporates the requested P0/P1 hardening:

- **Replay Intelligence hardening:** v33.1 aligns TRM field paths, normalises receptor classes, restores capital-horizon gates, and emits `v33.1-synthesis-hardening`.
- **Contradiction Engine:** `lib/contradictionEngine.js` flags conflicts such as high signal with low natal reliability, rerating labels that violate hard stops, strategic build language during receptor-blocked cycles, and weak sector/receptor conversion.
- **Confidence calibration:** `lib/confidenceCalibrationEngine.js` separates signal strength from interpretation confidence and caps confidence when natal reliability, replay evidence or contradictions are weak.
- **Narrative consistency:** `lib/narrativeSynthesisEngine.js` now produces one chronological capital story: now → 30–60d tactical → 3–12m strategic → acceleration watch → protection/review gate → 12–24m passive posture.
- **Natal reliability weighting:** natal reliability is a first-class confidence driver and caps high-conviction language when below production-grade thresholds.
- **Actionable language:** UI-facing capital language is softened but usable: fresh allocation favoured/not favoured, selective participation, conditional allocation, capital-protection posture, and passive restraint.


Core doctrine:

```text
Macro weather → sector eligibility → natal receptor expression → pressure interference → historical confidence → capital horizon action → narrative synthesis
```

New in v33:

- `lib/narrativeSynthesisEngine.js` creates one final cycle story.
- Replay and Replay Lab emit `narrativeSynthesis` alongside `transitReceptorFit` and `replayValidationIntelligence`.
- v31 capital-horizon guardrails are restored: tactical, strategic and passive long-term verdicts.
- v31 dormancy contradiction and receptor-fit capital gates are restored.
- v31 governance docs, replay ledgers and astrology learnings registries are restored.
- Shipbuilding / defence shipyard and real estate / housing sector ontology entries are restored.

Validation:

```text
npm run calibrate ✅ passed
npm run build: environment-dependent; npm run calibrate ✅ passed in patch environment
```

See `docs/V33_SYNTHESIS_BUILD_NOTES.md`.

---

## v31.2 — Historical Episode & Forecast Interaction Display

Adds a display-only relational episode panel in Replay Lab. It connects present macro context, current natal support/pressure, sampled forward interaction checkpoints, and closest historical company episodes. It does not alter production scores, labels, windows, or actions.

MIT License

Copyright (c) 2026 Megeco

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## v30.04N — Present–Future Isolation

- Replay-date contacts, eclipse state, scores, signal, and dominant signature are now isolated from the 24-month forward scan.
- Present eclipse context is bounded to ±45 days; later tactical/strategic eclipses cannot enter the current top-contact list.
- The immediate Fin-Astro Grammar signal is authoritative for “At present”. Historical-response labels no longer override it.
- Replay JSON now exposes separate `present` and `forwardPath` objects.
- ONGC sector detection now recognises energy/commodity + PSU/institutional identity and no longer becomes consumer merely because Venus appears in contact text.
- USER natal source metadata is preserved more reliably in replay output.


## v30.04O — Episode Continuity & Network Hierarchy

- Maps the supportive slow-transit episode already active during the 120 days before a replay date.
- Distinguishes severe pressure inside an active expansion episode from a cycle-ending break.
- Resolves exact Jupiter support plus hard Saturn pressure on the same natal axis as active contested expansion unless the hard network dominates.
- Requires a genuine Jupiter/Venus/Mercury or institutional Jupiter–Saturn network before sector resonance can create a finance-rerating label. Rahu-only support remains narrative amplification.
- Adds episode context to scanned windows and keeps broad scoring weights unchanged.

## v31.2.1 display-only refinement

The Historical Episode & Forecast Interaction panel now separates macro and stock-level pressure/expansion, identifies the main drivers behind each score, classifies contacts as support / pressure / amplifier / mixed-conflict, uses weighted continuity rather than contact counts, and explains both similarities and differences in historical analogues. Production decisions remain untouched.

## v31.3.0 — Natal Source Integrity & Multi-Chart Registry

- Canonical multi-chart natal structure (`charts[]` + `preferredChartId`).
- Explicit chart types: incorporation, listing, record date, demerger effective, scheme effective, foundation.
- Default incorporation chart: 11:00 local time at incorporation city.
- Default listing/record-date chart: 09:15 Mumbai, India, Asia/Kolkata.
- Replay Lab accepts an optional chart ID for alternate-chart validation.
- Manual natal editor now requires date, time, place, timezone, chart type, chart ID, confidence and source.
- Built-in registry rows carry an audit status; unaudited legacy rows are marked pending rather than treated as verified.
- Audited multi-anchor records added for Dixon, BSE, Jio Financial and Vedanta.
- No scoring, grammar, window or historical-model calibration changes.

## v31.4 Research Natal Replay Package

- Keeps the visible production stock table clean.
- Adds hidden back-end natal candidates for incorporation, listing, record-date, statutory-formation, name-change, and demerger anchors.
- Replay Lab exposes a research-only natal-chart selector populated from `/api/natal-candidates`.
- The selected candidate is returned in `natalResearch` and `resolvedCompany`; it does not rewrite the production registry.
- `data/natalChartValidation.json` stores validated preferences and a standard replay-evaluation template.
- BSE defaults to listing; Jio Financial defaults to the validated 20 Jul 2023 record date.
- WPIL remains included as a cascading-break research case.
- No scoring, grammar, window, historical, or action calibration changes are introduced.


## v32 TRM-1 patch: Transit Receptor Model

This build adds a company-specific transit-expression layer to v31.5. The new model prevents one-transit-fits-all interpretation by routing each major transit through sector-theme fit, natal receptor strength, support-network quality, pressure interference, historical replay echo, fundamental transmission, and natal reliability.

New fields are exposed as `transit_receptor_fit` in the main stock API and `transitReceptorFit` in replay APIs. See `docs/TRANSIT_RECEPTOR_MODEL_v32.md` for scoring rules and guardrails.


## v34.0 Private Research UI Cleanup

This patch turns the expanded stock card into a private capital-research card rather than a raw astrology scanner.

Key changes:
- Adds a Dad Summary at the top of the expanded stock card.
- Adds final synthesis labels: Sector-led rerating, Natal-led constructive setup, Contested expansion, Supportive but muted, Rotation-away risk, Pressure absorption.
- Caps HIGH rerating language when TRM sector fit is weak, replay memory is missing, TRM expression is below 70, or pressure interference is high.
- Replaces casual HOLD WINNER usage with a tiered ladder: HOLD CORE → HOLD CONSTRUCTIVE CORE → HOLD WINNER.
- Adds driver type to scanner cards: Sector-led, Natal-led, Replay-led, Pressure-led, Rotation-away, Mixed.
- Reframes EXTREME cycle potential as long-range background potential and separates it from current capital usability.
- Keeps raw astro details behind the existing Astro Research Details collapse.


## GitHub compact package

This v34 compact build keeps the runtime app, data, tests, and the latest essential docs while pruning older historical build notes so the repository stays below GitHub's 100-file upload limit.
