import { z } from "zod";
import { PRIORITIES } from "./enums";

/** Escopo (system/tenant/user) validado. */
export const scopeSchema = z.object({
  systemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  externalRef: z.string().min(1).max(120).optional(),
});
export type Scope = z.infer<typeof scopeSchema>;

/** Corpo para iniciar uma sessão do widget. */
export const widgetSessionInitSchema = z.object({
  token: z.string().min(10),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type WidgetSessionInit = z.infer<typeof widgetSessionInitSchema>;

/** Corpo de uma mensagem enviada pelo widget. */
export const widgetMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
});
export type WidgetMessageInput = z.infer<typeof widgetMessageSchema>;

/** Corpo para abertura manual de ticket pelo widget. */
export const widgetTicketSchema = z.object({
  sessionId: z.string().uuid().optional(),
  category: z.string().min(1).max(100),
  subject: z.string().min(3).max(200),
  description: z.string().min(1).max(8000),
  priority: z.enum(PRIORITIES).optional(),
});
export type WidgetTicketInput = z.infer<typeof widgetTicketSchema>;

/** Query para buscar histórico recente (escopado pelo token). */
export const widgetHistoryQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type WidgetHistoryQuery = z.infer<typeof widgetHistoryQuerySchema>;

// --- Contratos de saída (respostas dos endpoints do widget) ---

export const widgetMessageItemSchema = z.object({
  id: z.string().uuid(),
  senderType: z.enum(["user", "ai", "admin", "system"]),
  content: z.string(),
  createdAt: z.string(),
});
export type WidgetMessageItem = z.infer<typeof widgetMessageItemSchema>;

export const widgetSessionResultSchema = z.object({
  sessionId: z.string().uuid(),
  chatId: z.string().uuid(),
  history: z.array(widgetMessageItemSchema),
});
export type WidgetSessionResult = z.infer<typeof widgetSessionResultSchema>;

export const widgetMessageResultSchema = z.object({
  messageId: z.string().uuid(),
  reply: z.string().optional(),
  escalated: z.boolean(),
  ticketId: z.string().uuid().optional(),
});
export type WidgetMessageResult = z.infer<typeof widgetMessageResultSchema>;

export const widgetTicketResultSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.string(),
  priority: z.enum(PRIORITIES),
});
export type WidgetTicketResult = z.infer<typeof widgetTicketResultSchema>;
