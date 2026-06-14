/**
 * Jojo Unified Platform - Migration Runner
 * ==========================================
 * يشغّل ملفات SQL الموجودة في مجلد migrations/ بالترتيب الأبجدي
 * (001_xxx.sql, 002_xxx.sql, ...) ويتتبع الملفات المنفذة بجدول
 * schema_migrations حتى لا يعيد تنفيذ أي ملف مرتين.
 *
 * الاستخدام:
 *   node migrate.js              -> ينفذ كل ملفات migrations غير المنفذة
 *   node migrate.js --seed-only  -> ينفذ فقط ملفات تبدأ بـ "seed" بالاسم
 *
 * يعتمد على متغير البيئة DATABASE_URL (يُقرأ من .env في جذر المشروع
 * أو من بيئة التشغيل مباشرة، مثلاً داخل Docker).
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// تحميل .env من جذر المشروع إن وجد (بدون كسر التشغيل إن لم توجد)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (_) {
  // dotenv غير مثبت أو لا يوجد ملف .env - لا بأس، DATABASE_URL قد تكون
  // موجودة مسبقًا في بيئة التشغيل (مثل Docker Compose)
}

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ متغير البيئة DATABASE_URL غير موجود. تأكد من وجود .env أو تمريره من البيئة.')
  process.exit(1)
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')
const seedOnly = process.argv.includes('--seed-only')

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    // جدول تتبع الـ migrations المنفذة
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const { rows } = await client.query('SELECT filename FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.filename))

    let files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    if (seedOnly) {
      files = files.filter((f) => f.toLowerCase().includes('seed'))
    }

    let appliedCount = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭️  ${file} (منفذ مسبقًا)`)
        continue
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
      console.log(`▶️  تنفيذ: ${file}`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`✅ تم: ${file}`)
        appliedCount++
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`❌ فشل تنفيذ ${file}:`, err.message)
        throw err
      }
    }

    if (appliedCount === 0) {
      console.log('✅ لا توجد migrations جديدة. القاعدة محدّثة بالفعل.')
    } else {
      console.log(`✅ تم تنفيذ ${appliedCount} migration(s) بنجاح.`)
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('💥 فشلت عملية الـ migration:', err.message)
  process.exit(1)
})
