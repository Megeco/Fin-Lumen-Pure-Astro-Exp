# Fin-Lumen Pure Astro

## v35.4 typed gates and date clarity

Risk-window placeholders are now translated into explicit astro-pressure types with the underlying expansion, pressure and leadership scores. The card distinguishes tactical gates, strategic deployment/protection gates and long-range cycle context; a strategic WAIT can reopen only at a deployment/re-entry gate. The main table renders the exact v35 strategic capital decision, and catalyst language now reconciles macro tone with the polarity of the stock-specific natal contact.

## v35.3 capital-bucket gate sovereignty

Tactical and strategic timing are now sovereign paths. A pressure/catalyst gate tagged for existing and fresh tactical capital can rerun only those tactical buckets; it cannot pause, revoke, or defer an active strategic FULL BUILD. Strategic WAIT/PART BUILD/FULL BUILD cards now point to the next gate that actually affects strategic capital. Review language explicitly reruns Astro Truth rather than asking price behaviour to make the decision.

## v35.2 Swiss Ephemeris sovereignty

All active astronomical calculations now use direct Swiss Ephemeris `swe_calc_ut` calls through `@swisseph/node`, with bundled `.se1` files, Lahiri sidereal mode, exact UTC/Julian time, and native longitude speed. Returned flags must include `SEFLG_SWIEPH`; a Moshier or other fallback is a hard error. Natal charts, transits, nodes, ingresses, stations, macro aspects, eclipses, and historical archive generation share this one runtime. The former static JSON tables are not an execution path.

This configuration is for private/personal use. Swiss Ephemeris is dual-licensed; do not publish or operate this build as a public service under the repository's MIT notice. Before public distribution or service activation, license the whole project compatibly with AGPL-3.0 or obtain the Swiss Ephemeris Professional License.

## v35.0 decision architecture

Production decisions now follow one ordered chain: **Astro Truth → Behaviour → Capital Decision → Timing Path → Language**. The astronomical, natal, Supabase, replay and UI infrastructure is preserved; the new decision spine is isolated under `lib/v35/` and exposes a complete decision trace. See `docs/V35_0_HOLISTIC_ASTRO_TO_CAPITAL.md`.

### v35.1 window sovereignty

The table and expanded card now render `decision_v35` directly instead of recomputing v34 decisions in the UI. Catalyst proximity is translated into a typed Pressure Check, Expansion Review, or Catalyst Review with an affected capital bucket. Tactical and strategic paths stop at the next real gate. Cycle runway magnitude is recalibrated so ordinary support cannot saturate to EXTREME.
## v33.6 Capital Posture Split + Strategic Column Cleanup

This build keeps the v33.5 visual action ladder but clarifies the capital grammar:

- Existing/core posture and fresh-capital action are now treated as separate vocabularies. Fresh capital should no longer display as HOLD CORE.
- Main-table Action Bucket now follows the existing-position/tactical posture, so TRIM SATELLITE rows display as TRIM SATELLITE rather than being softened into HOLD CORE.
- Main-table Strategic Action is compact: CONDITIONAL, TACTICAL ONLY, AVOID FRESH, LEADER, WATCH GATE, etc. Full strategic explanation remains in the expanded stock card and hover/title.
- Expanded cards now include a Capital Dormancy Map showing current capital efficiency, the near astro gate, and the re-entry/scale-up gate.
- Cycle Watch wording distinguishes active tactical participation from a larger rerating runway that is still conditional.

 v33.5 — Visual Action Cleanup

This patch cleans the action legend and bucket mapping. `NO FRESH` is now a qualifier under `HOLD CORE`, not a separate tile. `WATCH CLOSELY` remains the mapped astro-gate bucket. Real trim instructions map to trim buckets.

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


## v33.1 Production Synthesis Patch

This build promotes the stronger research/replay-validation layer into production display logic. The expanded stock card now receives the research-promoted tactical, strategic, passive long-term, dormancy and protection/acceleration verdicts from the same synthesis layer used in Replay Lab.

Key changes:

- Research layer promoted into production fields via `astroEngine`.
- `narrativeSynthesisEngine` upgraded to v33.1 and fixes false early protection dates caused by matching `NO BREAK EVIDENCE` as a break.
- Passive long-term verdict now inherits the capital-horizon guardrail instead of falling back to “not resolved.”
- Eternal/Zomato receives a consumer-internet/platform-commerce sector profile.
- Eternal’s name-change chart is promoted as the preferred post-2025 production chart, while date guards prevent future event charts from being used before their event date unless explicitly selected in Replay Lab.
- Natal Registry save now falls back gracefully if older Supabase tables lack optional `audit_status`, `charts`, or `preferred_chart_id` columns.

Validation: `npm run calibrate` passed. `next build` compiled successfully; in this sandbox it timed out during Next.js trace collection after successful compilation/page generation.
