# Test implementation results

Verified 16 November 2026. This pass adds tests and test infrastructure; it does not fix the application defects identified in the analysis.

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

The GitHub Actions jobs intentionally report the current failures. The next implementation pass should fix the P0 permission/privacy defects first, then scoring/history/scheduling and the four browser failures, using these assertions as the acceptance criteria.
