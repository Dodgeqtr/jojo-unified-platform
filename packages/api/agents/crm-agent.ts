// وكيل CRM - يدير العقارات والعملاء والعقود
import { JOJO_SYSTEM_PROMPT } from '../shared/core/jojo-system-prompt'
import { invokeLLM, Message } from '../shared/core/llm'
import { query } from '../shared/core/db'

export async function handleCRM(input: { action: string; params?: any }) {
  const { action, params = {} } = input

  switch (action) {
    case 'list-properties': {
      const result = await query('SELECT id, title, type, price, status FROM properties LIMIT 20')
      return { success: true, data: result.rows, count: result.rows.length }
    }
    case 'list-contacts': {
      const result = await query('SELECT id, name, email, phone FROM contacts LIMIT 20')
      return { success: true, data: result.rows, count: result.rows.length }
    }
    case 'dashboard-stats': {
      const [props, contacts, deals] = await Promise.all([
        query('SELECT COUNT(*) as total, status FROM properties GROUP BY status'),
        query('SELECT COUNT(*) as total FROM contacts'),
        query('SELECT COUNT(*) as total FROM deals'),
      ])
      return {
        success: true,
        data: {
          properties: props.rows,
          total_contacts: parseInt(contacts.rows?.[0]?.total) || 0,
          total_deals: parseInt(deals.rows?.[0]?.total) || 0,
        },
      }
    }
    default: {
      // Use AI for complex CRM queries
      const messages: Message[] = [
        { role: 'system', content: `${JOJO_SYSTEM_PROMPT}\n\nأنتِ وكيل CRM. استجيبي لاستفسار العميل العقاري.` },
        { role: 'user', content: input.action },
      ]
      const response = await invokeLLM(messages)
      return {
        success: true,
        reply: response?.choices?.[0]?.message?.content || 'عذراً',
        agent: 'crm',
      }
    }
  }
}
