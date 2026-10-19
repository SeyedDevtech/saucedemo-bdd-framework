const dotenv = require('dotenv');
const path = require('path');

// Load config/.env if it exists. Real environment variables (e.g. from CI)
// always win over the file, because dotenv never overrides existing values.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

function readString(name, fallback) {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '' ? value.trim() : fallback;
}

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['true', '1', 'yes'].includes(raw.trim().toLowerCase());
}

function readBrowser() {
  const value = readString('BROWSER', 'chromium').toLowerCase();
  if (!['chromium', 'firefox', 'webkit'].includes(value)) {
    throw new Error(`BROWSER must be chromium, firefox or webkit, got "${value}"`);
  }
  return value;
}

/** Single source of truth for all environment-based settings. */
const config = {
  baseUrl: readString('BASE_URL', 'https://www.saucedemo.com'),
  browser: readBrowser(),
  headless: readBoolean('HEADLESS', true),
  slowMo: readNumber('SLOW_MO', 0),
  defaultTimeoutMs: readNumber('DEFAULT_TIMEOUT_MS', 10000),
  navigationTimeoutMs: readNumber('NAVIGATION_TIMEOUT_MS', 30000),
  logLevel: readString('LOG_LEVEL', 'info').toLowerCase(),
  db: {
    enabled: readBoolean('DB_ENABLED', false),
    host: readString('DB_HOST', 'localhost'),
    port: readNumber('DB_PORT', 5432),
    database: readString('DB_NAME', 'shop_test'),
    user: readString('DB_USER', ''),
    password: readString('DB_PASSWORD', ''),
    poolMax: readNumber('DB_POOL_MAX', 5),
    connectTimeoutMs: readNumber('DB_CONNECT_TIMEOUT_MS', 5000),
  },
};

module.exports = { config };
