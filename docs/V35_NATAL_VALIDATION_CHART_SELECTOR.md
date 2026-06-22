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
