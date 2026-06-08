import express from 'express'
import { query } from '../../shared/db'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crm-service' })
})

// GET /api/contacts — مع قاعدة البيانات الفعلية
app.get('/api/contacts', async (_req, res) => {
  const result = await query('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.post('/api/contacts', async (req, res) => {
  const { name, email, phone, company, notes } = req.body
  const result = await query(
    `INSERT INTO contacts (name, email, phone, company, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, email, phone, company, notes]
  )
  res.status(201).json(result.rows[0])
})

// GET /api/properties — العقارات
app.get('/api/properties', async (_req, res) => {
  const result = await query('SELECT * FROM properties ORDER BY created_at DESC LIMIT 100')
  res.json(result.rows)
})

app.post('/api/properties', async (req, res) => {
  const { title, type, price, area, status, description } = req.body
  const result = await query(
    `INSERT INTO properties (title, type, price, area, status, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, type, price, area, status, description]
  )
  res.status(201).json(result.rows[0])
})

app.get('/api/deals', async (_req, res) => {
  const result = await query('SELECT * FROM deals ORDER BY created_at DESC LIMIT 50')
  res.json(result.rows)
})

app.listen(PORT, () => {
  console.log(`CRM Service running on port ${PORT}`)
})
