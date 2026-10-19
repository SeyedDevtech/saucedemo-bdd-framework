# Walkthrough video script (target: 6.5–7 minutes)

Record your screen with your face/voice (Loom, OBS, or Zoom). Speak in your own words; these are talking points, not lines to read. Run the tests once BEFORE recording so you know they pass.

Tip: set `SLOW_MO=300` and `HEADLESS=false` in `config/.env` so the browser is easy to follow on screen.

| Time | Show on screen | Say (key points) |
|---|---|---|
| 0:00–0:30 | README top | Who you are. "This is a BDD framework for SauceDemo using Playwright, Cucumber and JavaScript." Two scenarios: purchase flow and invalid login. |
| 0:30–1:30 | VS Code folder tree | Architecture: `features` (Gherkin only) → `steps` (glue, no selectors) → `pages` (locators + actions) → `support` (plumbing) + `config` + `testdata`. Why: one job per folder, a UI change is fixed in one place. |
| 1:30–2:30 | `purchase.feature` → `purchase.steps.js` → `ProductsPage.js` | BDD flow: follow one line, "I add Sauce Labs Backpack to the cart", from feature to step to page method. Point out that steps contain no selectors and the product name is a parameter. |
| 2:30–3:45 | `ProductsPage.js` locator section | Locator strategy: primary = find the product card by name, then the button by role inside it. Fallback = `data-test` built from the name. Why primary is more stable; what you avoided (index, long XPath). |
| 3:45–5:00 | `driverFactory.js`, `hooks.js`, `waits.js`, `logger.js` | Driver factory reads browser/headless from `.env`. Hooks: browser per scenario for isolation, screenshot on failure, always close the browser. Waits: no hard sleeps, wait on conditions, Playwright auto-wait; `pollUntil` is the only timer and is for DB. |
| 5:00–5:50 | `db.js` + README DB pseudocode | Config-driven pool, parameterised queries, `DbError`, `finally` release, `closeDb`. Pseudocode: unique runId for isolation, `waitForRows` for eventual consistency, cleanup in `After`. |
| 5:50–6:40 | Terminal | Run `npm run test:headed`. Watch it run. Open `reports/cucumber-report.html`. Mention `npm run test:smoke`, tags, and the CI file. |
| 6:40–7:00 | README | Tradeoffs: browser per scenario is slightly slower but fully isolated; two improvements (DB scenarios, storageState login). Mention the AI disclosure honestly. |

---

# Live technical discussion cheat sheet (15 minutes)

**"Modify a locator live"** — open `pages/ProductsPage.js`.
- Change the cart badge: edit `cartBadge` getter (`getByTestId('shopping-cart-badge')`) → e.g. `page.locator('.shopping_cart_badge')`. Say why the `data-test` version is more stable.
- Switch the Backpack test to the fallback: in `purchase.steps.js` change `addToCart` to `addToCartUsingFallback`, run `npm run test:smoke`.

**"Add a small assertion"** — open `steps/purchase.steps.js`.
- After adding to cart, assert the button flipped to "Remove": add a step
  `Then "Sauce Labs Backpack" should show a Remove button` that calls `this.productsPage.isRemoveButtonVisibleFor(name)` (the method already exists) and `assert.ok(...)`. Add the line to `purchase.feature`.
- Or assert the cart page URL contains `/cart.html`.

**"Explain your wait strategy"** — three sentences:
1. Playwright auto-waits before every click and fill.
2. For state checks I wait on a condition (visible / URL), never a fixed time, so tests are fast when the app is fast and still bounded when it is slow.
3. The only timer is `pollUntil`, for DB eventual consistency, with a deadline and clear failure message.

**Likely questions**
- Why a browser per scenario? Isolation and parallel safety; tradeoff is a bit more startup time.
- Why `data-test` for the test id? SauceDemo uses it; `selectors.setTestIdAttribute('data-test')` in `driverFactory.js` makes `getByTestId` work.
- Where does config come from? `config/env.js` reads `config/.env`; real env vars override (that is how CI works).
- What would you do about slow login in 50+ tests? Reuse a saved session (`storageState`).
