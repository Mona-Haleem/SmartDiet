# SmartDiet: project analysis and test plan

Reviewed 16 November 2026. This records the analysis before test implementation. See [the run guide](TESTING.md), [the earlier fix results](TEST_RESULTS.md), and [the expanded test results](TEST_EXPANSION_RESULTS.md) for subsequent work. The product decisions below were updated on 17 November.

**Scope and agreed behavior**

The first test implementation should cover the features currently implemented in Django, Alpine.js, and the custom JavaScript components. AI assistance, nested collections, family accounts, and onboarding remain future scope. Empty model/test files for these features are not evidence that they work.

The following decisions came directly from this review:

- Daily tracking uses each user's local calendar day. The backend must know and validate the user's timezone; relying on the server's date is insufficient. Test at least UTC, Africa/Cairo, and a timezone with a different midnight.
- Historical progress changes are limited to 30 days. Proposed precise boundary: an entry dated today minus 30 days is editable; today minus 31 days is read-only. Future progress entries are rejected. Apply the policy to values, feedback, and metric configuration changes that would alter historical results.
- Avoiding an explicitly undesirable category earns full credit. Missing data must be distinguished from a recorded acceptable category.
- A 1–5 scale uses its full range: positive score = `(value - 1) / 4`; negative score = `(5 - value) / 4`. Values outside 1–5 are rejected at the write boundary.
- The description's rule that new plan assignments start today or later remains part of the expected behavior.
- Once its duration ends, continue using the same plan during tracking/backfill; do not stop or repeat it automatically.
- Metrics without a linked plan share one daily value across diet and exercise views. Tests cover reading/writing either slot and preserving that value during plan replacement.

**What the application is expected to do**

| Area | Expected observable behavior |
| --- | --- |
| Authentication | Register, log in with username/email, validate passwords, log out, and protect authenticated pages and mutations. Display useful validation errors and allow correction/retry. Registration currently redirects to profile; login redirects home. |
| Profile | Edit approved personal/health fields and avatar; calculate age correctly; manage only the current user's restrictions. Never expose or change another user's health information or privileged account fields. |
| Personal library and discovery | Browse only owned content in the personal library and only shared content in discovery. Search, filter, sort, paginate, and navigate backward/forward consistently. Render empty/loading/error states. |
| Recipes | Create, edit, delete, share, favorite, and clone recipes. Persist structured ingredients/directions, preparation time, servings, and nutrition results. A failed nutrition calculation must not look like a successful zero-nutrition result. |
| Plans | Manage diet, exercise, and full plans; link the diet/exercise parts of a full plan. Create nested sections, change their order/parent, edit rich content, and clone the complete hierarchy without changing the original. |
| Scheduling | Assign a plan from a permitted local date for its duration; handle conflicts and cancellation; preserve the independent diet/exercise slot; avoid duplicate assignments on retry. Backfill missing history according to the agreed continuation policy. |
| Progress | Track continuous, daily, boolean, scale, and category metrics. Carry continuous values forward, reset daily values, preserve historical records on deactivation, edit permitted dates, save feedback, and keep calendar/day/summary/chart values consistent. |
| Book interface | Work in two columns on appropriate desktop sizes and one column on small screens. Paging and quick navigation must reveal all content, preserve context on resize, and remain usable with keyboard, zoom, and assistive technology. |

These expectations were checked against the README, the project-description DOCX, active URL routes, models, views, templates, JavaScript services/components, and existing tests. The description also contains broader aspirations; those are not treated as implemented release requirements.

**Existing test results**

All database probes used synthetic users in an in-memory SQLite database. The pytest runs explicitly suppressed `DATABASE_URL`, keeping them off any configured remote database. Cloudinary deletion in the media probe was mocked; no real cloud media was changed.

| Check | Observed result | Interpretation |
| --- | --- | --- |
| Python test collection | 66 tests collected | Most cover auth, browsing, a few models, query construction, and pagination. There are no dedicated progress/scoring/scheduling test modules. |
| Existing Python suite with isolated database, existing application storage settings | 27 passed, 39 failed | Missing static manifest entries break many template requests. Additional failures remain in model creation, stale contracts, serializers, and missing-recipe handling. Runtime was about 72 seconds. |
| Diagnostic Python run with temporary in-memory media storage, plain static storage, and a fast test password hasher | 39 passed, 27 failed | These process-only overrides identify test-environment failures. They do not make the application suite pass and were not saved as code changes. Runtime was about 2 seconds. |
| Python coverage from the original run | 44.41% raw; 36.42% after excluding test and migration files | The raw result includes tests/migrations. The adjusted result covers 806 of 2,213 statements in the selected non-test, non-migration modules under core, healthHub, and users. Branch coverage was not measured. The failing run is a baseline, not a release gate. |
| Jest with coverage | 8 suites passed, 4 failed; 123 tests passed, 1 failed | Card and CardList test files are empty; Paginator uses undefined `descripe`; AuthForm asserts an older query signature/TTL. |
| JavaScript coverage | 14.29% lines, 15.88% branches, 12.99% functions | Below the configured global 60% thresholds. Cache/HTTP helpers are comparatively well covered; progress, editors, profile, layout, and most components are not. The glob also includes locally present ignored unusedScripts files and should be normalized before setting a new gate. |
| Playwright discovery | Failed; zero tests listed | `list.spec.js:215` contains `await` inside a non-async callback. No browser journeys executed in this review. |
| Accessibility and load testing | Not executed | Findings below come from source inspection and isolated database/query probes. There is no measured axe result, Lighthouse score, production latency, throughput, or concurrent-load result. |

Representative remaining Python failures include old two-value unpacking of the now three-value `construct_query` return; treating serialized browse JSON as model objects; expecting the old detail context key `data` instead of `ele`; string directions where structured content is expected; the registration redirect changing to profile; and `UserCreation.objects.create()` failing when its default media argument is omitted. These require distinguishing stale assertions from application defects, rather than mechanically changing assertions until tests turn green.

**Confirmed defects that need regression tests first**

| Priority | Evidence | Required regression assertion | Source |
| --- | --- | --- | --- |
| P0 | A normal authenticated user submitted `is_staff` and `is_superuser` in a profile PATCH; both became true and the response was 200. | Profile writes accept an explicit field allowlist. Privileged fields, ownership IDs, and password storage cannot change through this endpoint. | [profile update helper](D:/programing/projects/SmartDiet/users/helpers/profile_update.py:63) |
| P0 | User B updated user A's restriction with a 200 response. The profile view also builds unused all-user restriction context; subsequent HTTP regression testing confirms that the currently rendered user payload is correctly scoped. | Restriction mutations enforce ownership; a denied request leaves data unchanged. Keep a passing regression for isolation of the rendered profile payload. | [profile view](D:/programing/projects/SmartDiet/users/views.py:85), [restriction mutations](D:/programing/projects/SmartDiet/users/views.py:129) |
| P0 | A user with both staff flags false renamed another owner's plan section; response was 200. | All section operations enforce plan ownership, including target parent/sibling ownership. | [sections manager](D:/programing/projects/SmartDiet/healthHub/views.py:515) |
| P0 | A foreign media-removal request returned 200, removed the owner's media reference, and attempted Cloudinary destruction in the mocked probe. | Reject unauthorized media writes before storage calls or database changes. Cover both upload and removal. | [media manager](D:/programing/projects/SmartDiet/healthHub/views.py:341) |
| P1 | Repeating a full-plan assignment changed the same day's log count from 2 to 4. | Repeated assignment has no additional effect, and diet/exercise results remain distinct and consistent. Add concurrency coverage after defining the logical slot representation. | [assignment logic](D:/programing/projects/SmartDiet/core/helpers/assigned_plans.py:135) |
| P1 | Creating a top-level section in one plan changed the root-section order in another owner's plan from 1 to 2. | Reordering and duplicate-name checks are scoped to one plan and parent. Unrelated plans remain unchanged. | [sibling query](D:/programing/projects/SmartDiet/healthHub/views.py:540) |
| P1 | Reading a historical date with no log raised `UnboundLocalError` for `plan`. | An empty day returns the documented empty response with valid defaults; it never crashes. | [daily progress view](D:/programing/projects/SmartDiet/core/views.py:211) |
| P1 | A user with an exercise plan but no diet plan received empty `todayPlans.exercise`. | Diet-only, exercise-only, both, full-plan, and no-plan home states work independently. | [home view](D:/programing/projects/SmartDiet/core/views.py:31) |
| P1 | Negative-category scores were zero for acceptable, undesirable, and missing values. A continuous metric with start 80, target 70, value 60 returned 2.0. | Assert the approved category/scale rules and bound metric scores to 0–1; distinguish absent/invalid input from a recorded result. | [metric scoring](D:/programing/projects/SmartDiet/core/models.py:81) |
| P1 | Editing recipe ingredients passed a Recipe object to a function expecting an ingredient list and raised `TypeError` before the mocked HTTP client could be used. | Ingredient edit sends validated ingredients to nutrition calculation and persists consistent recipe/nutrition data; test failure rollback/status. | [ingredient update](D:/programing/projects/SmartDiet/healthHub/views.py:268) |
| P1 | Unsupported upload MIME returned a one-item tuple `(False,)`, but callers unpack two items. | Every validation outcome returns the documented result; invalid uploads produce a client error, never an unpacking exception. | [image validator](D:/programing/projects/SmartDiet/core/helpers/validators.py:1) |
| P1 | Fetching a missing recipe raised Recipe.DoesNotExist instead of the intended Http404. | Missing plan and missing recipe each return 404 through real routes. | [detail lookup](D:/programing/projects/SmartDiet/healthHub/views.py:202) |
| P1 | A failed QueryService request followed by retry made only one network call; the retry invoked success with null cached data. Different FormData payloads also serialized to the same cache key. | Failed results cannot become fresh successes; corrected auth submissions and repeated mutations make the required request. Cache successful reads separately from writes. | [query service](D:/programing/projects/SmartDiet/static/scripts_module/helpers/fetchData/QueryService.js:55), [auth submission](D:/programing/projects/SmartDiet/static/scripts_module/ComponentsClasses/AuthForm.js:66) |
| P1 | Assigning a plan with a past start date returned 200. The tracking code uses `date.today()` rather than a known per-user timezone. | Assignment rejects dates before local today. Day changes, edit permissions, carryover, and defaults follow the approved user-local day. | [assignment endpoint](D:/programing/projects/SmartDiet/core/views.py:908), [current-plan helper](D:/programing/projects/SmartDiet/core/helpers/assigned_plans.py:10) |

The source also contains hardcoded application/API credentials and permissive development deployment settings. Before a production release, move secrets to environment configuration, rotate any exposed live credentials, and test the actual production settings. This review did not rotate credentials or change deployment configuration.

**Unit tests to implement**

Use parameterized pytest cases for Python logic and Jest for isolated JavaScript logic. Model arithmetic can be tested with unsaved model instances; tests requiring database constraints belong in integration coverage.

| Target | Cases and assertions that matter |
| --- | --- |
| Five metric score types | Continuous increasing/decreasing goals; equal start/target; below start/beyond target; null and non-numeric values; finite numbers only. Daily positive/negative direction, target zero, negative inputs, overshoot. Boolean true/false and accepted request representations. Scale values 1–5 with exact approved endpoints and midpoint. Category membership/inverted membership, empty options/targets, and explicit no-entry state. Every score is finite and within 0–1. |
| Daily and period summaries | Empty days, averages, rounding, multiple diet/exercise records, global metrics counted according to a documented rule, missing days, and improvement direction. Verify summary scores match the chart and daily responses. |
| Date and scheduling helpers | Week/month/year boundaries; leap years; unequal month lengths; previous full year; day lists/ranges; first/last plan day; date parsing; local midnight and daylight-saving transitions. Test a title such as `Week 1 Day 3` so a week number is not mistaken for a day. |
| Nutrition and units | Weight conversions, ingredient-specific pieces, volume/density precedence, approximate/unknown units, scaling from per-100g values, nutrient units, rounding, missing nutrients, and invalid quantities. Errors/approximation warnings must remain observable to the caller. |
| Forms and validators | Approved field ranges, true defaults, 0 versus absent values, positive servings/durations, malformed structured ingredients/directions, duplicate names, password rules, and age around birthdays/leap day. Test manager creation without an explicit media argument. |
| QueryCache / QueryService / ApiService | Retain useful existing tests; add failed-request recovery, non-cacheable writes, body-sensitive read keys where appropriate, concurrent request deduplication, stale refresh failure, cancellation, method-specific CSRF/signal handling, network errors, and session-expiry redirects. Use fake timers rather than waiting for TTLs. |
| Frontend components and layout | Page/size bounds, zero-height and hidden containers, breakpoint changes, current item/section preservation, ingredient parsing/serialization, category keyboard navigation, and optimistic update rollback. Test component teardown, resize unsubscription, and cancellation of animation/timers. |

The resize helper adds and removes different anonymous listener functions, so unsubscribe cannot remove the registered callback. Component deletion also clears instance properties before its listener cleanup. Add focused lifecycle tests and measure repeated navigation for listener/registry growth; do not assert a memory leak size that has not been measured.

**Integration tests to implement**

Use pytest-django with the real ORM, migrations, URL resolver, middleware, templates, and database constraints. Use Django Client with `enforce_csrf_checks=True` for the CSRF subset; the ordinary test client bypasses CSRF checks. Frontend integration tests should combine real components/services with a controlled HTTP boundary; mocking each collaborating class separately would miss their contracts.

| Workflow | Essential assertions |
| --- | --- |
| Authorization matrix | Anonymous, owner, authenticated non-owner; private/shared content; GET/POST/PATCH/DELETE as supported. Shared content is readable/cloneable under policy, not editable by another user. Denied requests cause no storage calls or database changes. Include profile field injection and foreign restriction/section/media IDs. |
| Account/session behavior | Registration and profile redirect; login by username/email; duplicate email and username derivation collisions; failed login followed by corrected login; logout and expired session; redirects restricted to acceptable destinations. Password hashing still receives a dedicated check using the production hasher. |
| Browsing and response contracts | Real owned/shared fixtures; all filters together; invalid/unsupported sort fields; malformed page/size values and upper limits; empty/last page; stable tie ordering; navigate versus fetch headers; correct JSON schema and detail URLs. Parse JSON before testing serialized items. |
| Creation/edit/clone/delete | Base + Recipe/Plan + LinkedPlan creation remains atomic; failure cannot leave an orphan. Verify preparation time/servings/default sections. Clone nested sections and references with independent IDs and valid parents. Test base IDs differing from concrete recipe/plan IDs. |
| Section hierarchy | Rename/create/reparent/reorder/delete; unique siblings within a plan; root isolation; self-parent/cycles; cross-plan parents; descendant deletion and stable order. Force a failure midway through a multi-row operation and assert rollback. |
| Schedule persistence | Diet/exercise/full combinations; exact duration; future start; conflict override/cancel; replacement on the first day and later days; retry idempotency; missing linked subplan; metric initialization/carryover; no loss of the independent plan slot. |
| Progress/history | Each metric type round-trips through create/update/value endpoints; zero/false values remain valid where appropriate; activate/deactivate/delete preserves history. Test local-day edit limits at day 29, 30, and 31, future dates, feedback policy, empty dates, and period/chart consistency. |
| Nutrition HTTP boundary | Patch Requests or use a local stub for USDA success, no results, malformed payload, timeout, 429, and 5xx. Assert the number of requests, timeout policy, visible partial/failure state, and stored totals. Routine CI must not depend on USDA availability or quotas. |
| Media/storage boundary | Validate content, size, and decoded image integrity; replace avatar; upload/remove owned media; preserve shared cloned media; cleanup after database failure; cloud upload/delete failure; unknown IDs. Mock Cloudinary and use temporary/in-memory media storage. Include storage-aware avatar display: the current existence check looks only on local disk despite the Cloudinary backend. |
| Database integrity | Run real migrations against SQLite and the PostgreSQL backend used by the supplied production configuration. Assert uniqueness/idempotency under simultaneous requests and atomic replacement. Add constraints for logical daily slots/metric entries only after the full-plan representation is made unambiguous. |

**End-to-end tests to implement**

Repair the runner before adding journeys. The existing setup project matches a `setup/auth.setup.js` path that does not exist at that location; it has no browser-project dependencies. The global-setup file is not wired into the config, refers to an absent seed command, and uses a shell-specific environment prefix. Several browser tests use old `/diet/browser/...` routes instead of `/diet/collections/browse/...`. Hardcoded credentials and an uncreated storage-state file make results non-reproducible. Setting DB_NAME alone also does not isolate the server when DATABASE_URL takes precedence.

Use an isolated migrated and seeded database, a dedicated port, explicit test settings, generated users, and isolated state per worker. Test setup must override DATABASE_URL and storage configuration. Do not reuse an arbitrary server for automated runs. Serve the app's normal frontend dependencies reproducibly.

The first browser suite should contain these high-value journeys:

1. Register, reach profile, log out, log in by username/email, and recover from invalid credentials without reloading manually.
2. Edit approved profile fields and restrictions; upload an avatar; reload and verify persistence. Check a second user's profile remains isolated.
3. Create and edit a recipe, including structured ingredients, directions, servings, and mocked nutrition; reload; favorite/share; discover it as another user; clone it; verify the original remains unchanged.
4. Create a diet/exercise plan, nest and reorder sections, use quick navigation, edit rich content, clone the tree, and delete a section. Include a keyboard-accessible alternative to dragging.
5. Assign diet and exercise plans independently, then a full plan; exercise both conflict choices; verify calendar/day/home agreement and no duplicates after repeat submission.
6. Create all five metric types, enter values/feedback, verify exact scores and chart/summary agreement, deactivate/reactivate a metric, and reload.
7. Edit an allowed historical date and reject an out-of-window date. Repeat with browser timezone contexts spanning different local days.
8. Search/filter/paginate, use browser back/forward, resize while on a later page, and verify the relevant item/section remains visible. Exercise an empty result.
9. Simulate save/upload/nutrition failures and expired sessions; verify visible errors, useful retry, and optimistic state rollback.
10. Perform the core journey with keyboard only at a narrow viewport and with reduced motion enabled.

Run the core suite in Chromium on every PR, with desktop and a representative mobile viewport. Run the broader suite in Firefox and WebKit on a scheduled CI job or before release. Use role/label locators, web-first assertions, and traces/screenshots on failure. Do not force clicks or replace failures with DOM-presence assertions when the requirement is actual visibility/usability.

**Performance: measured issues and planned checks**

| Area | Current evidence | Test and proposed first target |
| --- | --- | --- |
| Browse database access | With 48 synthetic recipes, the view used 5 queries for one card and 51 for 24 cards. It also issued an unbounded base-content SELECT: `len(query)` evaluates the complete queryset before pagination. | Compare datasets of 24, 1,000, and 10,000 records. Assert database pagination uses COUNT/LIMIT and relation fetches are batched. Proposed target: at most 10 queries for 24 cards on the tested browse path, with no growth proportional to total library size. |
| Period progress | Four daily metrics produced 22 queries for one logged day and 592 queries for 31 days. Repeated score calculation/relation traversal causes query growth. | Add an assertNumQueries/CaptureQueriesContext regression for 31 and 365 days. Proposed target: at most 12 queries for the monthly fixture, using batched related data, while preserving exact results. The permitted count may vary by endpoint representation; record it explicitly. |
| Backfill and assignment | Missing history is filled synchronously in loops with per-log/per-metric existence queries and writes. Some home/day reads trigger this work. | Compare 1, 30, and 365 missing days with several active metrics; record queries, rows, elapsed time, and lock behavior. Verify repeat calls add no rows and preserve user edits. Batch work before introducing a background queue. |
| Nutrition | One synchronous USDA request per ingredient, with a 10-second timeout on each request; failures are skipped and totals can appear complete. | Mock 1/10/30 ingredients with timeout/429 scenarios. Assert bounded request counts, reuse/deduplication policy, timeout handling, and explicit incomplete results. A healthy recipe save must not wait for a long series of failed remote calls. |
| Browser layout and lifecycle | Pagination writes layout styles and reads element dimensions; resize/component cleanup has concrete defects. Cards have no explicit lazy loading or image dimensions in the active template. | Profile long sections, large media, repeated navigation, resize bursts, and rapid search. Check request deduplication, retained listeners/component count, animation cancellation, content visibility, and layout shifts. Keep unit geometry tests separate from actual browser layout tests. |
| External frontend assets | Bootstrap, Alpine, HTMX, icons, and chart resources are loaded from external CDNs; Alpine uses a floating major-version URL. | Exercise slow/failed assets and measure a reproducible production-like build. Pin or package essential resources before trusting screenshot and performance baselines. |

After functional fixes, use a staging environment with production-like PostgreSQL, representative data, and an agreed concurrency profile for load tests. A provisional starting scenario is 10 then 50 active users, mainly browsing/progress reads with some saves. Proposed API goal: read p95 under 500 ms, mutation p95 under 1 second excluding separately measured external jobs, and zero unexpected server errors. These are proposed acceptance budgets, not measurements or capacity guarantees; tune them against actual hosting and traffic.

For frontend quality, track LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 at the 75th percentile, separately for mobile/desktop, following [Core Web Vitals guidance](https://web.dev/articles/vitals). Use Lighthouse CI for repeatable lab diagnostics; collect real-user data for INP and field percentiles. A single Lighthouse score does not establish real-user performance.

**Accessibility: necessary checks**

The description specifies WCAG 2.1 AA. Cover that baseline and use WCAG 2.2 AA as the preferred target for new controls. The current templates show concrete semantic gaps: clickable calendar days are divs without keyboard interaction, calendar arrows/card menus have no accessible names, the chart canvas has no text/data alternative, the creation overlay lacks dialog semantics, and the common CSS removes focus outlines. No rendered contrast or screen-reader audit has been performed, so this is not a conformance finding.

- Add `@axe-core/playwright` scans to login, registration, home, profile, browse/discovery, recipe details, plan details, and progress. Scan open menus/dialogs, validation errors, inactive metrics, loading/error states, and both themes. Assert no unresolved violations in the agreed rules; do not hide page regions to obtain a pass.
- Test keyboard reachability and visible focus for every action: calendar navigation/selection, card menus, pagination, section navigation/reordering, autocomplete, editor controls, theme toggle, and media viewer. Use appropriate native controls or a complete documented widget keyboard pattern.
- Test dialog initial focus, focus containment, Escape dismissal, focus restoration, accessible name, and background inaccessibility. Ensure validation errors are associated with fields and announced, and save/loading status is perceivable.
- Test 200% text resize, 400% browser zoom/reflow, 320 CSS-pixel width, and short landscape screens. The book interface must expose all text/actions without clipping or forcing two-dimensional reading. Paging itself is not automatically a WCAG violation; the rendered reflow behavior is what matters. See [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Check text contrast, non-text control/focus contrast, both themes, forced-colors/high-contrast mode, visible selected states beyond color alone, and target sizes. Test reduced motion for book/page animations and chart effects.
- Provide an accessible chart name plus equivalent trend summary/table. Verify calendar selected/today/plan states and rich-editor structures are understandable with a screen reader.
- Manually review the core flows with NVDA on Windows; use VoiceOver/Safari when that environment is available. Axe does not establish full keyboard, reading-order, or screen-reader usability; [Playwright's accessibility guidance](https://playwright.dev/docs/accessibility-testing) explicitly recommends combined automated and manual assessment.

**Implementation order and tooling**

1. Stabilize the harness: rename `pytest.init` to a recognized configuration file, add explicit test settings, isolate databases/storage/external services, repair the Jest/Playwright syntax/setup failures, normalize coverage inputs, and correct stale test contracts. Pytest's supported configuration files are documented in [its configuration reference](https://docs.pytest.org/en/stable/reference/customize.html).
2. Write failing P0 authorization/privacy regressions, then fix those defects. Add all confirmed P1 reproductions with their associated fixes. Keep permission, idempotency, and rollback assertions close to the database behavior they protect.
3. Complete score/date/nutrition units and progress/scheduling/content integration tests against the agreed rules. Include real migrations and PostgreSQL checks before relying on concurrency guarantees.
4. Add the small core browser suite and accessibility state scans, then browser/viewport coverage. Keep broad visual snapshots to stable pages and representative states; assert behavior and persistence directly.
5. Add query budgets immediately with optimizations. Establish production-like latency, load, and frontend baselines after functional correctness, then gate meaningful regressions.

The existing pytest, pytest-django, pytest-cov, Jest, Testing Library, and Playwright libraries are sufficient for the initial functional work. Use pytest fixtures/monkeypatch and unittest.mock before adding factory, HTTP-stubbing, or time-freezing libraries. Add `@axe-core/playwright` for accessibility; add `@lhci/cli` for the frontend performance CI phase. Locust is an optional staging-load tool once the traffic profile is agreed. Cypress would duplicate the existing Playwright stack and is unnecessary.

No additional libraries were needed or installed for this analysis. Django itself is not directly pinned in requirements.txt even though it is installed; pin direct runtime and test dependencies, including image handling dependencies, so clean environments reproduce the results.

For CI, run units/integration, branch coverage, query budgets, Chromium core journeys, and critical accessibility checks on PRs; retain trace/coverage artifacts. Run broader cross-browser and load tests separately. The present GitHub workflow only keeps the database active; it does not run the test suite. `npm run test:all` also omits Python tests.

Do not lower the current JavaScript coverage threshold merely to get a green build. Repair the suite and define the real source scope first. A reasonable staged goal is at least 80% line/branch coverage for business-critical scoring, scheduling, permissions, and nutrition modules, with explicit boundary cases required regardless of percentage. Coverage percentages are secondary to the listed behavioral assertions. A release should have no unresolved P0 defects, a green deterministic functional suite, passing query budgets, and completed accessibility checks with documented limitations.

**Remaining product details for the implementation pass**

- The browser now supplies a validated IANA timezone cookie; invalid/missing values fall back to the active/configured timezone. A persistent per-account preference and settings UI remain future work.
- Plan continuation and shared global daily values are now confirmed, and have regression tests. The precise weighting of a global metric in an aggregate spanning both slots still needs a product decision; tests do not assume a new weighting rule.
- The implemented edit boundary includes day 30 and rejects day 31/future writes. Whether later target/options changes should preserve historical snapshots or recompute past scores still needs a separate product decision.
- Keep the current registration-to-profile route as the initial onboarding step unless that behavior is deliberately changed.

These details do not prevent the initial harness, authorization, or confirmed-defect work. They need explicit decisions before their dependent assertions are implemented.
