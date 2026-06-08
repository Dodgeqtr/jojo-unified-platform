import express from 'express'

const app = express()
const PORT = process.env.PORT || 3002

const N8N_API_URL = process.env.N8N_API_URL || 'https://dodgeqtr.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'n8n-service' })
})

// GET /api/workflows — سحب workflows من n8n API
app.get('/api/workflows', async (_req, res) => {
  if (!N8N_API_KEY) {
    return res.json({ data: [], error: 'n8n API key not configured' })
  }
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=50`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      signal: AbortSignal.timeout(10000),
    })
    const data = await response.json()
    res.json(data)
  } catch (err: any) {
    res.json({ data: [], error: err.message })
  }
})

app.post('/api/workflows', async (req, res) => {
  if (!N8N_API_KEY) {
    return res.status(400).json({ error: 'n8n API key not configured' })
  }
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.status(201).json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/webhooks/:trigger', (req, res) => {
  console.log(`Webhook received: ${req.params.trigger}`)
  res.json({ received: true })
})

app.post('/api/workflows/:id/execute', (req, res) => {
  res.json({ execution_id: 'exec-' + Date.now() })
})

app.listen(PORT, () => {
  console.log(`n8n Service running on port ${PORT}`)
})
