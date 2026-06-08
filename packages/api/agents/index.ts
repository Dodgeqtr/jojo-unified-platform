import { Router, Request, Response } from 'express'
import { handleCoordinator } from './coordinator-agent'
import { handleCRM } from './crm-agent'
import { handleN8n } from './n8n-agent'
import { handleMonitor } from './monitor-agent'

const router = Router()

router.post('/agents/chat', async (req: Request, res: Response) => {
  const { message, context } = req.body
  if (!message) return res.status(400).json({ error: 'الرسالة مطلوبة' })

  const result = await handleCoordinator({ message, context })
  res.json(result)
})

router.post('/agents/crm/:action', async (req: Request, res: Response) => {
  const result = await handleCRM({ action: req.params.action, params: req.body })
  res.json(result)
})

router.post('/agents/n8n/:action', async (req: Request, res: Response) => {
  const result = await handleN8n({ action: req.params.action, params: req.body })
  res.json(result)
})

router.post('/agents/monitor/:action', async (req: Request, res: Response) => {
  const result = await handleMonitor({ action: req.params.action, params: req.body })
  res.json(result)
})

export default router
