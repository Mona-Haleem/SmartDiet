# Expanded test results

This records the historical test-only failing baseline. The subsequent [application fix verification](TEST_FIX_RESULTS.md) resolves these failures and records the current passing results.

Updated 19 November 2026 on `codex/test-regressions-and-fixes`, after the passing baseline at commit `249f29b`. This pass adds tests and test infrastructure. It does not fix the newly exposed application defects. Existing Cloudinary/deployment edits remain separate and untouched.

The expansion adds 352 Python cases, 55 JavaScript cases, and 13 browser journeys/state checks executed on both desktop and mobile (26 cases). Parameterized inputs count as separate cases. This is 433 additional cases across the three runners; it is not 433 distinct defects.

| Suite | Passed | Failed | Executed |
| --- | ---: | ---: | ---: |
| Python units, routes/ORM, security, and SQL budgets (SQLite) | 463 | 136 | 599 |
| PostgreSQL concurrent transactions | 3 | 1 | 4 |
| JavaScript units and component/service integration | 370 | 10 | 380 |
| Desktop Chromium functional/accessibility | 46 | 10 | 56 |
| Mobile Chromium functional/accessibility | 43 | 13 | 56 |

The Python/JavaScript and PostgreSQL results were verified on 17 November; the final desktop/mobile browser run completed on 19 November. SQLite deliberately deselects the four PostgreSQL cases; all four were executed against PostgreSQL separately. There are no collection/setup errors or expected-failure markers in these runs. Failures remain normal failing assertions and will fail CI.

## Behavior covered

- All five metric types through actual create/configure/value/day routes; malformed payloads, missing IDs, unsupported methods, invalid values, allowed dates, rollback, feedback slot isolation, and inactive/unused metric cleanup.
- Assignment initialization and defaults, continuous carryover without future/foreign data, conflict replacement, partial replacement of full plans, preserving existing/shared values, synchronization, multi-day rollback, and the HTTP assignment entry point. Real PostgreSQL tests use separate concurrent database connections.
- Daily, weekly, monthly, and yearly summaries; leap/year boundaries; previous-period comparison; empty periods; selected diet/exercise filtering; full-plan child selection and day numbering; scale/category display and scoring.
- Recipe/plan CRUD and authentication, invalid mutations without partial writes, serving/preparation units, structured directions, independent nested clones, cross-type naming collisions, internal reference remapping, section parenting/cycles, and executable reference URLs.
- Form validation, ingredient shape/deduplication, profile field atomicity, username validation, avatar byte/storage behavior, medical restriction transitions, and nutrition unit/density/error boundaries without external calls.
- Rich text selection/formatting, lists and block editing, escaped text and safe links, internal references, editor cancellation/retry, and component DOM replacement/registry lifecycle.
- Browser persistence/cancellation of plan sections and recipe directions; save failure drafts; global metric values across views; profile activity persistence; editor keyboard semantics; and open rich-editor, metric, and inactive-metric dialogs in both themes.

The tests use the confirmed rules: local calendar days, edits aged 0–30 days inclusive, full-range scale scores, credit for avoiding undesirable categories, continuing the same plan beyond its duration, and one shared daily value for unlinked metrics across diet/exercise. They do not invent a new weighting rule for global metrics in aggregates across both slots.

## Coverage

| Source measured | Line coverage | Branch coverage |
| --- | ---: | ---: |
| Python, current working tree including pre-existing deployment edits | 90.19% (2059/2283) | 85.60% (642/750) |
| Python, exported `249f29b` application source plus these tests/test settings | 91.26% (2056/2253) | 85.51% (643/752) |
| JavaScript application source | 90.25% (1843/2042) | 80.74% (977/1210) |

For the same exported application source, the earlier Python baseline was 67.20% lines / 45.74% branches. The earlier JavaScript baseline was 72.86% / 63.47%. Python still measures `core`, `healthHub`, and `users`, excluding tests/migrations/fixtures. JavaScript keeps the existing active-source globs and excludes the ignored unused scripts. The coverage scope and 60% JavaScript gates were not narrowed/lowered to obtain these results. Jest now excludes temporary `.test-data` copies from both test and module discovery, preventing duplicated cases and module collisions.

Coverage includes code exercised by failing tests. These percentages do not establish correctness or release readiness. JavaScript statements are 89.32% and functions 87.58%; its coverage gates pass, but ten behavioral assertions fail.

The Python CLI's combined percentage mixes lines and branches. The table reports them separately using `covered_lines / num_statements` and `covered_branches / num_branches` from the JSON report.

The exported-source Python run has the same 463 passing / 136 failing cases as the working-tree run. Its artifacts are in `coverage/expansion-clean-source/`, independently of the existing Cloudinary implementation. Remaining unexercised Python code is concentrated in legacy/duplicate view paths and cloud deployment paths; a live cloud integration is outside this isolated test pass.

## Defects requiring fixes

Each item below groups related failing assertions; parameterized failures must not be counted as independent bugs.

1. **Assignment HTTP requests can return 500.** The previous locking fix calls `type(user).objects` in `set_plan`. Authentication supplies a `SimpleLazyObject` through `request.user`, which has no model manager. Direct helper tests missed this; the new diet/exercise/full assignment route tests expose it.
2. **Validation and atomicity are incomplete.** Several invalid metric/content/profile/restriction requests accept bad data, partly save changes, or return server errors instead of a clear client error. New-log/metric creation and some configuration writes need transaction boundaries.
3. **Progress views disagree.** Global daily values can diverge/disappear across slots or reset on replacement. Feedback can target the wrong slot. Period averages/charts mix plan types; full-plan child metrics/day numbering and unlinked goal text are inconsistent. Some scale/category summaries display the wrong result.
4. **Content references and rich text need validation.** Cloned references still point into the source tree, cross-type name collisions can cause a server error, and executable URL schemes/color attribute injection are accepted. JavaScript internal references can omit their plan ID.
5. **Profile persistence/storage has gaps.** Invalid usernames are accepted, arbitrary bytes with an image MIME type can pass upload validation, avatar display checks the local filesystem instead of the configured storage, and changing a restriction type does not update every relevant field. The activity selection reloads with the wrong value.
6. **Editors/components lose expected state.** Failed editor saves close the draft. DOM replacement initializes the removed node, fails to rebind the component root, or removes useful content after an empty response.
7. **Concurrent first value writes duplicate history.** Two requests both succeed but create two `UserLog` rows for the same daily slot. The assignment concurrency cases pass; the first-value path needs equivalent synchronization/uniqueness protection.
8. **Monthly averages issue repeated queries.** The 31-day average endpoint uses 96 queries against a budget of 10.
9. **Mobile page navigation can be blocked.** On the newly created plan and recipe detail pages, the cover image intercepts clicks on the next-page arrow. Tests retain normal hit-target checks instead of forcing clicks through the image. This prevents several mobile editor assertions from being reached.
10. **Open dialogs have accessibility gaps.** Metric/inactive dialogs have unnamed close buttons and missing dialog roles; metric selects lack names. Rich-editor controls have contrast issues and missing dialog semantics. Section edit icons lack button semantics/keyboard access. Mobile diet/exercise buttons also lose their accessible names when their text is hidden. Full axe findings are attached to the browser report.

## Performance and test strength

| SQLite fixture, including request authentication | Queries | Budget | Result |
| --- | ---: | ---: | --- |
| Browse 24 cards from 48 recipes | 4 | 10 | Pass |
| Monthly progress, 31 days with four metrics/day | 6 | 12 | Pass |
| Calendar, 31 assigned days | 4 | 8 | Pass |
| Monthly average, 31 days with one metric/day | 96 | 10 | Fail |
| Daily progress with 30 metric relations | 8 | 10 | Pass |

These are deterministic database-work checks, not production latency/load measurements. Query counts are recorded in the pytest JUnit properties.

The new PostgreSQL job uses PostgreSQL 17, an isolated test database, real transactions, a thread barrier, and separate connections. The local disposable cluster was stopped after the run. It never connects to the application's configured database.

Four focused seeded faults were all detected: inverted category credit, truncated scale scoring, removed restriction ownership, and removed media ownership. Each selected baseline passed before mutation; imports were checked to come from the temporary source copy. This is a four-fault smoke check, not a whole-project mutation score. See `coverage/mutation-smoke.json` and the retained temporary logs.

## Browser and accessibility verification

The final command was `npx playwright test --project=chromium --project=mobile-chromium`: 89 passed, 23 failed, zero skipped, zero retries/flaky passes, in about 7.4 minutes. All 86 cases from the earlier browser baseline still pass. The new desktop section save/cancel and recipe-direction save/reload cases pass.

Nine functional and fourteen accessibility cases fail. Seven mobile cases stop at the cover image intercepting the next-page control before reaching their editor assertions; these are recorded as navigation failures, not completed editor/accessibility scans. The remaining failures expose lost drafts, missing shared values, incorrect activity display, keyboard semantics, missing dialog roles/names, and axe violations (`button-name`, `select-name`, `color-contrast`). Soft assertions collect scan and semantic findings together while still failing the case; no rules or page regions are disabled.

Browser runs use a newly reset synthetic database, local lockfile-pinned frontend assets, real sessions/routes, normal clicks/typing, and both themes. A mobile failure screenshot was also inspected to confirm the visible image/arrow overlap. Browser code coverage is not included in the Jest percentages above.

## Reports and limits

Run commands and isolation details are in [TESTING.md](TESTING.md). Current artifacts include `coverage/python-expanded.json`, `coverage/pytest-expanded.xml`, `coverage/jest-expanded.json`, `coverage/coverage-summary.json`, `coverage/postgres.xml`, `coverage/mutation-smoke.json`, and the browser HTML report at `coverage/playwright-report/index.html`. Browser failures retain screenshots/traces and full axe JSON attachments; structured browser results are in `test-results/results.json`.

Firefox/WebKit execution, staging load/capacity tests, real-user Web Vitals, full zoom/forced-colors testing, and manual NVDA/VoiceOver review remain unverified. They need suitable environments and representative data. Automated axe scans and Chromium emulation do not establish full WCAG conformance or real-device behavior. Future AI/family/onboarding features remain outside the implemented-feature scope.
