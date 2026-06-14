/**
 * Jojo Central Router — tRPC
 * Connects to JojoCentral AI and n8n Hub
 * Adapted from Google Drive: jojoCentralRouter.ts
 */
import { z } from "zod";
import { publicProcedure, router } from "../core/trpc";
import { invokeLLM, type Message } from "../core/llm";
import { getDb } from "../core/db";
import { JOJO_SYSTEM_PROMPT } from "../core/jojo-system-prompt";

const JOJO_CENTRAL_URL = process.env.JOJO_CENTRAL_URL ?? "https://jjocentral-gdnrzith.manus.space";
const N8N_HUB_URL      = process.env.N8N_HUB_URL      ?? "https://dodgeqtr.app.n8n.cloud/webhook/jojo-ops-hub-v1";
const N8N_API_URL      = process.env.N8N_API_URL       ?? "https://dodgeqtr.app.n8n.cloud";
const N8N_API_KEY      = process.env.N8N_API_KEY       ?? "";

// ─── helpers ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function checkServiceHealth(url: string): Promise<"online" | "offline"> {
  try {
    const res = await fetchWithTimeout(url + "/health", {}, 5000);
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

// ─── router ────────────────────────────────────────────────────────────────

export const jojoCentralRouter = router({

  /** Check health of all connected services */
  healthCheck: publicProcedure.query(async () => {
    const [jojoCentral, n8nHub] = await Promise.allSettled([
      checkServiceHealth(JOJO_CENTRAL_URL),
      checkServiceHealth(N8N_HUB_URL.replace("/webhook/jojo-ops-hub-v1", "")),
    ]);

    // Check n8n workflows count
    let workflowCount = 0;
    try {
      const res = await fetchWithTimeout(
        `${N8N_API_URL}/api/v1/workflows?limit=100`,
        { headers: { "X-N8N-API-KEY": N8N_API_KEY } }
      );
      if (res.ok) {
        const data = (await res.json()) as { data?: unknown[] };
        workflowCount = data.data?.length ?? 0;
      }
    } catch { /* ignore */ }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        jojoCentral: jojoCentral.status === "fulfilled" ? jojoCentral.value : "offline",
        n8nHub:      n8nHub.status === "fulfilled"      ? n8nHub.value      : "offline",
        workflowCount,
      },
    };
  }),

  /** AI Chat with Jojo */
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role:    z.enum(["user", "assistant", "system"]),
            content: z.string(),
          })
        ),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const messages: Message[] = input.messages.map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const systemPrompt = input.context
        ? `${JOJO_SYSTEM_PROMPT}\n\nContext:\n${input.context}`
        : JOJO_SYSTEM_PROMPT;

      const reply = await invokeLLM(messages, systemPrompt);

      return {
        role:      "assistant" as const,
        content:   reply,
        timestamp: new Date().toISOString(),
      };
    }),

  /** Execute a command via n8n Hub */
  executeCommand: publicProcedure
    .input(
      z.object({
        action:  z.string(),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await fetchWithTimeout(
        N8N_HUB_URL,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: input.action, ...input.payload }),
        }
      );

      if (!res.ok) {
        throw new Error(`n8n hub error: ${res.status}`);
      }

      const data = await res.json();
      return { success: true, result: data };
    }),

  /** Sync cloud data sources */
  syncCloudData: publicProcedure
    .input(
      z.object({
        sources: z
          .array(z.enum(["drive", "notion", "gmail", "outlook", "n8n"]))
          .default(["drive", "n8n"]),
      })
    )
    .mutation(async ({ input }) => {
      const results: Record<string, string> = {};

      for (const source of input.sources) {
        try {
          const res = await fetchWithTimeout(
            N8N_HUB_URL,
            {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ action: "sync_" + source }),
            },
            10000
          );
          results[source] = res.ok ? "synced" : "error";
        } catch {
          results[source] = "timeout";
        }
      }

      return { results, timestamp: new Date().toISOString() };
    }),

  /** Get list of connected services */
  getConnectedServices: publicProcedure.query(() => {
    return {
      services: [
        { id: "jojo-central",   name: "Jojo Central",   type: "core",          url: JOJO_CENTRAL_URL,  status: "active" },
        { id: "n8n-hub",        name: "n8n Hub",         type: "automation",    url: N8N_HUB_URL,        status: "active" },
        { id: "google-drive",   name: "Google Drive",    type: "storage",       url: "https://drive.google.com", status: "active" },
        { id: "notion",         name: "Notion",          type: "knowledge",     url: "https://notion.so",        status: "active" },
        { id: "gmail",          name: "Gmail",           type: "communication", url: "https://gmail.com",        status: "active" },
        { id: "outlook",        name: "Outlook",         type: "communication", url: "https://outlook.com",      status: "active" },
        { id: "gemini",         name: "Gemini AI",       type: "ai",            url: "https://ai.google.dev",    status: "active" },
        { id: "heygen",         name: "HeyGen",          type: "media",         url: "https://heygen.com",       status: "active" },
        { id: "huggingface",    name: "Hugging Face",    type: "ai",            url: "https://huggingface.co",   status: "active" },
      ],
    };
  }),

  /** AI property analysis */
  analyze: publicProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        data:       z.record(z.unknown()).optional(),
        query:      z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      let context = "";

      if (input.propertyId) {
        const prop = await db.queryOne(
          "SELECT * FROM properties WHERE id = $1",
          [input.propertyId]
        );
        if (prop) {
          context = `Property data: ${JSON.stringify(prop)}`;
        }
      } else if (input.data) {
        context = `Data: ${JSON.stringify(input.data)}`;
      }

      const analysis = await invokeLLM(
        [{ role: "user", content: input.query }],
        `${JOJO_SYSTEM_PROMPT}\n\n${context}`
      );

      return { analysis, timestamp: new Date().toISOString() };
    }),

  /** Get memory/system status */
  getMemoryStatus: publicProcedure.query(async () => {
    const db = getDb();

    const [workflowCount, contactCount, propertyCount] = await Promise.allSettled([
      db.query("SELECT COUNT(*) as count FROM workflows"),
      db.query("SELECT COUNT(*) as count FROM contacts"),
      db.query("SELECT COUNT(*) as count FROM properties"),
    ]);

    return {
      memory: {
        workflows:  workflowCount.status  === "fulfilled" ? (workflowCount.value[0] as {count: string})?.count  ?? "0" : "N/A",
        contacts:   contactCount.status   === "fulfilled" ? (contactCount.value[0]  as {count: string})?.count  ?? "0" : "N/A",
        properties: propertyCount.status  === "fulfilled" ? (propertyCount.value[0] as {count: string})?.count  ?? "0" : "N/A",
      },
      timestamp: new Date().toISOString(),
    };
  }),

  /** Send heartbeat to all services */
  sendHeartbeat: publicProcedure.mutation(async () => {
    const services = [JOJO_CENTRAL_URL, N8N_API_URL];
    const results: Record<string, string> = {};

    await Promise.all(
      services.map(async (url) => {
        try {
          const res = await fetchWithTimeout(url + "/health", {}, 3000);
          results[url] = res.ok ? "alive" : "error";
        } catch {
          results[url] = "dead";
        }
      })
    );

    return { heartbeat: results, timestamp: new Date().toISOString() };
  }),
});

export type JojoCentralRouter = typeof jojoCentralRouter;
