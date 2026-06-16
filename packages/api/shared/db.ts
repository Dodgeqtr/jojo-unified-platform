/**
 * Database Connection Module
 * نمط PostgreSQL مع Connection Pooling
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_POSTGRESDB_USER || 'jojo_user',
  password: process.env.DB_POSTGRESDB_PASSWORD || 'jojo123',
  host: process.env.DB_POSTGRESDB_HOST || 'postgres',
  port: parseInt(process.env.DB_POSTGRESDB_PORT || '5432'),
  database: process.env.DB_POSTGRESDB_DATABASE || 'jojo_db',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

/**
 * Execute a query
 */
export async function query(text: string, values?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, values);
    const duration = Date.now() - start;
    console.log(`[DB] Executed query in ${duration}ms`, { text: text.substring(0, 50) });
    return result;
  } catch (error) {
    console.error('[DB] Query failed:', { text, error });
    throw error;
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne(text: string, values?: any[]) {
  const result = await query(text, values);
  return result.rows[0] || null;
}

/**
 * Get a client from the pool
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Check connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch {
    return false;
  }
}

export default pool;
