// وكيل المراقبة - يراقب صحة النظام ويصدر تقارير
import { JOJO_SYSTEM_PROMPT } from '../shared/systemPrompt'
import { invokeLLM, Message } from '../shared/llm'
import { query } from '../shared/db'
import * as os from 'os'

export async function handleMonitor(input: { action: string; params?: any }) {
  const { action } = input

  switch (action) {
    case 'system-health': {
      const memUsage = process.memoryUsage()
      const uptime = process.uptime()
      const loadAvg = os.loadavg?.() || [0, 0, 0]
      const freeMem = os.freemem ? os.freemem() / 1024 / 1024 : 0
      const totalMem = os.totalmem ? os.totalmem() / 1024 / 1024 : 0

      const dbResult = await query("SELECT COUNT(*) as total FROM workflows")
      const workflowCount = parseInt(dbResult.rows?.[0]?.total) || 0

      return {
        success: true,
        data: {
          memory: { heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`, heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB` },
          system: { uptime: `${Math.floor(uptime / 60)}m`, loadAvg: loadAvg.slice(0, 3), freeMem: `${freeMem.toFixed(0)}MB`, totalMem: `${totalMem.toFixed(0)}MB` },
          workflows: { total: workflowCount },
          timestamp: Date.now(),
        },
      }
    }
    case 'daily-report': {
      // Collect stats for daily report
      const [workflows, dbSize] = await Promise.all([
        query("SELECT COUNT(*) as total, is_active as active FROM workflows GROUP BY is_active"),
        query("SELECT pg_database_size('jojo_db') as size"),
      ])

      const messages: Message[] = [
        { role: 'system', content: `${JOJO_SYSTEM_PROMPT}\n\nأنتِ وكيل المراقبة. قومي بإنشاء تقرير يومي بناءً على البيانات التالية.` },
        { role: 'user', content: `أنشئ تقريراً يومياً:\n- workflows: ${JSON.stringify(workflows.rows)}\n- حجم DB: ${dbSize.rows?.[0]?.size || 'غير معروف'}` },
      ]
      const response = await invokeLLM(messages)
      return { success: true, report: response?.choices?.[0]?.message?.content, agent: 'monitor' }
    }
    default: {
      const messages: Message[] = [
        { role: 'system', content: `${JOJO_SYSTEM_PROMPT}\n\nأنتِ وكيل المراقبة. قدمي معلومات عن صحة النظام.` },
        { role: 'user', content: input.action },
      ]
      const response = await invokeLLM(messages)
      return { success: true, reply: response?.choices?.[0]?.message?.content, agent: 'monitor' }
    }
  }
}
