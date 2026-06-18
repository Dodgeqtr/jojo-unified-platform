/**
 * LLM Invoker — Jojo Unified Platform
 * =====================================
 * سلسلة النماذج: Ollama (محلي) → Claude (Anthropic) → Gemini (Google)
 * كل نموذج يُجرَّب بالترتيب — إذا فشل نتجه للتالي تلقائياً.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// ─── إعدادات النماذج ──────────────────────────────────────────────────────
const OLLAMA_URL      = process.env.OLLAMA_URL      ?? "http://ollama:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    ?? "llama3.1:8b";

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY ?? "";
const CLAUDE_MODEL    = process.env.CLAUDE_MODEL    ?? "claude-opus-4-6";

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY  ?? "";
const GEMINI_MODEL    = process.env.GEMINI_MODEL    ?? "gemini-2.0-flash";

// ─── Ollama ───────────────────────────────────────────────────────────────
async function invokeOllama(messages: Message[], systemPrompt?: string): Promise<string> {
  const chatMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages,
  ];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model: OLLAMA_MODEL, messages: chatMessages, stream: false }),
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// ─── Claude ───────────────────────────────────────────────────────────────
export async function invokeClaude(messages: Message[], systemPrompt?: string): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY غير مضبوط");

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const claudeMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await anthropic.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: 2048,
    system:     systemPrompt,
    messages:   claudeMessages,
  });

  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

// ─── Gemini ───────────────────────────────────────────────────────────────
export async function invokeGemini(messages: Message[], systemPrompt?: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY غير مضبوط");

  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── حالة المزودين ────────────────────────────────────────────────────────
export function getProviderStatus() {
  return {
    ollama: { available: true,                    model: OLLAMA_MODEL,   url: OLLAMA_URL },
    claude: { available: Boolean(ANTHROPIC_KEY),  model: CLAUDE_MODEL },
    gemini: { available: Boolean(GEMINI_API_KEY), model: GEMINI_MODEL  },
    chain:  ["ollama", "claude", "gemini"],
  };
}

// ─── invokeLLM — الدالة العامة (سلسلة كاملة) ─────────────────────────────
export async function invokeLLM(
  messages:     Message[],
  systemPrompt?: string
): Promise<{ text: string; source: "ollama" | "claude" | "gemini" }> {

  // 1️⃣ Ollama أولاً
  try {
    const text = await invokeOllama(messages, systemPrompt);
    return { text, source: "ollama" };
  } catch (e) {
    console.warn("[LLM] Ollama failed:", (e as Error).message);
  }

  // 2️⃣ Claude ثانياً
  if (ANTHROPIC_KEY) {
    try {
      const text = await invokeClaude(messages, systemPrompt);
      return { text, source: "claude" };
    } catch (e) {
      console.warn("[LLM] Claude failed:", (e as Error).message);
    }
  }

  // 3️⃣ Gemini أخيراً
  if (GEMINI_API_KEY) {
    try {
      const text = await invokeGemini(messages, systemPrompt);
      return { text, source: "gemini" };
    } catch (e) {
      console.warn("[LLM] Gemini failed:", (e as Error).message);
    }
  }

  throw new Error("جميع النماذج غير متاحة حالياً (Ollama + Claude + Gemini).");
}
