const { config } = require('../config/env');
const { logger } = require('./logger');

/**
 * WAIT STRATEGY
 * -------------
 * 1. Playwright auto-waits before every click/fill (element attached, visible,
 *    stable, enabled), so page objects do NOT add sleeps before actions.
 * 2. For "did the page reach this state?" checks we wait on a CONDITION
 *    (element visible / URL changed), never on a fixed duration.
 * 3. For things Playwright cannot auto-wait on (a database row appearing),
 *    `pollUntil` retries a check with a deadline. It is the only place a
 *    timer is used, and it is bounded and justified.
 */

async function waitForVisible(locator, timeoutMs = config.defaultTimeoutMs) {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
}

async function waitForUrlContaining(page, fragment, timeoutMs = config.defaultTimeoutMs) {
  await page.waitForURL((url) => url.href.includes(fragment), { timeout: timeoutMs });
}

/**
 * Repeatedly runs `check` until it returns a truthy value (not undefined/null/false),
 * or the deadline passes. Use for eventual consistency (DB rows, async jobs).
 * The short sleep between attempts is intentional: there is no event to wait on.
 *
 * @param {() => Promise<any>} check
 * @param {{timeoutMs?: number, intervalMs?: number, description?: string}} options
 */
async function pollUntil(check, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const intervalMs = options.intervalMs ?? 500;
  const description = options.description ?? 'condition';
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const result = await check();
      if (result !== undefined && result !== null && result !== false) {
        logger.debug(`pollUntil: "${description}" satisfied on attempt ${attempt}`);
        return result;
      }
    } catch (error) {
      // Transient errors (e.g. a dropped DB connection) are retried until the deadline.
      lastError = error;
      logger.warn(`pollUntil: "${description}" attempt ${attempt} threw: ${String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const reason = lastError ? ` Last error: ${String(lastError)}` : '';
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}.${reason}`);
}

module.exports = { waitForVisible, waitForUrlContaining, pollUntil };
