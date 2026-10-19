const { Pool } = require('pg');
const { config } = require('../config/env');
const { logger } = require('./logger');
const { pollUntil } = require('./waits');

/** Wraps driver errors so tests see one consistent, readable error type. */
class DbError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'DbError';
    this.cause = cause;
  }
}

let pool;

/** Creates the pool on first use (lazy), entirely from config/.env values. */
function getPool() {
  if (!config.db.enabled) {
    throw new DbError('Database access is disabled. Set DB_ENABLED=true in config/.env.');
  }
  if (!config.db.user) {
    throw new DbError('DB_USER is not set. Copy config/.env.example to config/.env and fill it in.');
  }
  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: config.db.poolMax,
      connectionTimeoutMillis: config.db.connectTimeoutMs,
    });
    // An idle client can error (e.g. server restart). Log it instead of crashing the run.
    pool.on('error', (error) => logger.error(`Idle DB client error: ${error.message}`));
    logger.info(`DB pool created for ${config.db.host}:${config.db.port}/${config.db.database}`);
  }
  return pool;
}

/**
 * Runs a parameterised query and returns the rows.
 * Always pass values via `params` ($1, $2 ...) - never build SQL with string concatenation.
 *
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<object[]>}
 */
async function query(sql, params = []) {
  const activePool = getPool();
  let client;
  try {
    client = await activePool.connect();
    logger.debug(`SQL: ${sql}`);
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    if (error instanceof DbError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new DbError(`Query failed: ${message}`, error);
  } finally {
    // Return the connection to the pool on success AND on failure.
    if (client) client.release();
  }
}

/** Convenience for "I expect exactly one row (or none)". */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

/**
 * Eventual consistency helper: the UI may confirm an order a moment before the
 * backend commits the row. Poll until the query returns enough rows or time runs out.
 *
 * @param {string} sql
 * @param {any[]} params
 * @param {{minRows?: number, timeoutMs?: number, intervalMs?: number, description?: string}} options
 */
async function waitForRows(sql, params = [], options = {}) {
  const minRows = options.minRows ?? 1;
  return pollUntil(
    async () => {
      const rows = await query(sql, params);
      return rows.length >= minRows ? rows : undefined;
    },
    {
      timeoutMs: options.timeoutMs ?? 10000,
      intervalMs: options.intervalMs ?? 500,
      description: options.description ?? `at least ${minRows} row(s) for: ${sql}`,
    },
  );
}

/** Closes every pooled connection. Safe to call when the pool was never created. */
async function closeDb() {
  if (!pool) return;
  const closing = pool;
  pool = undefined;
  try {
    await closing.end();
    logger.info('DB pool closed');
  } catch (error) {
    logger.warn(`Error while closing DB pool: ${String(error)}`);
  }
}

module.exports = { DbError, query, queryOne, waitForRows, closeDb };
