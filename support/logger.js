const { config } = require('../config/env');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold() {
  return LEVELS[config.logLevel] ?? LEVELS.info;
}

function write(level, message) {
  if (LEVELS[level] < threshold()) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase().padEnd(5)}] ${message}`;
  // stderr keeps log lines out of Cucumber's own progress output on stdout.
  process.stderr.write(`${line}\n`);
}

/** Minimal leveled logger. Level is controlled by LOG_LEVEL in config/.env. */
const logger = {
  debug: (message) => write('debug', message),
  info: (message) => write('info', message),
  warn: (message) => write('warn', message),
  error: (message) => write('error', message),
};

module.exports = { logger };
