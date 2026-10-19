const { chromium, firefox, webkit, selectors } = require('playwright');
const { config } = require('../config/env');
const { logger } = require('./logger');

// SauceDemo marks elements with `data-test`, not Playwright's default `data-testid`.
// Setting this once lets page objects use the clean getByTestId() API.
selectors.setTestIdAttribute('data-test');

const launchers = { chromium, firefox, webkit };

/** Launches the browser chosen by BROWSER / HEADLESS / SLOW_MO in config/.env. */
async function launchBrowser() {
  logger.info(
    `Launching ${config.browser} (headless=${config.headless}, slowMo=${config.slowMo}ms)`,
  );
  return launchers[config.browser].launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });
}

/** Creates a fresh, isolated context (own cookies/storage) so scenarios never share state. */
async function createSession(browser) {
  const context = await browser.newContext({
    baseURL: config.baseUrl,
    viewport: { width: 1280, height: 720 },
  });
  context.setDefaultTimeout(config.defaultTimeoutMs);
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  const page = await context.newPage();
  return { context, page };
}

module.exports = { launchBrowser, createSession };
