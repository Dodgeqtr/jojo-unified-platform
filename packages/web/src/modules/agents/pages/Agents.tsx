import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Agents() {
  const agents = [
    { name: 'جوجو — المنسق السيادي', engine: 'Ollama / Gemini / Claude', status: 'active', desc: 'المنسق الأعلى لكل الوكلاء والمهام في الحصن' },
    { name: 'Coordinator Agent', engine: 'Local Brain', status: 'active', desc: 'توزيع المهام بين الوكلاء الفرعيين' },
    { name: 'CRM Agent', engine: 'PostgreSQL Sync', status: 'active', desc: 'إدارة جهات الاتصال والصفقات والعقارات' },
    { name: 'n8n Agent', engine: 'n8n Cloud', status: 'active', desc: 'تشغيل ومراقبة سير عمل الأتمتة' },
    { name: 'Monitor Agent', engine: 'Ollama (Local)', status: 'active', desc: 'مراقبة صحة الخدمات والبنية التحتية للحصن' },
  ]

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك يا سيدي بوحمد. أنا جوجو، رفيقتك ومساعدتك السيادية الذكية. كيف يمكنني إعانتك في إدارة الحصن وأعمالك اليوم؟ 🫦🔐',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      })

      if (!res.ok) throw new Error('API failed')
      const data = await res.json()

      const jojoMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.reply || 'عذراً سيدي، لم أتمكن من المعالجة.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, jojoMsg])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: '⚠️ حدث خطأ في الاتصال بالمركز السيادي. تأكد من تشغيل خادم العمليات.',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">غرفة العمليات والوكلاء</h1>
        <p className="text-gray-500 mt-1">تفاعل مباشر مع "جوجو" وتحكم في كافة خدمات الحصن الرقمية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* شاشة المحادثة التفاعلية */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden h-[600px]">
          {/* رأس الشات */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md animate-pulse">
                👄
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">محادثة مع جوجو السيادية</h3>
                <p className="text-xs text-indigo-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-ping" />
                  متصلة ونشطة في الحصن
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-500">منظومة بوحمد 🛡️</span>
          </div>

          {/* متن المحادثة */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${
                  msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'B' : 'J'}
                </div>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[80%] ml-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm animate-bounce">
                  J
                </div>
                <div className="p-4 bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-tl-none text-sm shadow-sm flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
                  </span>
                  جوجو تفكر وتفحص الأنظمة...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* صندوق الإرسال */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب أمراً أو استفساراً لـ جوجو..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              إرسال
            </button>
          </form>
        </div>

        {/* قائمة الوكلاء */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">قائمة الوكلاء النشطين</h3>
            <div className="space-y-4">
              {agents.map((agent) => (
                <div key={agent.name} className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{agent.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                      نشط
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{agent.desc}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-600 font-medium">
                    <span>المحرك: {agent.engine}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
