import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'

type Mode = 'formal' | 'private'
type MessageRole = 'user' | 'assistant'

interface Message {
  role: MessageRole
  content: string
  source?: 'ollama' | 'claude'
}

const MODE_LABELS: Record<Mode, { label: string; color: string; icon: string; desc: string }> = {
  formal: {
    label: 'رسمي',
    icon:  '💼',
    color: 'bg-blue-600',
    desc:  'Ollama محلي → Claude احتياطي',
  },
  private: {
    label: 'خاص',
    icon:  '🔒',
    color: 'bg-gray-800',
    desc:  'Ollama محلي فقط — لا سحاب',
  },
}

export default function Airis() {
  const [mode, setMode] = useState<Mode>('formal')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `airis-${Date.now()}`)
  const [status, setStatus] = useState<any>(null)
  const [systems, setSystems] = useState<any[]>([])
  const [showSystems, setShowSystems] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // جلب الحالة والأنظمة عند التحميل
  useEffect(() => {
    api.airis.status.query().then(setStatus).catch(console.error)
    api.airis.listSystems.query().then((r: any) => setSystems(r.systems)).catch(console.error)
  }, [])

  // تمرير تلقائي للأسفل
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const result = await api.airis.chat.mutate({
        message: text,
        mode,
        session_id: sessionId,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      })

      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: result.reply, source: result.source },
      ])
    } catch (err: any) {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: `⚠️ ${err?.message ?? 'خطأ غير متوقع'}` },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentMode = MODE_LABELS[mode]

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between text-white ${currentMode.color} transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <h1 className="font-bold text-lg leading-none">Airis</h1>
            <p className="text-xs opacity-75 mt-0.5">{currentMode.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* مفتاح الوضع */}
          <div className="flex items-center gap-1 bg-white/20 rounded-xl p-1">
            {(Object.entries(MODE_LABELS) as [Mode, typeof MODE_LABELS[Mode]][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => { setMode(key); setMessages([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === key ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span>{val.icon}</span>
                {val.label}
              </button>
            ))}
          </div>

          {/* زر الأنظمة */}
          <button
            onClick={() => setShowSystems(!showSystems)}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
          >
            الأنظمة 🔗
          </button>
        </div>
      </div>

      {/* لوحة الأنظمة */}
      {showSystems && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-3 flex-wrap">
          {systems.map((sys) => (
            <div
              key={sys.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                sys.status === 'active'
                  ? 'bg-white border-gray-200 text-gray-800'
                  : sys.status === 'planned'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-gray-100 border-dashed border-gray-300 text-gray-400'
              }`}
            >
              <span>{sys.icon}</span>
              {sys.name}
              {sys.status === 'active' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
            </div>
          ))}
        </div>
      )}

      {/* الحالة */}
      {status && (
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span className={`flex items-center gap-1 ${status.ollama?.online ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.ollama?.online ? 'bg-green-500' : 'bg-red-500'}`} />
            Ollama {status.ollama?.online ? 'متصل' : 'غير متصل'}
          </span>
          <span className={`flex items-center gap-1 ${status.claude?.available ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.claude?.available ? 'bg-blue-500' : 'bg-gray-400'}`} />
            Claude {status.claude?.available ? 'متاح' : 'غير مهيأ'}
          </span>
          {mode === 'private' && (
            <span className="text-gray-800 font-semibold flex items-center gap-1">
              🔒 الوضع الخاص — لا بيانات تغادر جهازك
            </span>
          )}
        </div>
      )}

      {/* منطقة المحادثة */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm font-medium">مرحباً بوحمد — كيف أقدر أساعدك؟</p>
            <p className="text-xs mt-1 opacity-70">
              {mode === 'formal'
                ? 'أسرع محلياً، وعند الحاجة أتصل بالسحاب'
                : 'وضع خاص — كل شيء يبقى على جهازك'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  : mode === 'private'
                  ? 'bg-gray-800 text-white rounded-tr-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source && (
                <p className="text-xs opacity-60 mt-1 text-left">
                  via {msg.source === 'ollama' ? '🏠 محلي' : '☁️ سحابي'}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end">
            <div className={`px-4 py-3 rounded-2xl rounded-tr-sm ${mode === 'private' ? 'bg-gray-800' : 'bg-blue-600'}`}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* خانة الإدخال */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
            rows={1}
            className="flex-1 resize-none px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all max-h-32 overflow-y-auto"
            style={{ direction: 'rtl' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'private' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            إرسال ⚡
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 px-1">
          {mode === 'private' ? '🔒 خاص — لا شيء يخرج' : '💼 رسمي — محلي أولاً'}
        </p>
      </div>
    </div>
  )
}
