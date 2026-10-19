const { After, AfterAll, Before, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');
const { closeDb } = require('./db');
const { createSession, launchBrowser } = require('./driverFactory');
const { logger } = require('./logger');

// Cucumber's own per-step timeout. Must be larger than Playwright's timeouts
// so that Playwright reports the clearer error first.
setDefaultTimeout(60 * 1000);

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');

function safeFileName(text) {
  return text.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

// A browser per scenario (instead of one shared browser) keeps scenarios fully
// isolated and also works unchanged with `cucumber-js --parallel`.
Before(async function (scenario) {
  logger.info(`START  ${scenario.pickle.name}`);
  this.browser = await launchBrowser();
  const { context, page } = await createSession(this.browser);
  this.context = context;
  this.page = page;
});

After(async function (scenario) {
  const status = scenario.result?.status;

  if (status === Status.FAILED && this.page) {
    try {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const file = path.join(
        SCREENSHOT_DIR,
        `${safeFileName(scenario.pickle.name)}_${Date.now()}.png`,
      );
      const image = await this.page.screenshot({ path: file, fullPage: true });
      // Embeds the screenshot in the HTML report too.
      await this.attach(image, 'image/png');
      logger.error(`Scenario failed. Screenshot saved: ${file}`);
    } catch (error) {
      logger.warn(`Could not capture screenshot: ${String(error)}`);
    }
  }

  logger.info(`END    ${scenario.pickle.name} -> ${status}`);

  // Always tear down, even after failures, so no browser processes are left behind.
  await this.context?.close();
  await this.browser?.close();
});

AfterAll(async function () {
  await closeDb(); // no-op when no scenario used the database
});
