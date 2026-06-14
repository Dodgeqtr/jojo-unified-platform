/**
 * عميل tRPC مشترك للواجهة (Web).
 * يتصل بـ operations-service على /api/trpc ويعطينا type-safety
 * كامل عبر AppRouter (تشمل routers الجديدة: properties, contracts,
 * favorites, inquiries, employees, crmContacts, crmDeals, ...).
 */
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/shared/routers/_app";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
    }),
  ],
});

export type { AppRouter };
