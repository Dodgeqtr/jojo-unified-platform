import { router } from "../core/trpc";
import { jojoCentralRouter } from "./jojoCentralRouter";
import { n8nRouter } from "./n8nRouter";
import {
  propertyRouter,
  contractRouter,
  favoriteRouter,
  inquiryRouter,
  employeeManagementRouter,
} from "./propertyRouter";
import {
  crmContactRouter,
  crmDealRouter,
  crmActivityRouter,
  crmReminderRouter,
} from "./crmRouter";
import { airisRouter } from "./airisRouter";

export const appRouter = router({
  // ===== Airis Core — نواة الذكاء التوليدي =====
  airis: airisRouter,
  // ===== Legacy / Infrastructure =====
  jojo: jojoCentralRouter,
  n8n: n8nRouter,
  // ===== CRM / العقارات (Sprint 1) =====
  properties: propertyRouter,
  contracts: contractRouter,
  favorites: favoriteRouter,
  inquiries: inquiryRouter,
  employees: employeeManagementRouter,
  crmContacts: crmContactRouter,
  crmDeals: crmDealRouter,
  crmActivities: crmActivityRouter,
  crmReminders: crmReminderRouter,
});

export type AppRouter = typeof appRouter;
