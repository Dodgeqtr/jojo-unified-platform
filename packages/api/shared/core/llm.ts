/**
 * LLM Invoker — Jojo Unified Platform
 * Local-first: calls a local Ollama model by default (sovereign, no internet needed).
 * Falls back to Google Gemini if LLM_PROVIDER=gemini and GEMINI_API_KEY is set.
 */

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const LLM_PROVIDER  = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();

const OLLAMA_URL    = process.env.OLLAMA_URL    ?? "http://ollama:11434";
const OLLAMA_MODEL  = process.env.OLLAMA_MODEL  ?? "llama3.1";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

async function invokeOllama(messages: Message[], systemPrompt?: string): Promise<string> {
  const chatMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...messages,
  ];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: chatMessages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

async function invokeGemini(messages: Message[], systemPrompt?: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("[LLM] No GEMINI_API_KEY — returning stub response");
    return "[LLM stub] جوجو جاهز للاتصال بـ Gemini عند توفر المفتاح.";
  }

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function invokeLLM(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  if (LLM_PROVIDER === "gemini") {
    return invokeGemini(messages, systemPrompt);
  }

  try {
    return await invokeOllama(messages, systemPrompt);
  } catch (err) {
    console.error("[LLM] Ollama unavailable:", err);
    if (GEMINI_API_KEY) {
      console.warn("[LLM] Falling back to Gemini");
      return invokeGemini(messages, systemPrompt);
    }
    return "[LLM stub] النواة المحلية (Ollama) غير متاحة حالياً. تأكد من تشغيل خدمة ollama وتحميل النموذج.";
  }
}
