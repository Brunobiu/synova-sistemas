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
