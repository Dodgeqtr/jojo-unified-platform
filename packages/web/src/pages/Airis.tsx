import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

// ─── أنواع ──────────────────────────────────────────────────────────────────
type Mode     = 'formal' | 'private'
type MoodType = 'positive' | 'frustrated' | 'neutral'

interface Message {
  role:    'user' | 'assistant'
  content: string
  source?: 'ollama' | 'claude'
  emotion?: { urgency: string; mood: MoodType }
}

interface Memory {
  id:             string
  content:        string
  importance:     number
  times_recalled: number
}

// ─── ثوابت ──────────────────────────────────────────────────────────────────
const MOOD_EMOJI: Record<MoodType, string> = {
  positive:   '😊',
  frustrated: '🤝',
  neutral:    '✨',
}

const MODE_CFG = {
  formal:  { label: 'رسمي', icon: '💼', color: 'bg-blue-600',  desc: 'Ollama محلي → Claude احتياطي' },
  private: { label: 'خاص',  icon: '🔒', color: 'bg-gray-800',  desc: 'محلي فقط — لا سحاب'           },
} as const

const mkSid = () => `airis-${Date.now()}-${Math.random().toString(36).slice(2,6)}`

// ════════════════════════════════════════════════════════════════════════════
export default function Airis() {
  const [mode,         setMode]         = useState<Mode>('formal')
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [isLoading,    setIsLoading]    = useState(false)
  const [sessionId,    setSessionId]    = useState(mkSid)
  const [status,       setStatus]       = useState<any>(null)
  const [systems,      setSystems]      = useState<any[]>([])
  const [memories,     setMemories]     = useState<Memory[]>([])
  const [showSystems,  setShowSystems]  = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  const [currentMood,  setCurrentMood]  = useState<MoodType>('neutral')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // ─── تحديث الذكريات ───────────────────────────────────────────────────────
  const refreshMemories = useCallback(async () => {
    try {
      const r = await (api.airis as any).getMemories.query()
      setMemories(r.memories ?? [])
    } catch {}
  }, [])

  // ─── تحميل أولي ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.airis.status.query().then(setStatus).catch(console.error)
    api.airis.listSystems.query().then((r: any) => setSystems(r.systems)).catch(console.error)
    refreshMemories()
  }, [])

  // ─── تحميل تاريخ الجلسة من DB ─────────────────────────────────────────────
  useEffect(() => {
    ;(api.airis as any).getHistory
      .query({ session_id: sessionId })
      .then((r: any) => {
        if (r.messages?.length > 0) {
          setMessages(r.messages.map((m: any) => ({
            role: m.role, content: m.content, source: m.source,
          })))
        }
      })
      .catch(() => {})
  }, [sessionId])

  // ─── تمرير تلقائي ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ─── إرسال رسالة ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    try {
      const result = await api.airis.chat.mutate({
        message:    text,
        mode,
        session_id: sessionId,
        history:    messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      })

      setMessages([...updated, {
        role:    'assistant',
        content: result.reply,
        source:  result.source,
        emotion: (result as any).emotion,
      }])

      if ((result as any).emotion?.mood) {
        setCurrentMood((result as any).emotion.mood as MoodType)
      }

      // تحديث الذكريات بعد ثانيتين
      setTimeout(refreshMemories, 2000)
    } catch (err: any) {
      setMessages([...updated, { role: 'assistant', content: `⚠️ ${err?.message ?? 'خطأ'}` }])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ─── جلسة جديدة ───────────────────────────────────────────────────────────
  const newSession = () => {
    setMessages([])
    setSessionId(mkSid())
    setCurrentMood('neutral')
  }

  // ─── حذف ذكرى ─────────────────────────────────────────────────────────────
  const deleteMemory = async (id: string) => {
    try {
      await (api.airis as any).deleteMemory.mutate({ id })
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch {}
  }

  const cfg = MODE_CFG[mode]

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className={`px-5 py-3.5 flex items-center justify-between text-white ${cfg.color} transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl transition-all duration-500">{MOOD_EMOJI[currentMood]}</span>
          <div>
            <h1 className="font-bold text-lg leading-none">Airis</h1>
            <p className="text-xs opacity-70 mt-0.5">{cfg.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* مفتاح الوضع */}
          <div className="flex bg-white/20 rounded-xl p-1 gap-1">
            {(Object.entries(MODE_CFG) as [Mode, typeof MODE_CFG[Mode]][]).map(([key, val]) => (
              <button key={key}
                onClick={() => { setMode(key); setMessages([]); setCurrentMood('neutral') }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === key ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:bg-white/10'
                }`}>
                <span>{val.icon}</span>{val.label}
              </button>
            ))}
          </div>

          {/* زر الذكريات */}
          <button
            onClick={() => { setShowMemories(p => !p); setShowSystems(false) }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              showMemories ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30'
            }`}>
            🧠{memories.length > 0 && <span className="ml-0.5">{memories.length}</span>}
          </button>

          {/* زر الأنظمة */}
          <button
            onClick={() => { setShowSystems(p => !p); setShowMemories(false) }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              showSystems ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30'
            }`}>
            🔗
          </button>

          {/* جلسة جديدة */}
          <button onClick={newSession}
            title="جلسة جديدة"
            className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">
            ＋
          </button>
        </div>
      </div>

      {/* ── لوحة الذكريات ─────────────────────────────────────────────────── */}
      {showMemories && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 max-h-52 overflow-y-auto">
          <p className="text-xs font-bold text-amber-800 mb-2">
            🧠 الذاكرة الدائمة ({memories.length})
          </p>
          {memories.length === 0 ? (
            <p className="text-xs text-amber-600">
              لم تُحفظ ذكريات بعد — تُستخرج تلقائياً من محادثاتك.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {memories.map(m => (
                <div key={m.id}
                  className="flex items-start justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <p className="text-xs text-gray-700 flex-1 leading-relaxed">{m.content}</p>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className="text-xs text-amber-400">⭐{m.importance}</span>
                    <button onClick={() => deleteMemory(m.id)}
                      className="text-gray-300 hover:text-red-400 text-xs transition-colors leading-none">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── لوحة الأنظمة ──────────────────────────────────────────────────── */}
      {showSystems && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-2 flex-wrap">
          {systems.map(s => (
            <div key={s.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                s.status === 'active'  ? 'bg-white border-gray-200 text-gray-800' :
                s.status === 'planned' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                         'bg-gray-100 border-dashed border-gray-300 text-gray-400'
              }`}>
              <span>{s.icon}</span>{s.name}
              {s.status === 'active' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
            </div>
          ))}
        </div>
      )}

      {/* ── شريط الحالة ───────────────────────────────────────────────────── */}
      {status && (
        <div className="px-5 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span className={`flex items-center gap-1 ${status.ollama?.online ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.ollama?.online ? 'bg-green-500' : 'bg-red-500'}`} />
            Ollama {status.ollama?.online ? 'متصل' : 'غير متصل'}
          </span>
          <span className={`flex items-center gap-1 ${status.claude?.available ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.claude?.available ? 'bg-blue-500' : 'bg-gray-400'}`} />
            Claude {status.claude?.available ? 'متاح' : 'غير مهيأ'}
          </span>
          {(status.memory?.count ?? 0) > 0 && (
            <span className="text-amber-600 flex items-center gap-1">
              🧠 {status.memory.count} ذكرى
            </span>
          )}
          {mode === 'private' && (
            <span className="font-semibold text-gray-800 flex items-center gap-1">🔒 خاص</span>
          )}
        </div>
      )}

      {/* ── منطقة المحادثة ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <div className="text-5xl mb-3">{MOOD_EMOJI[currentMood]}</div>
            <p className="text-sm font-medium">مرحباً بوحمد — كيف أقدر أساعدك؟</p>
            <p className="text-xs mt-1 opacity-60">
              {mode === 'formal'
                ? 'ذاكرة دائمة — أتذكر كل شيء قلته'
                : 'وضع خاص — كل شيء يبقى على جهازك'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[76%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                : mode === 'private'
                  ? 'bg-gray-800 text-white rounded-tr-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source && (
                <p className="text-xs opacity-50 mt-1.5 text-right flex items-center justify-end gap-1">
                  {msg.source === 'ollama' ? '🏠 محلي' : '☁️ سحابي'}
                  {msg.emotion?.urgency === 'high' && <span>· ⚡</span>}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end">
            <div className={`px-4 py-3 rounded-2xl rounded-tr-sm ${
              mode === 'private' ? 'bg-gray-800' : 'bg-blue-600'
            }`}>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── خانة الإدخال ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
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
            }`}>
            ⚡
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 px-1">
          {mode === 'private'
            ? '🔒 خاص — لا شيء يخرج'
            : `💼 رسمي · جلسة ${sessionId.slice(-6)}`}
        </p>
      </div>
    </div>
  )
}
