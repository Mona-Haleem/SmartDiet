# Running SmartDiet tests

The suite checks intended behavior, including user-local days, the day-30-inclusive historical edit limit, full-range scale scoring, credit for avoiding undesirable categories, continued use of the same plan after its duration, and one shared daily value for global metrics. See [the latest fix verification](TEST_FIX_RESULTS.md) for passing counts and coverage. [The test-only expansion results](TEST_EXPANSION_RESULTS.md) preserve the defects found before these fixes.

Install the Python test environment and JavaScript dependencies:

```powershell
python -m pip install -r requirements-test.txt
npm ci
npx playwright install chromium
```

Run from the project root:

| Command | Coverage |
| --- | --- |
| `python -m pytest -m "not postgresql"` | Python units, integration regressions, and SQL budgets using SQLite |
| `python -m pytest -m unit` | Score arithmetic, date/timezone boundaries, unit conversions, upload result contracts |
| `python -m pytest -m security` | Ownership/privacy, protected fields, anonymous requests, and real CSRF checks |
| `python -m pytest tests/integration` | Real routes, ORM, scheduling/history, content, nutrition, and atomicity |
| `npm run test:performance` | SQL pagination, monthly progress, and calendar query-count budgets |
| `npm test -- --runInBand` | JavaScript units and service integration tests |
| `npm run test:coverage` | JavaScript coverage with the existing 60% global gate |
| `npm run test:python:coverage` | Python branch/line coverage, excluding tests/migrations/fixtures |
| `python scripts/run_postgres_tests.py --bin-dir 'C:\Program Files\PostgreSQL\17\bin'` | Four concurrent transaction cases in a disposable PostgreSQL cluster |
| `python scripts/check_test_mutations.py` | Confirm selected regressions detect four seeded scoring/ownership faults |
| `npm run test:e2e` | Desktop Chromium browser journeys and accessibility |
| `npm run test:e2e:mobile` | Mobile Chromium browser journeys and accessibility |
| `npm run test:a11y` | Desktop axe scans, open rich-editor/metric/inactive dialogs, keyboard checks, and 320px reflow |
| `npm run test:e2e:all` | Chromium/mobile/Firefox/WebKit; install all browsers first |
| `npx playwright test --list --project=chromium` | Discover browser cases without replacing the latest reports |
| `npm run test:all` | Python, JavaScript, and desktop browser suites, stopping on the first failing suite |

Python uses `config.test_settings`: an in-memory SQLite database, in-memory media storage, a plain static storage backend, and a fast test password hasher. A session guard rejects application/production settings, and an autouse fixture blocks unmocked Requests and Cloudinary calls. USDA success/failure cases use explicit stubs. Model and route tests use real migrations and ORM behavior.

The four `postgresql` cases require real row locking and separate connections. The SQLite command above deselects them; running plain `pytest` with SQLite reports them as skipped. Run the PostgreSQL command separately before claiming complete backend verification. The runner initializes a unique cluster under `.test-data/`, chooses a loopback port, runs the tests, and stops the server in `finally`. It retains the cluster and server log for inspection. Provide the directory containing `initdb`, `pg_ctl`, and `createdb`, or omit `--bin-dir` if they are on PATH. Do not run this helper as root on Unix systems.

CI uses its own PostgreSQL service. The explicit `SMARTDIET_TEST_POSTGRES_PORT` switch accepts only ports 1024–65535, fixes the host to `127.0.0.1`, uses role/database `smartdiet_tests`, and creates `test_smartdiet_tests`. The optional password is `SMARTDIET_TEST_POSTGRES_PASSWORD`. Application `DATABASE_URL` credentials are never used.

The mutation helper copies application source and tests to a unique `.test-data/` directory, verifies imports come from that copy, requires each selected baseline to pass, and then applies one temporary fault at a time. Only assertion failures count as detection; collection/setup failures do not. It writes `coverage/mutation-smoke.json`. Four detected faults are a focused confidence check, not a full mutation score.

Browser runs start their own Django server at `127.0.0.1:8765`, reset only `.test-data/e2e.sqlite3`, and seed synthetic accounts/content. The launcher verifies the exact database path before reset and ignores DATABASE_URL. Your ordinary database is not used. Set `SMARTDIET_E2E_PORT` to use another dedicated port. An existing server on that port causes failure instead of being reused.

The browser fixtures serve lockfile-pinned Alpine, Bootstrap, HTMX, Chart.js, and icon assets locally in place of their CDN URLs. They use real Django sessions and real page interactions. API authentication is only a setup convenience for tests that are not testing login. External backend services are disabled in this test server.

Each browser case has a fresh browser context. Database mutations use unique names; browser cases run serially against the shared synthetic database. The seed is reset at the start of each run. Test-only settings, credentials, and the launcher must never be used to deploy the application.

Results are generated under `coverage/` and `test-results/`; the HTML browser report is `coverage/playwright-report/`. Browser failures retain screenshots and traces; axe scans attach their full result JSON. Open the most recent browser report with:

```powershell
npx playwright show-report coverage/playwright-report
```

The repository already tracked an old generated Playwright HTML report and node_modules metadata before this change. Treat those as generated files; source changes belong in the test files, configs, package manifests, and documentation.

The GitHub Actions workflow runs SQLite Python, PostgreSQL concurrency, JavaScript, and browser jobs independently and uploads artifacts even when assertions fail. Assertion failures and the unchanged JavaScript coverage gate fail their respective jobs. SQL query counts are included as properties in the Python JUnit report. The expanded suite now passes locally; future regressions will fail CI with the same assertions and accessibility rules.

The query tests enforce database pagination and bounded query counts, not machine-dependent response-time assertions. Local PostgreSQL concurrency is now exercised, but production load, full cross-browser verification, real-user Web Vitals, zoom/forced-colors checks, and manual screen-reader assessment remain follow-up work. Automated axe checks do not establish complete WCAG conformance.

See [the analysis and acceptance plan](TESTING_ANALYSIS.md) for the reasons behind the regression cases, and [the latest fix results](TEST_FIX_RESULTS.md) for current verification and remaining environment/manual checks.
