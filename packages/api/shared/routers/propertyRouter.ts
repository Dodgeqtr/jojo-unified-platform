/**
 * Property Router — tRPC
 * العقارات، العقود، المفضلة، الاستفسارات، الموظفون المفوّضون.
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

// ─── Properties ────────────────────────────────────────────────────────────

const propertyInput = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1),
  location: z.string().optional(),
  property_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  size_sqm: z.number().optional(),
  bedrooms: z.number().int().optional(),
  bathrooms: z.number().int().optional(),
  price: z.number().optional(),
  currency: z.string().default("SAR").optional(),
  status: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  agent_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
});

export const propertyRouter = router({
  list: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        property_type: z.string().optional(),
        status: z.string().optional(),
        city: z.string().optional(),
        price_min: z.number().optional(),
        price_max: z.number().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = ["org_id = $1"];
      const params: unknown[] = [input.org_id];

      if (input.property_type) {
        params.push(input.property_type);
        conditions.push(`property_type = $${params.length}`);
      }
      if (input.status) {
        params.push(input.status);
        conditions.push(`status = $${params.length}`);
      }
      if (input.city) {
        params.push(input.city);
        conditions.push(`city = $${params.length}`);
      }
      if (input.price_min !== undefined) {
        params.push(input.price_min);
        conditions.push(`price >= $${params.length}`);
      }
      if (input.price_max !== undefined) {
        params.push(input.price_max);
        conditions.push(`price <= $${params.length}`);
      }

      params.push(input.limit, input.offset);
      return query(
        `SELECT * FROM properties WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return queryOne("SELECT * FROM properties WHERE id = $1", [input.id]);
    }),

  create: publicProcedure.input(propertyInput).mutation(async ({ input }) => {
    const cols = Object.keys(input);
    const values = Object.values(input);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    return queryOne(
      `INSERT INTO properties (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
  }),

  update: publicProcedure
    .input(z.object({ id: z.string().uuid() }).merge(propertyInput.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const cols = Object.keys(rest);
      if (cols.length === 0) return queryOne("SELECT * FROM properties WHERE id = $1", [id]);

      const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
      const values = Object.values(rest);
      return queryOne(
        `UPDATE properties SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM properties WHERE id = $1", [input.id]);
      return { success: true };
    }),
});

// ─── Contracts ─────────────────────────────────────────────────────────────

const contractInput = z.object({
  org_id: z.string().uuid(),
  property_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  contract_number: z.string().optional(),
  contract_type: z.string().optional(),
  status: z.string().default("draft").optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().default("SAR").optional(),
  terms: z.string().optional(),
});

export const contractRouter = router({
  list: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        status: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: string[] = ["org_id = $1"];
      const params: unknown[] = [input.org_id];

      if (input.status) {
        params.push(input.status);
        conditions.push(`status = $${params.length}`);
      }

      params.push(input.limit, input.offset);
      return query(
        `SELECT * FROM contracts WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
    }),

  create: publicProcedure.input(contractInput).mutation(async ({ input }) => {
    const cols = Object.keys(input);
    const values = Object.values(input);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    return queryOne(
      `INSERT INTO contracts (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
  }),

  updateStatus: publicProcedure
    .input(z.object({ id: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `UPDATE contracts SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [input.id, input.status]
      );
    }),
});

// ─── Favorites ─────────────────────────────────────────────────────────────

export const favoriteRouter = router({
  list: publicProcedure
    .input(z.object({ user_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return query(
        `SELECT p.* FROM favorites f JOIN properties p ON p.id = f.property_id
         WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
        [input.user_id]
      );
    }),

  add: publicProcedure
    .input(z.object({ user_id: z.string().uuid(), property_id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `INSERT INTO favorites (user_id, property_id) VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING RETURNING *`,
        [input.user_id, input.property_id]
      );
    }),

  remove: publicProcedure
    .input(z.object({ user_id: z.string().uuid(), property_id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM favorites WHERE user_id = $1 AND property_id = $2", [
        input.user_id,
        input.property_id,
      ]);
      return { success: true };
    }),
});

// ─── Inquiries ─────────────────────────────────────────────────────────────

export const inquiryRouter = router({
  listForAgent: publicProcedure
    .input(z.object({ assigned_to: z.string().uuid(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = ["assigned_to = $1"];
      const params: unknown[] = [input.assigned_to];
      if (input.status) {
        params.push(input.status);
        conditions.push(`status = $${params.length}`);
      }
      return query(
        `SELECT * FROM inquiries WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
        params
      );
    }),

  create: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        property_id: z.string().uuid().optional(),
        contact_id: z.string().uuid().optional(),
        assigned_to: z.string().uuid().optional(),
        message: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const cols = Object.keys(input);
      const values = Object.values(input);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      return queryOne(
        `INSERT INTO inquiries (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }),

  updateStatus: publicProcedure
    .input(z.object({ id: z.string().uuid(), status: z.string() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `UPDATE inquiries SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [input.id, input.status]
      );
    }),
});

// ─── Authorized Employees ──────────────────────────────────────────────────

export const employeeManagementRouter = router({
  checkAuthorized: publicProcedure
    .input(z.object({ org_id: z.string().uuid(), user_id: z.string().uuid() }))
    .query(async ({ input }) => {
      const row = await queryOne(
        "SELECT * FROM authorized_employees WHERE org_id = $1 AND user_id = $2 AND is_active = true",
        [input.org_id, input.user_id]
      );
      return { authorized: !!row, employee: row };
    }),

  list: publicProcedure
    .input(z.object({ org_id: z.string().uuid() }))
    .query(async ({ input }) => {
      return query(
        `SELECT ae.*, u.email, u.first_name, u.last_name
         FROM authorized_employees ae JOIN users u ON u.id = ae.user_id
         WHERE ae.org_id = $1 ORDER BY ae.created_at DESC`,
        [input.org_id]
      );
    }),

  add: publicProcedure
    .input(
      z.object({
        org_id: z.string().uuid(),
        user_id: z.string().uuid(),
        title: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return queryOne(
        `INSERT INTO authorized_employees (org_id, user_id, title, permissions)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (org_id, user_id) DO UPDATE SET title = $3, permissions = $4, is_active = true
         RETURNING *`,
        [input.org_id, input.user_id, input.title ?? null, JSON.stringify(input.permissions ?? [])]
      );
    }),

  remove: publicProcedure
    .input(z.object({ org_id: z.string().uuid(), user_id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query("DELETE FROM authorized_employees WHERE org_id = $1 AND user_id = $2", [
        input.org_id,
        input.user_id,
      ]);
      return { success: true };
    }),

  toggleActive: publicProcedure
    .input(z.object({ org_id: z.string().uuid(), user_id: z.string().uuid(), is_active: z.boolean() }))
    .mutation(async ({ input }) => {
      return queryOne(
        `UPDATE authorized_employees SET is_active = $3 WHERE org_id = $1 AND user_id = $2 RETURNING *`,
        [input.org_id, input.user_id, input.is_active]
      );
    }),
});
