// وكيل n8n - يدير الأتمتة وسير العمل
import { JOJO_SYSTEM_PROMPT } from '../shared/core/jojo-system-prompt'
import { invokeLLM, Message } from '../shared/core/llm'

const N8N_HUB_URL = process.env.N8N_HUB_URL || 'https://dodgeqtr.app.n8n.cloud/webhook/jojo-opshub-v1'
const N8N_API_URL = process.env.N8N_API_URL || 'https://dodgeqtr.app.n8n.cloud'

export async function handleN8n(input: { action: string; params?: any }) {
  const { action, params = {} } = input

  try {
    switch (action) {
      case 'workflow-status': {
        const res = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=50`, {
          headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY || '' },
          signal: AbortSignal.timeout(10000),
        })
        const data = await res.json()
        const workflows = (data?.data || []) as any[]
        return {
          success: true,
          data: {
            total: workflows.length,
            active: workflows.filter((w: any) => w.active).length,
            workflows: workflows.map((w: any) => ({ id: w.id, name: w.name, active: w.active })),
          },
        }
      }
      case 'execute-webhook': {
        const res = await fetch(`${N8N_HUB_URL}/${params.route || 'app-event'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params.payload || {}),
        })
        return { success: res.ok, data: await res.json() }
      }
      case 'health': {
        const res = await fetch(`${N8N_HUB_URL}/health`)
        return { success: res.ok, data: await res.json() }
      }
      default: {
        const messages: Message[] = [
          { role: 'system', content: `${JOJO_SYSTEM_PROMPT}\n\nأنتِ وكيل أتمتة n8n. ساعدي المستخدم في إدارة سير العمل.` },
          { role: 'user', content: input.action },
        ]
        const response = await invokeLLM(messages)
        return { success: true, reply: response?.choices?.[0]?.message?.content, agent: 'n8n' }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
