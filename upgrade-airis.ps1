# ================================================================
# upgrade-airis.ps1 — تحديث Airis بكل ميزاته الكاملة
# ================================================================
# تشغيل:
#   cd C:\Users\dodge\jojo-unified-platform
#   .\upgrade-airis.ps1
#
# خيارات:
#   -SkipDocker   لا تعيد بناء الـ containers
#   -SkipGit      لا تعمل git commit
# ================================================================

param(
    [switch]$SkipDocker,
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

function Write-File {
    param($RelPath, $Content)
    $full = Join-Path $ROOT $RelPath
    $dir  = Split-Path $full -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($full, $Content, [System.Text.Encoding]::UTF8)
    Write-Host "  OK  $RelPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Airis Feature Upgrade - جوجو المحلي" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan


# ══════════════════════════════════════════════════════════════
# 1. MIGRATION SQL — جداول الذاكرة الدائمة
# ══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[1/4] قاعدة البيانات — جدول airis_sessions + airis_memories" -ForegroundColor Yellow

Write-File "database/migrations/004_airis_memory.sql" @'
-- ================================================================
-- Migration 004: Airis - Persistent Sessions + Long-Term Memory
-- ================================================================

-- جلسات المحادثة الدائمة
CREATE TABLE IF NOT EXISTS airis_sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('user','assistant')),
    content     TEXT         NOT NULL,
    source      VARCHAR(20),
    mode        VARCHAR(20)  DEFAULT 'formal',
    emotion     JSONB        DEFAULT '{}',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airis_sessions_sid
    ON airis_sessions(session_id, created_at);

-- الذكريات المستخرجة طويلة الأمد
CREATE TABLE IF NOT EXISTS airis_memories (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    content          TEXT    NOT NULL,
    importance       INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    times_recalled   INTEGER DEFAULT 0,
    last_recalled_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airis_memories_rank
    ON airis_memories(importance DESC, times_recalled DESC);
'@


# ══════════════════════════════════════════════════════════════
# 2. BACKEND — airisRouter.ts المطوّر
# ══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[2/4] Backend — airisRouter.ts (ذاكرة + عاطفة + إجراءات جديدة)" -ForegroundColor Yellow

Write-File "packages/api/shared/routers/airisRouter.ts" @'
/**
 * Airis Enhanced Router — نواة الذكاء التوليدي المطوّرة
 * ======================================================
 * ميزات جديدة (مستوحاة من Airis-Project):
 *   💾  ذاكرة دائمة   — حفظ المحادثات في PostgreSQL
 *   ❤️   حالة عاطفية  — تحليل المزاج وتكييف الأسلوب
 *   🧠  استخراج ذكريات — اقتناص الحقائق تلقائياً
 *   📚  حقن السياق    — إدراج الذكريات في كل محادثة
 *
 * ⚠️ وضع "private": لا يُخزَّن ولا يُرسَل للـ cloud أبداً.
 */

import { z } from "zod";
import { publicProcedure, router } from "../core/trpc";
import Anthropic from "@anthropic-ai/sdk";
import { query, queryOne } from "../db";

// ─── إعدادات النماذج ───────────────────────────────────────────────────────
const OLLAMA_URL        = process.env.OLLAMA_URL        ?? "http://ollama:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1:8b";
const CLAUDE_MODEL      = "claude-opus-4-6";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

// ─── الشخصية الأساسية ────────────────────────────────────────────────────────
const AIRIS_BASE_PROMPT = `أنت Airis — المساعد الشخصي السيادي لبوحمد.
مهمتك: إدارة شؤونه الشخصية والأنظمة المتصلة بك (العقارات، الشركات، الكراج، وغيرها).
تتحدث بالعربية الخليجية بشكل افتراضي ما لم يطلب غير ذلك.
أسلوبك: مباشر، ذكي، موجز. تسأل قبل تنفيذ أي إجراء مهم لا رجعة فيه.`;

// ─── واجهات ─────────────────────────────────────────────────────────────────
interface OllamaMessage { role: "user" | "assistant" | "system"; content: string }
interface EmotionState  { urgency: "high" | "normal"; mood: "positive" | "frustrated" | "neutral" }
interface DBMessage     { role: string; content: string; source?: string; created_at?: Date }
interface DBMemory      { id: string; content: string; importance: number; times_recalled: number; created_at: Date }

// ─── تحليل العاطفة ───────────────────────────────────────────────────────────
function analyzeEmotion(text: string): EmotionState {
  const urgencyWords    = ["عاجل","سريع","الآن","فوراً","ضروري","بسرعة","مهم جداً"];
  const positiveWords   = ["شكراً","ممتاز","رائع","جيد","تمام","مشكور","عظيم","بسيط"];
  const frustratedWords = ["لا يعمل","غلط","خطأ","مشكلة","لا أفهم","ما يشتغل","معطل","لماذا"];

  const urgency = urgencyWords.some(w => text.includes(w)) ? "high" : "normal";
  const mood    = positiveWords.some(w => text.includes(w))   ? "positive"
                : frustratedWords.some(w => text.includes(w)) ? "frustrated"
                : "neutral";

  return { urgency, mood };
}

// ─── System Prompt ديناميكي ───────────────────────────────────────────────────
function buildSystemPrompt(emotion: EmotionState, memories: string[]): string {
  let prompt = AIRIS_BASE_PROMPT;

  if (memories.length > 0) {
    prompt += `\n\n📚 ذاكرتك عن بوحمد:\n${memories.map(m => `- ${m}`).join("\n")}`;
  }

  if (emotion.urgency === "high")    prompt += "\n\n⚡ الموضوع عاجل — أجب مباشرة وموجزاً.";
  if (emotion.mood === "frustrated") prompt += "\n\n🤝 بوحمد محتاج مساعدة — كن صبوراً وواضحاً.";
  if (emotion.mood === "positive")   prompt += "\n\n😊 المزاج ممتاز — تكلم بثقة واسترخاء.";

  return prompt;
}

// ─── استدعاء Ollama ───────────────────────────────────────────────────────────
async function callOllama(messages: OllamaMessage[], model = OLLAMA_CHAT_MODEL): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  return data.message?.content ?? "";
}

// ─── استدعاء Claude ───────────────────────────────────────────────────────────
async function callClaude(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  system?: string
): Promise<string> {
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL, max_tokens: 2048, system, messages,
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

// ─── حفظ رسالة في DB ─────────────────────────────────────────────────────────
async function saveMessage(
  sessionId: string, role: string, content: string,
  source?: string, mode = "formal", emotion: EmotionState = { urgency: "normal", mood: "neutral" }
) {
  try {
    await query(
      `INSERT INTO airis_sessions (session_id, role, content, source, mode, emotion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, role, content, source ?? null, mode, JSON.stringify(emotion)]
    );
  } catch (err) {
    console.error("[Airis] saveMessage failed:", err);
  }
}

// ─── تحميل تاريخ الجلسة ──────────────────────────────────────────────────────
async function loadSessionHistory(sessionId: string, limit = 20): Promise<DBMessage[]> {
  try {
    return await query<DBMessage>(
      `SELECT role, content, source, created_at FROM airis_sessions
       WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [sessionId, limit]
    );
  } catch { return []; }
}

// ─── استخراج ذكريات من المحادثة ──────────────────────────────────────────────
async function extractAndSaveMemory(userMsg: string, aiReply: string) {
  if (userMsg.length < 15) return;

  const prompt = `من هذه المحادثة، استخرج الحقائق المهمة التي يجب تذكرها عن بوحمد أو أنظمته.
أجب بـ JSON فقط بدون أي نص آخر:
{"facts": ["حقيقة 1", "حقيقة 2"], "important": true}
إذا لا توجد حقائق مهمة: {"facts": [], "important": false}

المستخدم: ${userMsg}
المساعد: ${aiReply}`;

  try {
    const raw   = await callOllama([{ role: "user", content: prompt }]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return;

    const parsed = JSON.parse(match[0]) as { facts: string[]; important: boolean };
    if (!parsed.important || !parsed.facts?.length) return;

    for (const fact of parsed.facts.slice(0, 3)) {
      if (fact.length < 8) continue;
      await query(
        `INSERT INTO airis_memories (content, importance) VALUES ($1, 7)`,
        [fact]
      );
    }
  } catch { /* silent — الذاكرة غير حرجة */ }
}

// ─── تحميل أهم الذكريات ──────────────────────────────────────────────────────
async function loadTopMemories(limit = 6): Promise<string[]> {
  try {
    const rows = await query<{ content: string }>(
      `SELECT content FROM airis_memories
       ORDER BY importance DESC, times_recalled DESC, created_at DESC LIMIT $1`,
      [limit]
    );
    // تحديث عداد الاستدعاء بشكل غير متزامن
    query(
      `UPDATE airis_memories SET times_recalled = times_recalled + 1, last_recalled_at = NOW()
       WHERE id IN (SELECT id FROM airis_memories ORDER BY importance DESC LIMIT $1)`,
      [limit]
    ).catch(() => {});
    return rows.map(r => r.content);
  } catch { return []; }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const airisRouter = router({

  // ══ المحادثة الرئيسية ═══════════════════════════════════════════════════════
  chat: publicProcedure
    .input(z.object({
      message:    z.string().min(1).max(4000),
      mode:       z.enum(["formal","private"]).default("formal"),
      history:    z.array(z.object({
                    role:    z.enum(["user","assistant"]),
                    content: z.string(),
                  })).max(20).default([]),
      session_id: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { message, mode, history, session_id } = input;
      const sid = session_id ?? `airis-${Date.now()}`;

      // 1. تحليل العاطفة
      const emotion = analyzeEmotion(message);

      // 2. تحميل الذكريات (formal فقط)
      const memories = mode === "formal" ? await loadTopMemories() : [];

      // 3. بناء System Prompt
      const systemPrompt = buildSystemPrompt(emotion, memories);

      // 4. بناء رسائل Ollama
      const ollamaMessages: OllamaMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      let reply  = "";
      let source: "ollama" | "claude" = "ollama";

      // 5. Ollama أولاً
      try {
        reply = await callOllama(ollamaMessages);
      } catch (ollamaErr) {
        console.warn("[Airis] Ollama failed:", ollamaErr);

        if (mode === "private") {
          throw new Error("النموذج المحلي غير متاح. الوضع الخاص لا يستخدم السحاب.");
        }

        // تراجع لـ Claude
        try {
          reply  = await callClaude(
            history.concat([{ role: "user", content: message }]),
            systemPrompt
          );
          source = "claude";
        } catch (claudeErr) {
          console.error("[Airis] Claude failed:", claudeErr);
          throw new Error("جميع النماذج غير متاحة حالياً.");
        }
      }

      // 6. حفظ في DB (formal فقط)
      if (mode === "formal") {
        await saveMessage(sid, "user",      message, undefined, mode, emotion);
        await saveMessage(sid, "assistant", reply,   source,    mode, emotion);
        // استخراج ذكريات بشكل غير متزامن — لا ينتظر
        extractAndSaveMemory(message, reply).catch(() => {});
      }

      return { reply, source, session_id: sid, emotion };
    }),

  // ══ تاريخ الجلسة ════════════════════════════════════════════════════════════
  getHistory: publicProcedure
    .input(z.object({ session_id: z.string() }))
    .query(async ({ input }) => {
      const rows = await loadSessionHistory(input.session_id, 50);
      return { messages: rows };
    }),

  // ══ قائمة الجلسات ═══════════════════════════════════════════════════════════
  listSessions: publicProcedure.query(async () => {
    try {
      const rows = await query<{ session_id: string; msg_count: string; last_at: Date }>(
        `SELECT session_id, COUNT(*) AS msg_count, MAX(created_at) AS last_at
         FROM airis_sessions GROUP BY session_id ORDER BY last_at DESC LIMIT 20`
      );
      return { sessions: rows };
    } catch { return { sessions: [] }; }
  }),

  // ══ الذكريات المخزنة ════════════════════════════════════════════════════════
  getMemories: publicProcedure.query(async () => {
    try {
      const rows = await query<DBMemory>(
        `SELECT id, content, importance, times_recalled, created_at
         FROM airis_memories ORDER BY importance DESC, created_at DESC LIMIT 50`
      );
      return { memories: rows };
    } catch { return { memories: [] }; }
  }),

  // ══ حذف ذكرى ════════════════════════════════════════════════════════════════
  deleteMemory: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query(`DELETE FROM airis_memories WHERE id = $1`, [input.id]);
      return { success: true };
    }),

  // ══ مسح جلسة ════════════════════════════════════════════════════════════════
  clearSession: publicProcedure
    .input(z.object({ session_id: z.string() }))
    .mutation(async ({ input }) => {
      await query(`DELETE FROM airis_sessions WHERE session_id = $1`, [input.session_id]);
      return { success: true };
    }),

  // ══ الحالة ══════════════════════════════════════════════════════════════════
  status: publicProcedure.query(async () => {
    let ollamaOnline = false;
    let ollamaModels: string[] = [];

    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        const data = await res.json() as { models: Array<{ name: string }> };
        ollamaOnline = true;
        ollamaModels = data.models?.map(m => m.name) ?? [];
      }
    } catch { ollamaOnline = false; }

    let memoryCount = 0;
    try {
      const r = await queryOne<{ c: string }>("SELECT COUNT(*) AS c FROM airis_memories");
      memoryCount = parseInt(r?.c ?? "0");
    } catch {}

    return {
      airis:  "online",
      ollama: { online: ollamaOnline, url: OLLAMA_URL, model: OLLAMA_CHAT_MODEL, models: ollamaModels },
      claude: { available: Boolean(process.env.ANTHROPIC_API_KEY), model: CLAUDE_MODEL },
      memory: { count: memoryCount },
      modes:  ["formal","private"],
    };
  }),

  // ══ الأنظمة المتصلة ═════════════════════════════════════════════════════════
  listSystems: publicProcedure.query(async () => ({
    systems: [
      { id: "real_estate", name: "العقارات والممتلكات", icon: "🏠", status: "active"  },
      { id: "clearance",   name: "مكتب التخليص",        icon: "📋", status: "active"  },
      { id: "garage",      name: "الكراج",               icon: "🚗", status: "planned" },
      { id: "slot_4",      name: "— مستقبلية —",         icon: "➕", status: "empty"   },
    ],
    max_systems: 20,
  })),
});
'@


# ══════════════════════════════════════════════════════════════
# 3. FRONTEND — Airis.tsx المطوّر
# ══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[3/4] Frontend — Airis.tsx (ذاكرة + مزاج + تاريخ جلسات)" -ForegroundColor Yellow

Write-File "packages/web/src/pages/Airis.tsx" @'
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

  // ─── تحميل أولي ───────────────────────────────────────────────────────────
  const refreshMemories = useCallback(async () => {
    try {
      const r = await (api.airis as any).getMemories.query()
      setMemories(r.memories ?? [])
    } catch {}
  }, [])

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
'@


# ══════════════════════════════════════════════════════════════
# 4. GIT COMMIT + DOCKER REBUILD
# ══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[4/4] Git + Docker..." -ForegroundColor Yellow

if (!$SkipGit) {
    Write-Host "  git add + commit..." -ForegroundColor Gray
    git -C $ROOT add -A
    git -C $ROOT commit -m "feat(airis): persistent memory + emotional engine + enhanced UI

- Migration 004: airis_sessions + airis_memories tables
- airisRouter: emotion analysis, memory extraction, getHistory/getMemories/deleteMemory/clearSession
- Airis.tsx: memory panel, mood indicator, session management, DB-backed history"
    Write-Host "  OK  git commit" -ForegroundColor Green
}

if (!$SkipDocker) {
    Write-Host "  docker rebuild (no-cache)..." -ForegroundColor Gray
    docker compose -f "$ROOT/docker-compose.yml" up -d --build --no-cache operations-service web
    Write-Host "  OK  docker up" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  اكتمل التحديث!" -ForegroundColor Green
Write-Host ""
Write-Host "  افتح: http://localhost" -ForegroundColor White
Write-Host ""
Write-Host "  ميزات جديدة:" -ForegroundColor White
Write-Host "    🧠 زر الذكريات — يظهر الحقائق المحفوظة عنك"
Write-Host "    😊 مؤشر المزاج — يتغير حسب نبرة محادثتك"
Write-Host "    💾 جلسات دائمة — تاريخ المحادثات في DB"
Write-Host "    ＋  زر جلسة جديدة — لبدء محادثة نظيفة"
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
