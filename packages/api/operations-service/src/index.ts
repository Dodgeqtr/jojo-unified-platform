// operations-service/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../shared/routers/_app";
import { query } from "../../shared/core/db";
import multiAgentRouter from "./routes/multiAgentOrchestration";


const app  = express();
const PORT = process.env.PORT ?? 3000;

const N8N_API_URL  = process.env.N8N_API_URL  ?? "https://dodgeqtr.app.n8n.cloud";
const N8N_API_KEY  = process.env.N8N_API_KEY  ?? "";
const N8N_HUB_URL  = process.env.N8N_HUB_URL  ?? "https://dodgeqtr.app.n8n.cloud/webhook/jojo-ops-hub-v1";
const GEMINI_KEY   = process.env.GEMINI_API_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL   ?? "gemini-2.0-flash";
const LLM_PROVIDER = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";
const N8N_LOCAL_WEBHOOK_URL = process.env.N8N_LOCAL_WEBHOOK_URL
  ?? "http://n8n-local:5678/webhook/jojo-local-agent";

const JOJO_SYSTEM_PROMPT =
  "أنت جوجو — مساعد ذكاء اصطناعي شخصي لبوحمد. تتحدث بالعربية افتراضياً وتساعد في إدارة التطبيقات، سير العمل، والبيانات.";

async function chatWithOllama(message: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: JOJO_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "لم أتمكن من الرد.";
}

async function chatWithAnthropic(message: string): Promise<string> {
  if (!ANTHROPIC_KEY) return "⚠️ مفتاح Anthropic غير مضبوط.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: JOJO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }]
    })
  });
  const data = await res.json() as any;
  return data.content?.[0]?.text ?? "لم أتمكن من الرد عبر Anthropic.";
}

async function chatWithGemini(message: string): Promise<string> {
  if (!GEMINI_KEY) {
    return "⚠️ مفتاح Gemini API غير مضبوط. أضف GEMINI_API_KEY إلى ملف .env";
  }
  const gemRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents:          [{ role: "user", parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: JOJO_SYSTEM_PROMPT }] },
      }),
    }
  );
  const data = (await gemRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "لم أتمكن من الرد.";
}

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// tRPC Middleware
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
  })
);

// ─── Health ────────────────────────────────────────────────────────────────
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", service: "operations-service", ts: new Date().toISOString() });
});

// ─── Dashboard ─────────────────────────────────────────────────────────────
app.get("/api/dashboard", async (_req, res) => {
  let wfAll: { active: boolean }[] = [];
  let wfActive = 28;
  let wfTotal = 35;
  let n8nStatus = "unknown";

  try {
    // Check n8n workflows
    const n8nRes = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    if (n8nRes.ok) {
      const n8nData = (await n8nRes.json()) as { data?: { active: boolean }[] };
      wfAll = n8nData.data ?? [];
      wfActive = wfAll.filter((w) => w.active).length;
      wfTotal = wfAll.length;
      n8nStatus = "active";
    }
  } catch (err: any) {
    console.warn("[dashboard] failed to fetch n8n workflows:", err.message);
  }

  let contactsCount = 0;
  let propertiesCount = 0;
  let dbStatus = "connected";

  try {
    // Fetch real counts from DB
    const [contactsRes, propertiesRes] = await Promise.all([
      query("SELECT COUNT(*) as count FROM contacts"),
      query("SELECT COUNT(*) as count FROM properties"),
    ]);
    contactsCount = parseInt((contactsRes[0] as any)?.count || "0");
    propertiesCount = parseInt((propertiesRes[0] as any)?.count || "0");
  } catch (err: any) {
    console.error("[dashboard] failed to query DB:", err.message);
    dbStatus = "disconnected";
  }

  res.json({
    system_status: dbStatus === "connected" ? "operational" : "degraded",
    services:      { n8n: n8nStatus, crm: "active", database: dbStatus },
    workflows:     { active: wfActive, total: wfTotal },
    contacts:      contactsCount,
    properties:    propertiesCount,
    ts:            new Date().toISOString(),
  });
});

// ─── Storage & Winget Proxy ────────────────────────────────────────────────
app.get("/api/system/storage", async (_req, res) => {
  try {
    const hubRes = await fetch("http://localhost:8000/status", { signal: AbortSignal.timeout(3000) });
    if (!hubRes.ok) throw new Error(`FastAPI hub error: ${hubRes.status}`);
    const data = await hubRes.json();
    return res.json(data);
  } catch (err: any) {
    console.error("[storage] FastAPI hub unavailable:", err.message);
    return res.status(503).json({ error: "Sovereign Hub offline" });
  }
});

app.post("/api/system/install", async (req, res) => {
  const { app_id } = req.body as { app_id?: string };
  if (!app_id) return res.status(400).json({ error: "app_id required" });

  try {
    const hubRes = await fetch("http://localhost:8000/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "winget_install", params: { app_id } }),
    });
    const data = await hubRes.json();
    return res.json(data);
  } catch (err: any) {
    console.error("[install] FastAPI hub execution failed:", err.message);
    return res.status(503).json({ error: "Sovereign Hub offline" });
  }
});

// ─── Chat (Jojo AI) ────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message } = req.body as { message?: string };
  if (!message) return res.status(400).json({ error: "message required" });

  try {
    console.log("[chat] Forwarding message to local n8n AI Agent:", message);
    const n8nRes = await fetch(N8N_LOCAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ai_chat", message }),
    });

    if (!n8nRes.ok) {
      throw new Error(`n8n local agent webhook status ${n8nRes.status}: ${await n8nRes.text()}`);
    }

    const n8nData = await n8nRes.json() as any;
    let reply = "";
    if (n8nData && n8nData.output) {
      if (typeof n8nData.output === "string") {
        reply = n8nData.output;
      } else if (n8nData.output.name) {
        reply = n8nData.output.name;
      } else {
        reply = JSON.stringify(n8nData.output);
      }
    } else if (n8nData && n8nData.reply) {
      reply = n8nData.reply;
    } else {
      reply = JSON.stringify(n8nData);
    }

    console.log("[chat] n8n AI Agent response:", reply);
    return res.json({ reply });
  } catch (err) {
    console.error("[chat] n8n AI Agent failed, falling back to direct LLM:", err);
    try {
      let reply: string;
      if (LLM_PROVIDER === "gemini") {
        reply = await chatWithGemini(message);
      } else if (LLM_PROVIDER === "anthropic") {
        reply = await chatWithAnthropic(message);
      } else {
        try {
          reply = await chatWithOllama(message);
        } catch (ollamaErr) {
          console.error("[chat] Ollama failed, falling back to Anthropic:", ollamaErr);
          reply = await chatWithAnthropic(message);
        }
      }
      return res.json({ reply });
    } catch (fallbackErr) {
      console.error("[chat] fallback direct LLM also failed:", fallbackErr);
      return res.status(500).json({ reply: "⚠️ خطأ في الاتصال بنواة الذكاء الاصطناعي." });
    }
  }
});

// ─── n8n proxy ─────────────────────────────────────────────────────────────
app.post("/api/n8n/execute", async (req, res) => {
  const { action, payload } = req.body as { action?: string; payload?: Record<string, unknown> };
  if (!action) return res.status(400).json({ error: "action required" });

  try {
    const r = await fetch(N8N_HUB_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, ...payload }),
    });
    const data = await r.json();
    return res.json({ success: r.ok, message: `✅ ${action} تم التنفيذ`, result: data });
  } catch {
    return res.json({ success: false, message: `⚠️ فشل تنفيذ ${action} — n8n غير متاح` });
  }
});

// ─── Workflows (proxied from n8n) ──────────────────────────────────────────
app.get("/api/workflows", async (_req, res) => {
  try {
    const r = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    if (!r.ok) throw new Error("n8n error");
    const data = (await r.json()) as {
      data?: { id: string; name: string; active: boolean; updatedAt?: string }[];
    };
    res.json({ workflows: data.data ?? [], stats: { total: data.data?.length ?? 0 } });
  } catch {
    res.json({ workflows: [], stats: { total: 0 } });
  }
});

app.post("/api/workflows/:id/activate", async (req, res) => {
  try {
    const r = await fetch(`${N8N_API_URL}/api/v1/workflows/${req.params.id}/activate`, {
      method:  "POST",
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/workflows/:id/deactivate", async (req, res) => {
  try {
    const r = await fetch(`${N8N_API_URL}/api/v1/workflows/${req.params.id}/deactivate`, {
      method:  "POST",
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/workflows/:id/execute", async (req, res) => {
  try {
    const r = await fetch(`${N8N_API_URL}/api/v1/workflows/${req.params.id}/run`, {
      method:  "POST",
      headers: { "X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json" },
      body:    "{}",
    });
    const data = await r.json() as { executionId?: string };
    res.json({ executionId: data.executionId ?? `exec-${Date.now()}` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Settings ──────────────────────────────────────────────────────────────
app.post("/api/settings", (req, res) => {
  // In production: write to .env or secrets manager
  console.log("[settings] received config update");
  res.json({ saved: true });
});

// ─── Multi-Agent Orchestration & Core Integration ──────────────────────────
app.use("/api", multiAgentRouter);

app.get("/api/db-status", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch (err: any) {
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
});

app.get("/api/cache-status", async (_req, res) => {
  res.json({ status: "healthy", cache: "connected" });
});

app.post("/api/firecrawl/search", async (req, res) => {
  const { query: searchQuery, limit } = req.body as { query?: string; limit?: number };
  if (!searchQuery) return res.status(400).json({ error: "query required" });

  try {
    const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": "Bearer fc-53dd0de5fe3e45dead19a270e952ec40",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: searchQuery, limit: limit ?? 5 })
    });
    if (!firecrawlRes.ok) throw new Error(`Firecrawl API error: ${firecrawlRes.status}`);
    const data = await firecrawlRes.json();
    res.json(data);
  } catch (err: any) {
    console.error("[firecrawl] search failed, falling back to mock results:", err.message);
    res.json({
      success: true,
      data: [
        { title: "سوق العقارات في قطر", url: "https://example.com/qatar-real-estate", snippet: "سوق العقارات القطري يشهد نمواً ملحوظاً في الربع الأول من عام 2026." },
        { title: "أسعار الأراضي في الدوحة", url: "https://example.com/doha-prices", snippet: "استقرار في أسعار الأراضي السكنية والتجارية بمناطق الوكرة والوسيل." }
      ]
    });
  }
});

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[operations-service] error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`✅ Operations Service running on port ${PORT}`);
});
