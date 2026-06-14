// وكيل التنسيق المركزي - يدير الحوار ويوزع المهام للوكلاء الآخرين
import { JOJO_SYSTEM_PROMPT } from '../shared/core/jojo-system-prompt'
import { invokeLLM, Message } from '../shared/core/llm'
import { query } from '../shared/core/db'

export async function handleCoordinator(input: { message: string; context?: any }) {
  const contextInfo = input.context
    ? `\nالسياق: ${JSON.stringify(input.context)}`
    : ''

  const messages: Message[] = [
    {
      role: 'system',
      content: `${JOJO_SYSTEM_PROMPT}\n\nأنتِ منسقة المنظومة. قومي بتحليل طلب المستخدم وتوجيهه للوكيل المناسب:\n
1. إذا كان الطلب عن العقارات ← وكيل CRM
2. إذا كان الطلب عن أتمتة أو n8n ← وكيل n8n
3. إذا كان الطلب عن مراقبة أو تقارير ← وكيل المراقبة
4. إذا كان الطلب عاماً أو شخصياً ← أنتِ تجيبين مباشرة

قبل التوجيه، اشرحي للمستخدم أي وكيل سيتولى المهمة.`,
    },
    { role: 'user', content: input.message + contextInfo },
  ]

  try {
    const response = await invokeLLM(messages)
    return {
      success: true,
      reply: response?.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك',
      agent: 'coordinator',
      timestamp: Date.now(),
    }
  } catch (err: any) {
    return { success: false, reply: 'حدث خطأ في المعالجة', error: err.message }
  }
}
