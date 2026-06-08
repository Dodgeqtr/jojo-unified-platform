import { Router, Request, Response } from 'express'
import crypto from 'crypto'

const router = Router()

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://dodgeqtr.app.n8n.cloud/webhook/jojo-system-gateway-v1'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

const AVAILABLE_ACTIONS = [
  'research_summary', 'send_notification', 'create_task', 'get_status',
  'property_analysis', 'generate_report', 'client_lookup', 'contract_review',
  'send_email', 'ai_summary', 'market_analysis', 'schedule_viewing',
  'update_listing', 'archive_property', 'bulk_export', 'workflow_health', 'error_log',
] as const

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) })
      if (res.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
        continue
      }
      return res
    } catch {
      if (attempt < retries) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      else throw new Error('فشل الاتصال بعد عدة محاولات')
    }
  }
  throw new Error('فشل الاتصال')
}

// POST /api/n8n/command — إرسال أمر إلى n8n Gateway
router.post('/n8n/command', async (req: Request, res: Response) => {
  const { action, message, userId = 'system', context = {} } = req.body

  if (!action || !AVAILABLE_ACTIONS.includes(action as any)) {
    return res.status(400).json({ error: `الإجراء غير مدعوم. المتاح: ${AVAILABLE_ACTIONS.join(', ')}` })
  }
  if (!message) return res.status(400).json({ error: 'الرسالة مطلوبة' })

  try {
    const requestId = crypto.randomUUID()
    const response = await fetchWithRetry(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ action, channel: 'web-app', payload: { user_id: userId, message, context } }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 403 && action === 'send_email') {
        return res.json({ success: false, error: '⚠️ صلاحيات Gmail تحتاج تحديث', needsReauth: true, requestId })
      }
      return res.status(response.status).json({ success: false, error: errorText, requestId })
    }

    const data = await response.json()
    res.json({ success: true, data, requestId })
  } catch (err: any) {
    res.json({ success: false, error: '⚠️ الخدمة غير متاحة مؤقتاً', data: null, requestId: crypto.randomUUID() })
  }
})

// POST /api/n8n/send-email — إرسال بريد عبر n8n Gmail
router.post('/n8n/send-email', async (req: Request, res: Response) => {
  const { to, subject, body, cc } = req.body
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body مطلوبة' })

  try {
    const response = await fetchWithRetry(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_email', channel: 'web-app',
        payload: { user_id: 'system', message: `إرسال بريد إلى ${to}`, context: { to, subject, body, cc: cc || '' } },
      }),
    })

    if (response.status === 403) {
      return res.json({ success: false, error: '⚠️ صلاحيات Gmail تحتاج تحديث', needsReauth: true })
    }
    res.json({ success: response.ok, data: response.ok ? await response.json() : null })
  } catch {
    res.json({ success: false, error: '⚠️ فشل إرسال البريد' })
  }
})

// GET /api/n8n/actions — قائمة الإجراءات المتاحة
router.get('/n8n/actions', (_req: Request, res: Response) => {
  res.json({ actions: AVAILABLE_ACTIONS, total: AVAILABLE_ACTIONS.length })
})

export default router
