/**
 * Database Adapter — Jojo Unified Platform
 * Wraps pg Pool; returns a simple query helper.
 * Schema: 14 tables (see /database/schema.sql)
 */
import { Pool, type QueryResult } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5433/postgres",
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err);
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[] & { rows: T[] }> {
  const client = await pool.connect();
  try {
    const result: QueryResult<T> = await client.query(sql, params);
    const rows = result.rows;
    Object.defineProperty(rows, "rows", {
      get() {
        return this;
      },
      configurable: true,
      enumerable: false,
    });
    return rows as T[] & { rows: T[] };
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export function getDb() {
  return { query, queryOne };
}

export default pool;
