# Expanded-suite fix verification

Verified 19 November 2026 on `codex/test-regressions-and-fixes`. The application now passes the expanded suite that previously exposed 136 SQLite failures, one PostgreSQL concurrency failure, ten JavaScript failures, and 23 browser failures. This report supersedes the [test-only expansion results](TEST_EXPANSION_RESULTS.md).

| Suite | Passed | Failed |
| --- | ---: | ---: |
| Python units, routes/ORM, security, SQL budgets | 601 | 0 |
| PostgreSQL concurrent transactions | 4 | 0 |
| JavaScript units and component/service integration | 383 | 0 |
| Desktop Chromium functional/accessibility | 56 | 0 |
| Mobile Chromium functional/accessibility | 56 | 0 |

SQLite deliberately deselects the four PostgreSQL cases; all four were executed separately using PostgreSQL 17 and independent concurrent connections. Browser cases have no skipped tests, retries, or flaky passes. The same functional assertions and axe rules remain enabled.

## Changes verified

- **Progress writes and concurrency:** authenticated user wrappers now work with the assignment lock. Mutations validate payloads before saving, run inside transactions, serialize writes for each user, preserve zero/false values, report newly created logs correctly, and roll back partial work on failure. Concurrent first saves now produce one daily log and one metric entry. Backfill uses the same user lock.
- **Shared values and plan views:** global daily values remain synchronized across diet/exercise slots, survive full/partial plan replacement, and initialize new slots from the shared value. Global continuous values carry forward from either slot. Feedback targets the requested slot. Day/period summaries select the correct plan type and full-plan child, retain the assignment's start date, and display global goals correctly.
- **Scoring and performance:** scale scoring no longer depends on a numeric target label; category summaries name the category to avoid; invalid scale labels retain a readable fallback. Monthly averages prefetch metric relations and filter the requested plan type. Read-only endpoints avoid unnecessary mutation transactions.
- **Content integrity:** recipe/plan/section edits accept supported fields only and validate names, booleans, quantities, preparation/duration units, ingredient shapes, structured details, section order/parenting, and reference URLs. Missing IDs return not-found responses. Clone names respect cross-type uniqueness, and internal section references point into the new tree.
- **Profile:** usernames use model validation; profile fields remain atomic; avatar uploads verify image contents and avatar display uses configured storage. Restriction changes validate their type/reference and update all associated fields. Activity and sleep-quality forms receive their stored choice values on reload.
- **Editors and components:** failed saves retain the draft for retry. Successful saves/cancellation still work and persist across reload. Component replacements initialize the inserted DOM, rebind their root/data/registry, transfer root listeners, and preserve existing content after an empty response. Rich text rejects executable link schemes and unsafe attributes, while internal references retain the plan ID.
- **Accessibility and mobile:** section/direction editing and page arrows use named native buttons; page arrows stay above the cover image. Rich-editor, metric, and inactive dialogs have names/roles, keyboard containment, Escape handling, and focus restoration. Controls keep accessible names at mobile widths. Open-dialog colors use readable theme tokens, including nested button text.

Two Python regressions were added for global continuous carryover and profile choice-value reloads, plus three JavaScript focus-containment cases. One fixture described plan-specific carryover while constructing a global tracker; it now links that tracker to its diet plan. Its assertion remains unchanged, and a separate regression protects global carryover across slots. No assertions, accessibility rules, coverage scopes, or coverage thresholds were weakened.

## SQL budgets

Counts include request authentication and are recorded in the pytest JUnit properties. They measure database work, not production latency/capacity.

| Fixture | Queries | Budget |
| --- | ---: | ---: |
| Browse 24 cards from 48 recipes | 4 | 10 |
| Monthly progress, 31 days with four metrics/day | 6 | 12 |
| Calendar, 31 assigned days | 4 | 8 |
| Monthly average, 31 days with one metric/day | **4**, previously 96 | 10 |
| Daily progress with 30 metric relations | 8 | 10 |

## Coverage and other checks

| Source verified | Lines | Branches |
| --- | ---: | ---: |
| Python application code prepared for this commit | 90.58% | 84.36% |
| JavaScript application code | 90.20% | 80.83% |

New validation/dialog code is included in these figures. Coverage excludes tests/migrations/fixtures and the previously excluded unused JavaScript, using the same source scope as before. Python line/branch percentages are calculated separately from the JSON report; the CLI's combined percentage differs. JavaScript statements are 88.94%, functions 87.36%, and all unchanged 60% gates pass.

The earlier full-working-tree measurement, including the excluded Cloudinary edits, was 89.57% Python lines / 84.44% branches. Before committing, the prepared source was verified independently in an isolated copy. Its reports are retained under `coverage/push-verification/`; the two files containing both application fixes and deployment changes were split without modifying the deployment edits in the working tree.

All four seeded scoring/ownership faults were detected again after the fixes, with a passing baseline required before each temporary mutation. This is a focused smoke check, not a whole-project mutation score.

Django checks pass with four existing warnings: one leading-slash URL and three JSONField default warnings. Migration consistency reports no changes. Whitespace checks pass for this fix pass; existing whitespace in the separately modified Cloudinary/deployment code is preserved.

## Reproduction and artifacts

Run from the repository root:

```powershell
python -m pytest -m "not postgresql" --cov --cov-report=json:coverage/python-fixed.json --cov-report=xml:coverage/python-fixed.xml --junitxml=coverage/pytest-fixed.xml
python scripts/run_postgres_tests.py --bin-dir 'C:\Program Files\PostgreSQL\17\bin'
npm run test:coverage -- --json --outputFile=coverage/jest-fixed.json
npx playwright test --project=chromium --project=mobile-chromium
python scripts/check_test_mutations.py
```

Reports: `coverage/python-fixed.json`, `coverage/python-fixed.xml`, `coverage/pytest-fixed.xml`, `coverage/postgres.xml`, `coverage/jest-fixed.json`, `coverage/coverage-summary.json`, `coverage/mutation-smoke.json`, `test-results/results.json`, and `coverage/playwright-report/index.html`. The browser report includes full axe scan results for both themes and viewports.

Tests use synthetic databases/storage and block external backend services. The disposable PostgreSQL cluster was stopped. Existing deployment configuration and Cloudinary implementation were preserved outside this commit; no live cloud integration, production deployment, schema migration, or repair of pre-existing duplicate/conflicting history was performed. All future writes through the tested routes use the corrected behavior.

Firefox/WebKit execution, staging load/capacity tests, real-user Web Vitals, full zoom/forced-colors checks, and manual NVDA/VoiceOver review remain unverified. Passing Chromium/axe checks do not establish complete WCAG conformance or real-device behavior.
