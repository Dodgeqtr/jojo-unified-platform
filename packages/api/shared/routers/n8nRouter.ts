/**
 * n8n Router — tRPC
 * Connects to n8n System Gateway with retry + exponential backoff
 * Adapted from Google Drive: n8nRouter.ts
 */
import { z } from "zod";
import { randomUUID } from "crypto";
import { publicProcedure, router } from "../core/trpc";

// ─── السحابي (n8n.cloud) — للأتمتة الخارجية: Gmail، إشعارات، تكاملات OAuth ──
const N8N_CLOUD_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
  ?? "https://dodgeqtr.app.n8n.cloud/webhook/jojo-system-gateway-v1";
const N8N_CLOUD_API_URL     = process.env.N8N_API_URL ?? "https://dodgeqtr.app.n8n.cloud";
const N8N_CLOUD_API_KEY     = process.env.N8N_API_KEY ?? "";

// ─── المحلي (n8n-local Docker) — لوكيل Jojo + Ollama + Firecrawl ───────────
const N8N_LOCAL_WEBHOOK_URL = process.env.N8N_LOCAL_WEBHOOK_URL
  ?? "http://n8n-local:5678/webhook/jojo-local-agent";
const N8N_LOCAL_API_URL     = process.env.N8N_LOCAL_API_URL ?? "http://n8n-local:5678";
const N8N_LOCAL_API_KEY     = process.env.N8N_LOCAL_API_KEY ?? "";

// إبقاء أسماء قديمة للتوافق الخلفي
const N8N_WEBHOOK_URL = N8N_CLOUD_WEBHOOK_URL;
const N8N_API_URL     = N8N_CLOUD_API_URL;
const N8N_API_KEY     = N8N_CLOUD_API_KEY;

type N8nInstance = "cloud" | "local";

function instanceConfig(instance: N8nInstance) {
  return instance === "local"
    ? { webhookUrl: N8N_LOCAL_WEBHOOK_URL, apiUrl: N8N_LOCAL_API_URL, apiKey: N8N_LOCAL_API_KEY }
    : { webhookUrl: N8N_CLOUD_WEBHOOK_URL, apiUrl: N8N_CLOUD_API_URL, apiKey: N8N_CLOUD_API_KEY };
}

// إجراءات يُفترض تنفيذها محلياً (وكيل Jojo + Ollama + Firecrawl)
const LOCAL_ACTIONS = new Set([
  "ai_chat", "agent_query", "research_summary", "property_analysis", "market_analysis",
]);

const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 1500;

// ─── retry helper ──────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delayMs = RETRY_DELAY_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─── n8n webhook helper ────────────────────────────────────────────────────

async function callN8N(
  action: string,
  payload: Record<string, unknown> = {},
  instance?: N8nInstance
): Promise<Record<string, unknown>> {
  const target = instance ?? (LOCAL_ACTIONS.has(action) ? "local" : "cloud");
  const { webhookUrl } = instanceConfig(target);

  return withRetry(async () => {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": randomUUID(),
        "X-N8N-Instance": target,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) {
      throw new Error(`n8n ${target} gateway ${res.status}: ${await res.text()}`);
    }

    return (await res.json()) as Record<string, unknown>;
  });
}

// ─── fallback responses ────────────────────────────────────────────────────

const FALLBACK: Record<string, Record<string, unknown>> = {
  research_summary:  { summary: "لا يمكن الاتصال بـ n8n حالياً — يرجى المحاولة لاحقاً.", cached: true },
  send_notification: { sent: false, reason: "offline" },
  create_task:       { created: false, reason: "offline" },
  get_status:        { status: "unknown", services: [], reason: "offline" },
  property_analysis: { analysis: "التحليل غير متاح — n8n offline.", cached: true },
  generate_report:   { report: null, reason: "offline" },
  client_lookup:     { client: null, reason: "offline" },
  workflow_health:   { healthy: false, reason: "offline" },
  error_log:         { errors: [], reason: "offline" },
  bulk_export:       { exported: 0, reason: "offline" },
};

function fallback(action: string): Record<string, unknown> {
  return FALLBACK[action] ?? { success: false, reason: "offline" };
}

// ─── فحص حالة حساب n8n (سحابي/محلي) ────────────────────────────────────────

async function checkInstanceHealth(instance: N8nInstance): Promise<{
  healthy: boolean; total: number; active: number; inactive: number;
  list: { id: string; name: string; active: boolean }[];
}> {
  const { apiUrl, apiKey } = instanceConfig(instance);
  const res = await fetch(`${apiUrl}/api/v1/workflows?limit=100`, {
    headers: apiKey ? { "X-N8N-API-KEY": apiKey } : {},
  });
  if (!res.ok) throw new Error(`n8n ${instance} API error: ${res.status}`);
  const data = (await res.json()) as { data?: { id: string; name: string; active: boolean }[] };
  const workflows = data.data ?? [];
  return {
    healthy:  true,
    total:    workflows.length,
    active:   workflows.filter((w) => w.active).length,
    inactive: workflows.filter((w) => !w.active).length,
    list:     workflows.map((w) => ({ id: w.id, name: w.name, active: w.active })),
  };
}

// ─── router ────────────────────────────────────────────────────────────────

export const n8nRouter = router({

  /** Send any command to n8n gateway (cloud أو local — يُختار تلقائياً حسب نوع الإجراء، أو تُحدَّد يدوياً) */
  sendCommand: publicProcedure
    .input(
      z.object({
        action:   z.string(),
        payload:  z.record(z.unknown()).optional(),
        instance: z.enum(["cloud", "local"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await callN8N(input.action, input.payload ?? {}, input.instance);
        return { success: true, result };
      } catch (err) {
        console.error("[n8nRouter.sendCommand] error:", err);
        return { success: false, result: fallback(input.action) };
      }
    }),

  /** محادثة مباشرة مع وكيل Jojo المحلي (n8n-local + Ollama + Firecrawl) */
  askJojoAgent: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await callN8N("ai_chat", { message: input.message }, "local");
        return { success: true, result };
      } catch (err) {
        console.error("[n8nRouter.askJojoAgent] error:", err);
        return {
          success: false,
          result: { reply: "⚠️ وكيل Jojo المحلي غير متاح حالياً (تأكد أن n8n-local يعمل ويحتوي workflow مفعّل بـ webhook).", offline: true },
        };
      }
    }),

  /** فحص حالة كلا حسابي n8n (السحابي والمحلي) بشكل متوازٍ */
  syncStatus: publicProcedure.query(async () => {
    const [cloud, local] = await Promise.allSettled([
      checkInstanceHealth("cloud"),
      checkInstanceHealth("local"),
    ]);
    return {
      cloud: cloud.status === "fulfilled" ? cloud.value : { healthy: false, error: String(cloud.reason) },
      local: local.status === "fulfilled" ? local.value : { healthy: false, error: String(local.reason) },
      synced: cloud.status === "fulfilled" && local.status === "fulfilled"
        && cloud.value.healthy && local.value.healthy,
    };
  }),

  /** Send email via n8n */
  sendEmail: publicProcedure
    .input(
      z.object({
        to:      z.string().email(),
        subject: z.string(),
        body:    z.string(),
        cc:      z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await callN8N("send_email", input);
        return { success: true, result };
      } catch (err) {
        console.error("[n8nRouter.sendEmail] error:", err);
        // Gmail 403 handling — notify user
        return {
          success: false,
          result:  { sent: false, reason: "Gmail OAuth error — check n8n credentials" },
        };
      }
    }),

  /** Research summary */
  researchSummary: publicProcedure
    .input(z.object({ topic: z.string(), depth: z.enum(["brief", "detailed"]).default("brief") }))
    .mutation(async ({ input }) => {
      try {
        return await callN8N("research_summary", input);
      } catch {
        return fallback("research_summary");
      }
    }),

  /** Property analysis */
  analyzeProperty: publicProcedure
    .input(z.object({ propertyId: z.string().optional(), data: z.record(z.unknown()).optional() }))
    .mutation(async ({ input }) => {
      try {
        return await callN8N("property_analysis", input);
      } catch {
        return fallback("property_analysis");
      }
    }),

  /** Market analysis */
  marketAnalysis: publicProcedure
    .input(z.object({ area: z.string(), propertyType: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        return await callN8N("market_analysis", input);
      } catch {
        return fallback("property_analysis");
      }
    }),

  /** Schedule a property viewing */
  scheduleViewing: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        clientId:   z.string(),
        datetime:   z.string(),
        notes:      z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await callN8N("schedule_viewing", input);
      } catch {
        return { scheduled: false, reason: "offline" };
      }
    }),

  /** Workflow health check */
  workflowHealth: publicProcedure.query(async () => {
    try {
      const res = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
        headers: { "X-N8N-API-KEY": N8N_API_KEY },
      });
      if (!res.ok) throw new Error("n8n API error");
      const data = (await res.json()) as { data?: { id: string; name: string; active: boolean }[] };
      const workflows = data.data ?? [];
      return {
        healthy:  true,
        total:    workflows.length,
        active:   workflows.filter((w) => w.active).length,
        inactive: workflows.filter((w) => !w.active).length,
        list:     workflows.map((w) => ({ id: w.id, name: w.name, active: w.active })),
      };
    } catch {
      return fallback("workflow_health");
    }
  }),

  /** Get error logs from n8n */
  getErrorLogs: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const res = await fetch(
          `${N8N_API_URL}/api/v1/executions?status=error&limit=${input.limit}`,
          { headers: { "X-N8N-API-KEY": N8N_API_KEY } }
        );
        if (!res.ok) throw new Error("n8n API error");
        return await res.json();
      } catch {
        return fallback("error_log");
      }
    }),

  /** Bulk export */
  bulkExport: publicProcedure
    .input(z.object({ type: z.enum(["contacts", "properties", "workflows", "all"]) }))
    .mutation(async ({ input }) => {
      try {
        return await callN8N("bulk_export", input);
      } catch {
        return fallback("bulk_export");
      }
    }),

  /** Send push notification */
  sendNotification: publicProcedure
    .input(
      z.object({
        title:    z.string(),
        message:  z.string(),
        priority: z.number().min(1).max(10).default(5),
        channel:  z.enum(["telegram", "gotify", "both"]).default("both"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await callN8N("send_notification", input);
      } catch {
        return fallback("send_notification");
      }
    }),

  /** Get all available n8n actions */
  getAvailableActions: publicProcedure.query(() => {
    return {
      actions: [
        "research_summary",   "send_notification", "create_task",
        "get_status",         "property_analysis", "generate_report",
        "client_lookup",      "contract_review",   "send_email",
        "ai_summary",         "market_analysis",   "schedule_viewing",
        "update_listing",     "archive_property",  "bulk_export",
        "workflow_health",    "error_log",
      ],
    };
  }),
});

export type N8nRouter = typeof n8nRouter;
