const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function invokeLLM(messages: Message[]) {
  if (!GEMINI_API_KEY) {
    return fallbackLLM(messages)
  }

  const systemMsg = messages.find(m => m.role === 'system')
  const userMsgs = messages.filter(m => m.role !== 'system')

  const contents = userMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const systemInstruction = systemMsg
    ? { parts: [{ text: systemMsg.content }] }
    : undefined

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!res.ok) throw new Error(`Gemini API: ${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return {
      choices: [{ message: { content: text } }],
    }
  } catch (err: any) {
    console.error('[LLM] Error:', err.message)
    return fallbackLLM(messages)
  }
}

async function fallbackLLM(messages: Message[]) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  return {
    choices: [{
      message: {
        content: `[محاكي] رد على: "${lastUser?.content?.slice(0, 50)}..." (المفتاح غير مُعد)`,
      },
    }],
  }
}
