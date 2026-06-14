/**
 * CRM Router — tRPC
 * جهات الاتصال، الصفقات، الأنشطة، والتذكيرات.
 * مُعاد تكييفه من أرشيف jojo-unified-real (Drizzle/MySQL) إلى
 * PostgreSQL باستخدام query/queryOne من core/db.ts.
 *
 * ⚠️ ملاحظة أمنية مؤقتة: كل procedures هنا public (بدون auth) لتسريع
 * MVP. يجب استبدالها بـ protectedProcedure بعد إضافة طبقة Auth —
 * راجع docs/SECURITY_CHECKLIST.md.
 */
import { z } from "zod";
import { publicProcedure, router } from "../core/trpc";
import { query, queryOne } from "../core/db";

// ─── Contacts ──────────────────────────────────────────────────────────────

const contactInput = z.object({
  org_id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  contact_type: z.string().optional(),
  source: z.string().optional(),
  classification: z.enum(["hot", "warm", "cold"]).optional(),
  preferred_type: z.string().optional(),
  preferred_location: z.string().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const crmContactRouter = router({
  list: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        search: z.string().optional(),
        classification: z.enum(["hot", "warm", "cold"]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = ["org_id = $1"];
      const params: unknown[] = [input.org_id];

      if (input.search) {
        params.push(`%${input.search}%`);
        conditions.push(
          `(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`
        );
      }
      if (input.classification) {
        params.push(input.classification);
        conditions.push(`classification = $${params.length}`);
      }

      params.push(input.limit, input.offset);
      const sql = `
        SELECT * FROM contacts
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      return query(sql, params);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return queryOne("SELECT * FROM contacts WHERE id = $1", [input.id]);
    }),

  create: publicProcedure.input(contactInput).mutation(async ({ input }) => {
    const cols = Object.keys(input);
    const values = Object.values(input);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    return queryOne(
      `INSERT INTO contacts (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
  }),

  update: publicProcedure
    .input(z.object({ id: z.string().uuid() }).merge(contactInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const cols = Object.keys(rest);
      if (cols.length === 0) return queryOne("SELECT * FROM contacts WHERE id = $1", [id]);

      const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
      const values = Object.values(rest);
      return queryOne(
        `UPDATE contacts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM contacts WHERE id = $1", [input.id]);
      return { success: true };
    }),

  stats: publicProcedure
    .input(z.object({ org_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return queryOne(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE classification = 'hot') AS hot,
           COUNT(*) FILTER (WHERE classification = 'warm') AS warm,
           COUNT(*) FILTER (WHERE classification = 'cold') AS cold
         FROM contacts WHERE org_id = $1`,
        [input.org_id]
      );
    }),
});

// ─── Deals ─────────────────────────────────────────────────────────────────

const dealInput = z.object({
  org_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().default("SAR").optional(),
  status: z.string().optional(),
  stage: z.string().optional(),
  deal_type: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const crmDealRouter = router({
  list: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        stage: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = ["org_id = $1"];
      const params: unknown[] = [input.org_id];

      if (input.stage) {
        params.push(input.stage);
        conditions.push(`stage = $${params.length}`);
      }

      params.push(input.limit, input.offset);
      return query(
        `SELECT * FROM deals WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
    }),

  create: publicProcedure.input(dealInput).mutation(async ({ input }) => {
    const cols = Object.keys(input);
    const values = Object.values(input);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    return queryOne(
      `INSERT INTO deals (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
  }),

  updateStage: publicProcedure
    .input(z.object({ id: z.string().uuid(), stage: z.string() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `UPDATE deals SET stage = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [input.id, input.stage]
      );
    }),

  update: publicProcedure
    .input(z.object({ id: z.string().uuid() }).merge(dealInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const cols = Object.keys(rest);
      if (cols.length === 0) return queryOne("SELECT * FROM deals WHERE id = $1", [id]);

      const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
      const values = Object.values(rest);
      return queryOne(
        `UPDATE deals SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM deals WHERE id = $1", [input.id]);
      return { success: true };
    }),

  stats: publicProcedure
    .input(z.object({ org_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return queryOne(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(value), 0) AS total_value,
           COUNT(*) FILTER (WHERE status = 'won') AS won,
           COUNT(*) FILTER (WHERE status = 'lost') AS lost
         FROM deals WHERE org_id = $1`,
        [input.org_id]
      );
    }),
});

// ─── Activities ──────────────────────────────────────────────────────────────

export const crmActivityRouter = router({
  listByContact: publicProcedure
    .input(z.object({ contact_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return query(
        "SELECT * FROM crm_activities WHERE contact_id = $1 ORDER BY created_at DESC",
        [input.contact_id]
      );
    }),

  listByDeal: publicProcedure
    .input(z.object({ deal_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return query(
        "SELECT * FROM crm_activities WHERE deal_id = $1 ORDER BY created_at DESC",
        [input.deal_id]
      );
    }),

  create: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        contact_id: z.string().uuid().optional(),
        deal_id: z.string().uuid().optional(),
        activity_type: z.string().min(1),
        description: z.string().optional(),
        created_by: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const cols = Object.keys(input);
      const values = Object.values(input);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      return queryOne(
        `INSERT INTO crm_activities (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }),
});

// ─── Reminders ─────────────────────────────────────────────────────────────

export const crmReminderRouter = router({
  list: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        only_pending: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      const conditions = ["org_id = $1"];
      if (input.only_pending) conditions.push("is_completed = false");
      return query(
        `SELECT * FROM crm_reminders WHERE ${conditions.join(" AND ")} ORDER BY due_at ASC`,
        [input.org_id]
      );
    }),

  create: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        contact_id: z.string().uuid().optional(),
        deal_id: z.string().uuid().optional(),
        title: z.string().min(1),
        notes: z.string().optional(),
        due_at: z.string(),
        created_by: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const cols = Object.keys(input);
      const values = Object.values(input);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      return queryOne(
        `INSERT INTO crm_reminders (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }),

  complete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `UPDATE crm_reminders SET is_completed = true, completed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [input.id]
      );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM crm_reminders WHERE id = $1", [input.id]);
      return { success: true };
    }),
});
