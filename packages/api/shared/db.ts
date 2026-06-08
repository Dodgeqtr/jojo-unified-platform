import { Pool } from 'pg'

let pool: Pool | null = null

export async function getDb() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export async function query(text: string, params?: any[]) {
  const db = await getDb()
  if (!db) return { rows: [] }
  try {
    const result = await db.query(text, params)
    return result
  } catch (err) {
    console.error('[DB] Query error:', err)
    return { rows: [] }
  }
}
