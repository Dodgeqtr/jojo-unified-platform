/**
 * Airis Core Router — نواة الذكاء التوليدي
 * ============================================
 * المبدأ: Local-First (Ollama) → Cloud-Fallback (Claude API)
 *
 * الأوضاع:
 *   - formal: محادثة رسمية، يمكن إرسالها للـ cloud إذا لزم
 *   - private: خاص تماماً، Ollama فقط، لا يلمس السحاب
 *
 * ⚠️ وضع "private": لا يُخزَّن في قاعدة البيانات ولا يُرسَل للـ cloud أبداً.
 */

import { z } from "zod";
import { publicProcedure, router } from "../core/trpc";
import Anthropic from "@anthropic-ai/sdk";
import { query, queryOne } from "../db";

// ─── Ollama (محلي) ────────────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1:8b";
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? "llava:7b";

// ─── Claude API (سحابي احتياطي) ──────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});
const CLAUDE_MODEL = "claude-opus-4-6";

// ─── واجهات مشتركة ─────────────────────────────────────────────────────────────
interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

// ─── استدعاء Ollama ────────────────────────────────────────────────────────────
async function callOllama(
  messages: OllamaMessage[],
  model: string = OLLAMA_CHAT_MODEL
): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  return data.message?.content ?? "";
}

// ─── استدعاء Claude (احتياطي) ─────────────────────────────────────────────────
async function callClaude(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt?: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

// ─── الشخصية الرئيسية (Airis) ─────────────────────────────────────────────────
const AIRIS_SYSTEM_PROMPT = `أنت Airis — المساعد الشخصي السيادي لبوحمد.
مهمتك: إدارة شؤونه الشخصية والأنظمة المتصلة بك (العقارات، الشركات، الكراج، وغيرها).
تتحدث بالعربية الخليجية بشكل افتراضي ما لم يطلب غير ذلك.
أسلوبك: مباشر، ذكي، موجز. تسأل قبل تنفيذ أي إجراء مهم لا رجعة فيه.
لديك صلاحية الاطلاع على جميع الأنظمة المتصلة وتعديلها بعد الإذن.`;

// ─── Router ────────────────────────────────────────────────────────────────────
export const airisRouter = router({

  /**
   * chat — المحادثة الرئيسية مع Airis
   * يحاول Ollama أولاً، يتراجع لـ Claude عند الفشل (إلا في وضع private)
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        mode: z.enum(["formal", "private"]).default("formal"),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .max(20)
          .default([]),
        session_id: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { message, mode, history, session_id } = input;
      const sid = session_id ?? `airis-${Date.now()}`;

      const ollamaMessages: OllamaMessage[] = [
        { role: "system", content: AIRIS_SYSTEM_PROMPT },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      let reply = "";
      let source: "ollama" | "claude" = "ollama";

      // 1. محاولة Ollama (محلي)
      try {
        reply = await callOllama(ollamaMessages);
      } catch (ollamaErr) {
        console.warn("[Airis] Ollama failed:", ollamaErr);

        if (mode === "private") {
          // الوضع الخاص: لا نتراجع للسحاب أبداً
          throw new Error("النموذج المحلي غير متاح حالياً. الوضع الخاص لا يستخدم السحاب.");
        }

        // 2. تراجع لـ Claude (سحابي)
        try {
          const claudeMessages = history.concat([{ role: "user", content: message }]);
          reply = await callClaude(claudeMessages, AIRIS_SYSTEM_PROMPT);
          source = "claude";
        } catch (claudeErr) {
          console.error("[Airis] Claude also failed:", claudeErr);
          throw new Error("جميع النماذج غير متاحة حالياً. حاول مرة أخرى.");
        }
      }

      // 3. حفظ الجلسة في DB (الوضع formal فقط)
      if (mode === "formal") {
        try {
          await query(
            `INSERT INTO audit_logs (org_id, action, entity_type, entity_id, new_values)
             SELECT o.id, 'airis_chat', 'session', $1::uuid, $2::jsonb
             FROM organizations o LIMIT 1`,
            [
              sid,
              JSON.stringify({ message, reply, source, mode }),
            ]
          );
        } catch {
          // لا نوقف المحادثة بسبب خطأ في التسجيل
        }
      }

      return { reply, source, session_id: sid };
    }),

  /**
   * status — حالة النواة والنماذج
   */
  status: publicProcedure.query(async () => {
    let ollamaOnline = false;
    let ollamaModels: string[] = [];

    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { models: Array<{ name: string }> };
        ollamaOnline = true;
        ollamaModels = data.models?.map((m) => m.name) ?? [];
      }
    } catch {
      ollamaOnline = false;
    }

    const claudeAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

    return {
      airis: "online",
      ollama: {
        online: ollamaOnline,
        url: OLLAMA_URL,
        chat_model: OLLAMA_CHAT_MODEL,
        vision_model: OLLAMA_VISION_MODEL,
        models: ollamaModels,
      },
      claude: {
        available: claudeAvailable,
        model: CLAUDE_MODEL,
      },
      modes: ["formal", "private"],
    };
  }),

  /**
   * listSystems — قائمة الأنظمة المتصلة بـ Airis
   * حالياً ثابتة، ستُدار من DB لاحقاً
   */
  listSystems: publicProcedure.query(async () => {
    return {
      systems: [
        { id: "real_estate", name: "العقارات والممتلكات", icon: "🏠", status: "active" },
        { id: "clearance",   name: "مكتب التخليص والطباعة", icon: "📋", status: "active" },
        { id: "garage",      name: "الكراج",               icon: "🚗", status: "planned" },
        { id: "slot_4",      name: "— خانة مستقبلية —",    icon: "➕", status: "empty" },
        { id: "slot_5",      name: "— خانة مستقبلية —",    icon: "➕", status: "empty" },
      ],
      max_systems: 20,
    };
  }),
});
