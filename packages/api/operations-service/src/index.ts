import express from 'express'
import { configDotenv } from 'dotenv'
import jojoCentralRouter from '../../shared/jojoCentralRouter'
import n8nRouter from '../../shared/n8nRouter'
import agentsRouter from '../../agents/index'
import { query } from '../../shared/db'

configDotenv()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// === Jojo Central Router (دمج المنطق المتقدم من jojoCentralRouter.ts) ===
app.use(jojoCentralRouter)

// === n8n Gateway Router ===
app.use(n8nRouter)

// === AI Agents ===
app.use(agentsRouter)

// GET /api/dashboard — بيانات لوحة التحكم
app.get('/api/dashboard', async (_req, res) => {
  const result = await query('SELECT COUNT(*) as count FROM workflows')
  const workflowCount = parseInt(result.rows?.[0]?.count) || 0

  res.json({
    system_status: 'operational',
    services: {
      n8n: 'active',
      crm: 'active',
      database: process.env.DATABASE_URL ? 'connected' : 'not-configured',
    },
    metrics: {
      workflows_running: workflowCount,
      contacts_total: 0,
      properties_total: 0,
    },
  })
})

// GET /api/contacts — جهات الاتصال (مع قاعدة البيانات)
app.get('/api/contacts', async (_req, res) => {
  const result = await query('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.post('/api/contacts', async (req, res) => {
  const { name, email, phone, company } = req.body
  const result = await query(
    `INSERT INTO contacts (name, email, phone, company) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, email, phone, company]
  )
  res.status(201).json(result.rows[0] || { id: 'contact-' + Date.now() })
})

// GET /api/workflows — سير العمل
app.get('/api/workflows', async (_req, res) => {
  const result = await query('SELECT * FROM workflows ORDER BY created_at DESC LIMIT 50')
  res.json(result.rows)
})

app.post('/api/workflows/execute', (req, res) => {
  res.json({ execution_id: 'exec-' + Date.now() })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Operations Service running on port ${PORT}`)
  console.log(`Jojo Central API: http://localhost:${PORT}/api/jojo/health`)
})
