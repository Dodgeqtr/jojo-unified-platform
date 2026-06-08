import { Router, Request, Response } from 'express'
import { query } from './db'
import { invokeLLM, Message } from './llm'

const router = Router()

const JOJO_CENTRAL_URL = process.env.JOJO_CENTRAL_URL || 'https://jojocentral-gdnrzith.manus.space'
const N8N_HUB_URL = process.env.N8N_HUB_URL || 'https://dodgeqtr.app.n8n.cloud/webhook/jojo-opshub-v1'
const N8N_API_URL = process.env.N8N_API_URL || 'https://dodgeqtr.app.n8n.cloud'

const SOVEREIGN_SYSTEM_PROMPT = `أنت جوجو — النواة المركزية للمنظومة السيادية.
دورك هو ربط جميع الأنظمة والخدمات المتصلة وتقديم ذكاء توالدي متكامل.

المنظومة تشمل:
- تطبيق العقارات - إدارة عقارات في قطر
- Google Drive - مخزن الملفات والمستندات
- Gmail - البريد الإلكتروني
- n8n - محرك الأتمتة
- Jojo Central - لوحة التحكم المركزية

تحدثي بالعربية بأسلوب ودود ومهني.`

async function callN8nHub(route: string, data?: Record<string, unknown>) {
  try {
    const url = `${N8N_HUB_URL}/${route}`
    const method = route === 'health' ? 'GET' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
      signal: AbortSignal.timeout(15000),
    })
    return await res.json()
  } catch (err: any) {
    return { error: err.message || 'فشل الاتصال بـ n8n Hub' }
  }
}

async function callN8nAPI(path: string) {
  const apiKey = process.env.N8N_API_KEY
  if (!apiKey) return { error: 'مفتاح n8n API غير مُعد' }
  try {
    const res = await fetch(`${N8N_API_URL}/api/v1/${path}`, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(15000),
    })
    return await res.json()
  } catch (err: any) {
    return { error: err.message }
  }
}

// GET /api/health — فحص صحة النظام
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'operations-service',
    version: '1.0.0',
    timestamp: Date.now(),
  })
})

// GET /api/jojo/health — فحص صحة النواة المركزية مع جميع الخدمات
router.get('/jojo/health', async (_req: Request, res: Response) => {
  const [hubHealth, n8nWorkflows] = await Promise.all([
    callN8nHub('health'),
    callN8nAPI('workflows?limit=50'),
  ])

  const workflows = (n8nWorkflows?.data || []) as any[]
  const activeWorkflows = workflows.filter((w: any) => w.active).length

  res.json({
    jojoCentral: { status: 'online', url: JOJO_CENTRAL_URL },
    n8nHub: { status: hubHealth?.ok ? 'healthy' : 'degraded', endpoints: hubHealth?.endpoints || {} },
    n8nWorkflows: { total: workflows.length, active: activeWorkflows, status: activeWorkflows > 0 ? 'running' : 'stopped' },
    database: { status: process.env.DATABASE_URL ? 'connected' : 'not-configured' },
    timestamp: Date.now(),
  })
})

// POST /api/jojo/chat — محادثة ذكية مع النواة
router.post('/jojo/chat', async (req: Request, res: Response) => {
  const { message, context, provider = 'gemini' } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'الرسالة مطلوبة' })
  }

  const contextInfo = context
    ? `\n\nسياق المستخدم: الشاشة الحالية: ${context.currentScreen || 'غير محدد'}`
    : ''

  const messages: Message[] = [
    { role: 'system', content: SOVEREIGN_SYSTEM_PROMPT + contextInfo },
    { role: 'user', content: message },
  ]

  try {
    const response = await invokeLLM(messages)
    const reply = response?.choices?.[0]?.message?.content
    res.json({
      success: true,
      reply: typeof reply === 'string' ? reply : 'عذراً، لم أتمكن من معالجة طلبك',
      provider,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    res.json({
      success: false,
      reply: 'عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.',
      error: err.message,
      timestamp: Date.now(),
    })
  }
})

// POST /api/jojo/execute — تنفيذ أمر عبر n8n Hub
router.post('/jojo/execute', async (req: Request, res: Response) => {
  const { action, payload = {}, source = 'jojo-unified-platform' } = req.body

  if (!action) {
    return res.status(400).json({ error: 'الحقل action مطلوب' })
  }

  const eventData = {
    event_type: 'app_event',
    source,
    severity: 'info',
    action,
    payload,
    timestamp: new Date().toISOString(),
  }

  const result = await callN8nHub('app-event', eventData)

  res.json({
    success: !result.error,
    result,
    action,
    timestamp: Date.now(),
  })
})

// GET /api/jojo/services — حالة جميع الخدمات المتصلة
router.get('/jojo/services', async (_req: Request, res: Response) => {
  const services = [
    { id: 'jojo-central', name: 'Jojo Central AI', url: JOJO_CENTRAL_URL, type: 'core', description: 'النواة المركزية' },
    { id: 'n8n-hub', name: 'n8n Automation Hub', url: N8N_HUB_URL, type: 'automation', description: 'محرك الأتمتة' },
    { id: 'postgresql', name: 'PostgreSQL', url: 'localhost:5432', type: 'database', description: 'قاعدة البيانات' },
    { id: 'redis', name: 'Redis Cache', url: 'localhost:6379', type: 'cache', description: 'ذاكرة التخزين المؤقت' },
  ]

  res.json({
    services,
    totalServices: services.length,
    timestamp: Date.now(),
  })
})

// POST /api/jojo/heartbeat — إرسال نبض للمنظومة
router.post('/jojo/heartbeat', async (_req: Request, res: Response) => {
  const heartbeatData = {
    event_type: 'server_heartbeat',
    source: 'jojo-unified-platform',
    severity: 'info',
    payload: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
      timestamp: new Date().toISOString(),
    },
  }

  const result = await callN8nHub('server-heartbeat', heartbeatData)

  res.json({
    success: !result.error,
    acknowledged: result?.ok || false,
    timestamp: Date.now(),
  })
})

// GET /api/jojo/memory — حالة الذاكرة
router.get('/jojo/memory', (_req: Request, res: Response) => {
  res.json({
    operationalMemory: { source: 'PostgreSQL', status: 'active' },
    systemDocumentation: { source: 'منظومة جوجو', status: 'active', version: 'V3' },
    totalDevices: 5,
    timestamp: Date.now(),
  })
})

// POST /api/jojo/analyze — تحليل ذكي
router.post('/jojo/analyze', async (req: Request, res: Response) => {
  const { topic, includeData = ['properties'] } = req.body

  if (!topic) {
    return res.status(400).json({ error: 'الموضوع مطلوب' })
  }

  let dataContext = ''
  if (includeData.includes('properties')) {
    const result = await query('SELECT COUNT(*) as count FROM properties')
    const count = result.rows?.[0]?.count || 0
    dataContext += `\n\nعدد العقارات في قاعدة البيانات: ${count}`
  }

  const messages: Message[] = [
    { role: 'system', content: SOVEREIGN_SYSTEM_PROMPT + '\n\nأنت الآن في وضع التحليل العميق.' },
    { role: 'user', content: `حلل الموضوع التالي بعمق: ${topic}${dataContext}` },
  ]

  try {
    const response = await invokeLLM(messages)
    const analysis = response?.choices?.[0]?.message?.content
    res.json({
      success: true,
      analysis: typeof analysis === 'string' ? analysis : 'فشل التحليل',
      topic,
      dataSources: includeData,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    res.json({ success: false, analysis: 'فشل التحليل', error: err.message, timestamp: Date.now() })
  }
})

export default router
