# SauceDemo BDD Automation Framework

A small, scalable BDD UI automation framework for https://www.saucedemo.com

**Stack:** Playwright (browser automation) + Cucumber.js (BDD / Gherkin) + JavaScript

## What it tests

| Scenario | Tags | What is validated |
|---|---|---|
| Successful purchase of a single product | `@smoke @happy-path` | Login succeeds (Products page visible), cart badge updates to 1, cart shows the product, Checkout Complete page visible |
| Invalid login shows error | `@smoke @negative` | Error message displayed, user stays on the login page |

## Project structure

```
/features     Gherkin .feature files only
/steps        Step definitions (call page methods; contain NO selectors)
/pages        Page Objects: all locators + page actions
/support      Driver factory, hooks, screenshot on failure, waits, logger, DB utility, World
/config       env.js (JavaScript environment settings) + .env.example
/testdata     users.json, checkout.json (fixture-style data)
/reports      Generated HTML/JSON report (git-ignored)
/screenshots  Failure screenshots (git-ignored)
```

---

## 1. Setup instructions

Prerequisites: **Node.js 18+** (tested on Node 22) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Download the browser Playwright will drive
npm run install:browsers

# 3. Create your local config (no real credentials are needed for SauceDemo)
cp config/.env.example config/.env          # Windows PowerShell: copy config\.env.example config\.env
```

## 2. How to run tests

| Command | What it does |
|---|---|
| `npm test` | Run all scenarios |
| `npm run test:smoke` | Run only `@smoke` scenarios (tag-based execution) |
| `npm run test:negative` | Run only `@negative` scenarios |
| `npm run test:headed` | Run with a visible browser window |
| `npm run test:parallel` | Run scenarios in 2 parallel workers |
| `npm run dry-run` | Check every Gherkin step has a definition (no browser) |
| `npm run typecheck` | JavaScript compile check |

After a run, open `reports/cucumber-report.html`. Failure screenshots are saved in `/screenshots` and embedded in the report.

## 3. How to change browser / headless mode

Edit `config/.env`:

```
BROWSER=chromium     # chromium | firefox | webkit
HEADLESS=false       # false = watch the test run
SLOW_MO=300          # optional: slow each action by 300 ms (good for demos)
```

Or override for one run without editing the file (cross-platform):

```bash
npx cross-env BROWSER=firefox HEADLESS=false npm test
```

Real environment variables always win over `config/.env`, which is how CI configures the run.
If you use Firefox or WebKit, install it first: `npx playwright install firefox` / `webkit`.

## 4. Assumptions

- SauceDemo's public demo accounts (`standard_user` / `secret_sauce`) are used. They are published on the site's own login page, so they are not secrets. `.env.example` contains no credentials.
- SauceDemo exposes stable `data-test` attributes, so those are the base of the locator approach.
- SauceDemo has no database, so the DB utility is written and documented but no scenario calls it. PostgreSQL (`pg`) is assumed as the example driver.
- Each scenario launches its own browser, so scenarios never share state (also what makes parallel runs safe).

---

## Locator Strategy for Adding “Sauce Labs Backpack”

Implemented in `pages/ProductsPage.js`. Both strategies are written as working code; the primary one is what the test uses.

### 1. Robust locator strategy (preferred): scope to the product card, then find the button inside it

```ts
// 1) Find the product CARD whose name is exactly the product we want
page.getByTestId('inventory-item')
    .filter({ has: page.getByTestId('inventory-item-name').filter({ hasText: /^Sauce Labs Backpack$/ }) })
// 2) Inside that card, find the button by its accessible role and name
    .getByRole('button', { name: /add to cart/i })
```

**Why it is robust**

- It identifies the product by what a user sees (its **name**), not by where it sits in the list. Sorting the list or adding a product does not break it.
- The button is found by its **role and label** ("button", "Add to cart"), which is how a user and assistive technology find it. This also catches accessibility regressions.
- The product name is a parameter, so the same code adds any product (reusable, one place to maintain).
- Scoping to the card guarantees we click the Backpack's button, never another product's button.
- No index (`nth(0)`), no long XPath chain.

### 2. Fallback locator strategy (acceptable, less ideal): data-test built from the product name

```ts
page.getByTestId('add-to-cart-sauce-labs-backpack')   // generated from the name: lowercase, spaces to hyphens
```

**Why it is only a fallback**

- It is short and fast, and a `data-test` attribute is a deliberate test hook, so it is far better than index or XPath.
- But it depends on the developers' naming convention for that attribute. If they rename it, or the product name changes, it breaks silently.
- It also checks nothing about what the user sees (the button label).

**Avoided on purpose:** `(//button)[1]`, `nth()` by position, and long chains such as `//div[3]/div/div[2]/button`.

---

## Database testing with automation

SauceDemo has no database, so this section shows the **integration design**.

### DB connection utility (working code): `support/db.js`

- **Config-driven:** host, port, database, user, password, pool size and timeout all come from `config/.env`. Nothing is hard-coded. `DB_ENABLED=false` by default.
- **Query execution:** `query(sql, params)` runs parameterised SQL and returns rows. `queryOne` and `waitForRows` build on it.
- **Error handling:** every driver error is wrapped in a `DbError` with a readable message. Missing or disabled config fails fast with a clear instruction. Values are never concatenated into SQL, which prevents SQL injection.
- **Clean teardown:** each query releases its connection in a `finally` block (success or failure), and `closeDb()` ends the pool in the `AfterAll` hook. It is safe to call even if the DB was never used.

### DB validation demonstration (pseudocode)

Goal: after the UI shows "Thank you for your order!", prove the order really exists in the database.

```text
Scenario: Purchase is stored in the database            @db

BEFORE scenario
    runId      = "qa-" + shortUniqueId()                       # isolation key
    customer   = { firstName: "QA", lastName: runId, email: runId + "@example.test" }
    startedAt  = now()

WHEN the UI test completes checkout using `customer`           # normal page-object steps

THEN validate the DB record
    sql = "SELECT order_id, status, total_amount, item_count
             FROM orders
            WHERE customer_email = $1
              AND created_at    >= $2
            ORDER BY created_at DESC
            LIMIT 1"

    row = waitForRows(sql, [customer.email, startedAt],        # retry, see below
                      timeout = 10s, interval = 500ms)

    assert row.status       == "CONFIRMED"
    assert row.item_count   == 1
    assert row.total_amount == total shown on the UI overview page

AFTER scenario (always runs, even on failure)
    DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE customer_email = $1)
    DELETE FROM orders      WHERE customer_email = $1
    closeDb() at the end of the whole run
```

**Isolation strategy**

- Every scenario creates its own unique customer (`runId` in the email), and the query filters by that email and by `created_at >= startedAt`. Parallel scenarios and leftover data from old runs can never be confused with this run's data.
- Run against a dedicated test database or schema, never production.
- Assert only on rows this scenario created. Never assume "the latest order in the table" is ours.

**Cleanup strategy**

- An `After` hook (tagged `@db`) deletes only the rows matching this scenario's `runId`, child tables first. It runs on pass and on fail.
- Safety net: a scheduled job purges rows whose email starts with `qa-` and are older than a few hours, in case a run was killed mid-way.
- Preferred when available: create and remove test data through an API or seed script instead of raw deletes.

**Eventual consistency (retry logic)**

- The UI can confirm an order a moment before the backend commits it. A single immediate query would be flaky.
- `waitForRows` (in `support/db.js`, built on `pollUntil` in `support/waits.js`) re-runs the query every 500 ms until the row appears or a 10 s deadline passes. On timeout it fails with a clear message including the last error.
- Transient errors (like a dropped connection) are retried until the deadline. No fixed `sleep`.

---

## Engineering notes

**1. Why did you choose this framework structure?**
Each folder has exactly one job, which matches the required layout. Features describe behaviour in plain language. Steps are thin glue. Pages own every locator and UI action. `support` owns cross-cutting plumbing (browser, hooks, waits, logging, DB). Config and test data are kept outside the code. The payoff is that a UI change is fixed in one page class, a new scenario usually needs only a feature file, and nobody has to read selectors to understand a test. I chose Playwright because it auto-waits and gives role-based locators; Cucumber.js because it is the standard Gherkin runner; JavaScript to catch mistakes (typos in page methods, wrong data shapes) before running.

**2. How does your wait strategy prevent flakiness?**
There are no hard sleeps in UI code. Playwright waits automatically before every click and fill until the element is attached, visible, stable and enabled. Where I need to confirm a state, I wait on a **condition** (`waitForVisible`, `waitForUrlContaining`, `waitForCartBadgeCount`), so the test continues the instant the app is ready and only fails after a bounded timeout (`DEFAULT_TIMEOUT_MS`). The one place with a timer is `pollUntil`, used for DB eventual consistency, because a database row has no event to wait on; it is bounded by a deadline and logs each failure. Cucumber's step timeout (60 s) is longer than Playwright's (10 s), so the clearer Playwright error is reported first.

**3. How does your locator strategy improve stability?**
Locators target stable, meaningful identifiers (`data-test` hooks, element roles, visible names) instead of position or DOM structure. The Backpack is found by name within its own card, so sorting, adding or removing products cannot change which button is clicked. All locators sit in page classes, so if one does break there is exactly one place to fix.

**4. How would you scale this to 50+ scenarios?**
Keep the same separation and add: more page objects (and a shared component class for header/cart widgets); a `Background:` or login helper to remove repeated setup, and storing a logged-in session (`storageState`) to skip UI login in most tests; tags (`@smoke`, `@regression`, `@db`) to select suites; parallel workers (`--parallel`, already safe because each scenario has its own browser); data-driven `Scenario Outline` with `Examples`; the HTML/JSON report for triage; and a small lint/review rule that steps never contain selectors.

**5. How would you execute this in CI/CD?**
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request: checkout, set up Node, `npm ci`, install the Playwright browser with its system dependencies, run `npm test` headless, then upload `reports/` and `screenshots/` as artifacts (even on failure). Config comes from environment variables (`BASE_URL`, `BROWSER`, `HEADLESS`), and DB credentials would come from repository secrets, never from files. `@smoke` runs on every push for fast feedback; the full suite runs on pull requests or nightly. A failed scenario is retried once in CI (`retry` in `cucumber.js`).

**6. Two improvements with more time**
(a) Add real DB-backed scenarios against a test environment with seed and cleanup, using the existing utility, and compare UI totals with stored totals. (b) Reuse login via Playwright `storageState` and add API-level setup (e.g. pre-fill the cart) so UI tests only exercise the behaviour under test, making the suite faster and less brittle. Also: Playwright trace on failure and visual checks.

---

## Bonus items included

- **Tag-based execution:** `@smoke`, `@negative`, `@happy-path`, `@login`, `@purchase` (`npm run test:smoke`)
- **HTML reporting:** `reports/cucumber-report.html` (with failure screenshots embedded)
- **GitHub Actions CI file:** `.github/workflows/ci.yml`
- **Retry logic:** one retry in CI via `cucumber.js`; `pollUntil` for DB polling

---

## AI / Copilot usage disclosure

**Whether AI tools were used:** Yes. Claude (Anthropic) was used as a coding assistant.

**What parts were AI-assisted:** The initial scaffold of the framework (folder layout, page objects, step definitions, hooks, driver factory, wait utilities, DB utility), the first draft of the feature files, and the first draft of this README.

**What I modified and why:**
> ✏️ **TO BE FILLED IN BY ME BEFORE SUBMITTING** — list the real changes I made after reading and running the code, for example: locator or wait changes, renamed methods, test data tweaks, anything I tested on SauceDemo and fixed, and why. Delete this note once written.

I reviewed every file, ran the suite myself, and I can explain and modify any part of it in the technical discussion.
