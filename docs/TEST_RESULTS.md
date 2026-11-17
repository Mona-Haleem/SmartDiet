# Test and fix verification results

Verified 17 November 2026 on `codex/test-regressions-and-fixes`. The testing baseline was committed as `b9fdc97` before application fixes began. The follow-up commit contains the fixes and subsequent regression cases. Pre-existing Cloudinary/deployment changes are excluded from this commit and preserved in the working tree.

| Current suite | Passed | Failed | Total |
| --- | ---: | ---: | ---: |
| Python units, integration, security, and SQL budgets | 251 | 0 | 251 |
| JavaScript units and service integration | 325 | 0 | 325 |
| Desktop Chromium, functional and accessibility | 43 | 0 | 43 |
| Mobile Chromium, functional and accessibility | 43 | 0 | 43 |

No tests were skipped or marked as expected failures. The final pre-push browser run took 126 seconds, with zero unexpected failures, retries, or flaky passes. Automated accessibility rules remain enabled.

**Verified fixes**

- Scoped restriction, section, and media mutations to their owners, protected privileged profile fields, validated profile edits before saving, and made creation atomic. Full-plan links must reference the creator's plans of the correct category; cloning shared full plans copies linked plans when necessary.
- Implemented the approved scale/category scoring rules, finite/clamped score bounds, user-local day handling, the day-30-inclusive history edit limit, assignment idempotency, empty historical days, and correct calendar category/day payloads. New full-plan assignments use one record for both views.
- Fixed request retry/cancellation and failed-cache recovery, pagination boundaries, browser Back, resize/component cleanup, profile drafts, ingredient rollback, image deletion, month-end navigation, and duplicate chart requests.
- Fixed recipe and diet/exercise/full-plan creation through the visible UI. Corrected linked-plan option IDs, saved-plan categories, and full-plan section rendering, including empty linked plans.
- Added named native navigation/calendar/details controls, form labels, dialog focus containment/restoration, visible focus styles, readable light/dark colors, an equivalent chart table, and mobile profile reflow. The browser suite checks nine pages in both themes, creation dialogs in both themes, keyboard interactions, 320px login/profile layouts, and persisted user journeys. Two mobile previews were also inspected visually.

**Performance and coverage**

| Database fixture | Queries | Maximum |
| --- | ---: | ---: |
| Browse 24 cards from a 48-recipe library, with database pagination | 4 | 10 |
| Monthly progress, 31 days with four metrics per day | 6 | 12 |
| Calendar, 31 assigned days with batched plan start dates | 4 | 8 |

The monthly progress fixture previously used 594 queries; the calendar fixture used 34 before batching. These measurements include request authentication and use isolated SQLite. They measure database work, not production response-time capacity.

- Python application line coverage for the staged commit: **67.20%**; branch coverage: **45.74%**. The earlier working-tree measurement, including the uncommitted Cloudinary code, was 66.49% / 45.87%. The source glob and coverage exclusions are unchanged.
- JavaScript line coverage: **72.86%**; branch coverage: **63.47%**; statements: **72.17%**; functions: **73.17%**. All four unchanged 60% gates pass.
- Additional regression coverage includes encoded/invalid browser timezone cookies and timezone restoration, full-plan rendering, calendar response contracts, and component save/failure/lifecycle behavior. Coverage percentages are evidence of exercised source, not a completeness guarantee.

**Artifacts and limits**

The final commands were `python -m pytest --cov --cov-report=xml:coverage/python.xml --junitxml=coverage/pytest.xml`, `npm run test:coverage -- --json --outputFile=coverage/jest.json`, and `npx playwright test --project=chromium --project=mobile-chromium`. Reports are in `coverage/python.xml`, `coverage/pytest.xml`, `coverage/jest.json`, `coverage/coverage-summary.json`, and `coverage/playwright-report/index.html`; browser result JSON is `test-results/results.json`. SQL counts are recorded in the Python JUnit report.

Before committing, the staged source was exported to an isolated directory and all three suites were rerun successfully, preserving the same 251/325/86 case counts. This verifies the code being pushed independently of the excluded deployment edits. The Python run used `--confcutdir=.` to isolate fixture discovery. Its reports are copied to `coverage/commit-verification/`, including `python.xml`, `pytest.xml`, `coverage-summary.json`, `jest.json`, `test-results.json`, and `playwright-report/index.html`. The Cloudinary SDK is pinned in test requirements so the external-service guards work in a clean checkout; permission tests patch the SDK directly and support either local or cloud media storage.

Django checks completed with four existing warnings (one leading-slash URL and three JSONField default warnings). Migration consistency reported no changes. Whitespace checks pass for this pass's changes; existing whitespace in the pre-modified healthHub/profile-upload files remains untouched.

Firefox/WebKit, production PostgreSQL load/concurrency, real-user Web Vitals, forced-colors/zoom coverage, and manual screen-reader review have not been completed. Passing axe scans do not establish complete WCAG conformance. No production deployment or historical-data migration was performed; existing duplicate full-plan logs were not merged.

The browser supplies a validated IANA timezone cookie. Requests without a valid timezone retain the active/configured timezone until the browser supplies one. A persistent per-account timezone preference remains future work, alongside the unresolved plan-expiry/global-metric policies documented in the analysis.

## Original failing baseline

Verified 16 November 2026 before application fixes. The following records the original test-only pass and should be read as historical evidence.

| Suite | Passed | Failed | Total |
| --- | ---: | ---: | ---: |
| Python, all existing and new cases | 174 | 66 | 240 |
| JavaScript, units and integration | 139 | 10 | 149 |
| Desktop Chromium, functional and accessibility | 13 | 24 | 37 |
| Mobile Chromium, functional and accessibility | 13 | 24 | 37 |

There were no skipped Python/browser cases and no browser retries/flaky passes in the local runs. The final browser run took about 4.8 minutes. Firefox and WebKit projects are configured but were not executed in this pass.

**What changed**

- Added 174 parameterized Python cases for scoring, dates, nutrition, upload validation, ownership/privacy, CSRF, content and creation integrity, scheduling, history, and SQL query budgets.
- Added 25 JavaScript cases for request retry/cancellation, pagination, layout sizing, and lifecycle cleanup. Replaced broken/empty test placeholders with behavioral assertions, and removed the empty Card test file for the unused, unexported stub.
- Replaced the non-runnable browser drafts with 37 runnable cases, executed on desktop and mobile. These include 18 axe page/theme scans, dialog/calendar keyboard checks, 320px reflow, authentication, profile persistence, browsing, creation, and daily progress.
- Corrected stale existing Python assertions/fixtures to use current serialized response shapes, automatic subclass creation, structured directions, shared-content permissions, and the registration-to-profile redirect. Of the original 66 Python cases, 65 now pass; the existing missing-recipe 404 case remains a genuine failure.
- Added isolated test settings, external-service guards, reusable factories, local browser assets, deterministic seed data, branch coverage configuration, run commands, and independent CI jobs.

**Remaining failures**

The 66 Python failures include 65 new regressions and the existing missing-recipe 404 case. They expose privileged profile updates, foreign-user restriction mutations, section/media ownership gaps, private linked-plan references, non-atomic creation, missing media defaults, score boundaries and approved scale/category rules, user-local dates, old/future history writes, duplicate full-plan logs, nutrition error reporting, empty-day handling, and SQL query growth.

The rendered profile payload correctly excludes other users' restrictions, and its isolation regression passes. The earlier analysis observed unused all-user restriction context in the view; that should not be confused with an actual HTTP response leak.

The monthly progress SQL test observed 594 queries, including request authentication, against its budget of 12. The browse SQL test confirms that the full library is fetched before slicing and enforces a 10-query budget after database pagination is corrected. These are deterministic database checks, not production load/latency measurements.

The 10 JavaScript failures identify four request retry/cancellation problems, three pagination boundary/spread problems, two cleanup problems, and one invalid hidden-container page-size problem. Existing helper tests continue to pass. The 60% JavaScript coverage gate remains unchanged and fails as expected.

Each browser project has 13 passes and 24 failures:

- Four functional failures: correcting an invalid login without reload, restoring search results with browser Back, opening the recipe creation form, and displaying the daily Water metric even though the API contains it.
- Twenty accessibility failures: all 18 page/theme scans, dialog semantics/focus behavior, and calendar keyboard semantics. The 320px login reflow check passes.

Axe found missing button/link/input/select names, low contrast, nested interactive controls, undersized targets, missing document titles, and a scrollable region that cannot receive keyboard focus. Full scan JSON is attached to the HTML report. Automated scan results do not establish complete WCAG conformance; manual screen-reader review remains necessary.

**Coverage**

With test, migration, and fixture modules excluded from Python application coverage:

- Python line coverage: 67.83%.
- Python branch coverage: 45.98%.
- JavaScript line coverage: 17.76%.
- JavaScript branch coverage: 19.27%.

The JavaScript source glob now excludes the locally ignored unusedScripts directory. These normalized figures should be used for subsequent comparisons; the original analysis run included a different source scope and failing test setup.

**Verification and limits**

- Full Python and Jest suites executed; all new Python cases collected without setup errors.
- Desktop and mobile Chromium suites executed against the isolated migrated/seeded database, with no real USDA/Cloudinary calls.
- The pytest safety guard was checked with `--ds=config.settings` and correctly refused application database settings before test collection.
- Discovery mode was checked against hashes of the HTML and JSON reports and preserved both artifacts.
- Python source compilation succeeded. Whitespace checks for files changed in this test pass succeeded; existing whitespace in previously modified application files was preserved.
- No production deployment, credential changes, PostgreSQL load/concurrency run, real-user Web Vitals collection, or manual screen-reader audit was performed.

At this baseline, the GitHub Actions jobs intentionally reported these failures. The subsequent fix pass used the assertions as acceptance criteria; its verification is recorded above.
