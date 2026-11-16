# Running SmartDiet tests

The suite checks intended behavior, including the approved user-local day, 30-day historical edit limit, full-range scale scoring, and credit for avoiding undesirable categories. Existing application defects remain visible as failing tests. There are no expected-failure markers or disabled accessibility rules to turn these failures green.

Install the Python test environment and JavaScript dependencies:

```powershell
python -m pip install -r requirements-test.txt
npm ci
npx playwright install chromium
```

Run from the project root:

| Command | Coverage |
| --- | --- |
| `python -m pytest` | Existing and new Python units, integration regressions, and SQL budgets |
| `python -m pytest -m unit` | Score arithmetic, date boundaries, unit conversions, upload result contracts |
| `python -m pytest -m security` | Ownership/privacy, protected fields, anonymous requests, and real CSRF checks |
| `python -m pytest tests/integration` | Real routes, ORM, scheduling/history, content, nutrition, and atomicity |
| `npm run test:performance` | SQL pagination and query-count budgets |
| `npm test -- --runInBand` | JavaScript units and service integration tests |
| `npm run test:coverage` | JavaScript coverage with the existing 60% global gate |
| `npm run test:python:coverage` | Python branch/line coverage, excluding tests/migrations/fixtures |
| `npm run test:e2e` | Desktop Chromium browser journeys and accessibility |
| `npm run test:e2e:mobile` | Mobile Chromium browser journeys and accessibility |
| `npm run test:a11y` | Desktop axe scans, dialog/calendar keyboard checks, and 320px reflow |
| `npm run test:e2e:all` | Chromium/mobile/Firefox/WebKit; install all browsers first |
| `npx playwright test --list --project=chromium` | Discover browser cases without replacing the latest reports |
| `npm run test:all` | Python, JavaScript, and desktop browser suites, stopping on the first failing suite |

Python uses `config.test_settings`: an in-memory SQLite database, in-memory media storage, a plain static storage backend, and a fast test password hasher. A session guard rejects application/production settings, and an autouse fixture blocks unmocked Requests and Cloudinary calls. USDA success/failure cases use explicit stubs. Model and route tests use real migrations and ORM behavior.

Browser runs start their own Django server at `127.0.0.1:8765`, reset only `.test-data/e2e.sqlite3`, and seed synthetic accounts/content. The launcher verifies the exact database path before reset and ignores DATABASE_URL. Your ordinary database is not used. Set `SMARTDIET_E2E_PORT` to use another dedicated port. An existing server on that port causes failure instead of being reused.

The browser fixtures serve lockfile-pinned Alpine, Bootstrap, HTMX, Chart.js, and icon assets locally in place of their CDN URLs. They use real Django sessions and real page interactions. API authentication is only a setup convenience for tests that are not testing login. External backend services are disabled in this test server.

Each browser case has a fresh browser context. Database mutations use unique names; browser cases run serially against the shared synthetic database. The seed is reset at the start of each run. Test-only settings, credentials, and the launcher must never be used to deploy the application.

Results are generated under `coverage/` and `test-results/`; the HTML browser report is `coverage/playwright-report/`. Browser failures retain screenshots and traces; axe scans attach their full result JSON. Open the most recent browser report with:

```powershell
npx playwright show-report coverage/playwright-report
```

The repository already tracked an old generated Playwright HTML report and node_modules metadata before this change. Treat those as generated files; source changes belong in the test files, configs, package manifests, and documentation.

The new GitHub Actions workflow runs Python, JavaScript, and browser jobs independently and uploads artifacts even when assertions fail. It will report the current regressions until the corresponding application fixes are made. The coverage threshold was not lowered.

The query tests enforce database pagination and bounded query counts, not machine-dependent response-time assertions. Production load, PostgreSQL concurrency, real-user Web Vitals, and manual screen-reader assessment remain separate follow-up work. Automated axe checks do not establish complete WCAG conformance.

See [the analysis and acceptance plan](TESTING_ANALYSIS.md) for the reasons behind the regression cases. [The verification results](TEST_RESULTS.md) record the latest implementation-pass run.
