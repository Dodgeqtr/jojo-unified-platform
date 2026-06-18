/**
 * Airis Enhanced Router — نواة الذكاء التوليدي المطوّرة
 * ======================================================
 * ميزات:
 *   💾  ذاكرة دائمة   — حفظ المحادثات في PostgreSQL
 *   ❤️   حالة عاطفية  — تحليل المزاج وتكييف الأسلوب
 *   🧠  استخراج ذكريات — اقتناص الحقائق تلقائياً
 *   📚  حقن السياق    — إدراج الذكريات في كل محادثة
 *
 * 🔗 سلسلة النماذج: Ollama → Claude → Gemini
 * ⚠️ وضع "private": لا يُخزَّن ولا يُرسَل للـ cloud أبداً.
 */

import { z } from "zod";
import { publicProcedure, router } from "../core/trpc";
import { invokeClaude, invokeGemini, getProviderStatus } from "../core/llm";
import { query, queryOne } from "../db";

// ─── إعدادات النماذج ───────────────────────────────────────────────────────
const OLLAMA_URL        = process.env.OLLAMA_URL        ?? "http://ollama:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1:8b";

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

type LLMSource = "ollama" | "claude" | "gemini";

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
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model, messages, stream: false }),
    signal:  AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  return data.message?.content ?? "";
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
      await query(`INSERT INTO airis_memories (content, importance) VALUES ($1, 7)`, [fact]);
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

      const emotion      = analyzeEmotion(message);
      const memories     = mode === "formal" ? await loadTopMemories() : [];
      const systemPrompt = buildSystemPrompt(emotion, memories);

      const ollamaMessages: OllamaMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      const cloudMessages = history.concat([{ role: "user" as const, content: message }]);

      let reply : string    = "";
      let source: LLMSource = "ollama";

      // 1️⃣ Ollama — النواة المحلية
      try {
        reply = await callOllama(ollamaMessages);
      } catch (ollamaErr) {
        console.warn("[Airis] Ollama failed:", ollamaErr);

        if (mode === "private") {
          throw new Error("النموذج المحلي غير متاح. الوضع الخاص لا يستخدم السحاب.");
        }

        // 2️⃣ Claude — الاحتياطي الأول
        try {
          reply  = await invokeClaude(cloudMessages, systemPrompt);
          source = "claude";
        } catch (claudeErr) {
          console.warn("[Airis] Claude failed:", claudeErr);

          // 3️⃣ Gemini — الاحتياطي الأخير
          try {
            reply  = await invokeGemini(cloudMessages, systemPrompt);
            source = "gemini";
          } catch (geminiErr) {
            console.error("[Airis] Gemini failed:", geminiErr);
            throw new Error("جميع النماذج غير متاحة حالياً (Ollama + Claude + Gemini).");
          }
        }
      }

      if (mode === "formal") {
        await saveMessage(sid, "user",      message, undefined, mode, emotion);
        await saveMessage(sid, "assistant", reply,   source,    mode, emotion);
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
    .input(z.object({ id: z.string() }))
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

    const providers = getProviderStatus();

    return {
      airis:          "online",
      ollama:         { ...providers.ollama, online: ollamaOnline, models: ollamaModels },
      claude:         providers.claude,
      gemini:         providers.gemini,
      fallback_chain: providers.chain,
      memory:         { count: memoryCount },
      modes:          ["formal","private"],
    };
  }),

  // ══ الأنظمة المتصلة ═════════════════════════════════════════════════════════
  listSystems: publicProcedure.query(() => ({
    systems: [
      { id: "real_estate", name: "العقارات والممتلكات", icon: "🏠", status: "active"  as const },
      { id: "clearance",   name: "مكتب التخليص",        icon: "📋", status: "active"  as const },
      { id: "garage",      name: "الكراج",               icon: "🚗", status: "planned" as const },
      { id: "slot_4",      name: "نظام إضافي ٤",         icon: "➕", status: "empty"   as const },
      { id: "slot_5",      name: "نظام إضافي ٥",         icon: "➕", status: "empty"   as const },
    ],
    max_systems: 20,
  })),
});
