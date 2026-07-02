// Enums e valores de domínio compartilhados por toda a plataforma.

export const PRIORITIES = ["baixa", "media", "alta", "critica"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "escalated",
  "waiting_customer",
  "resolved",
  "closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CHAT_STATUSES = [
  "ai_active",
  "human_active",
  "closed",
  "archived",
] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

export const SENDER_TYPES = ["user", "ai", "admin", "system"] as const;
export type SenderType = (typeof SENDER_TYPES)[number];

export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;
export type AIProviderName = (typeof AI_PROVIDERS)[number];

export const KNOWLEDGE_KINDS = [
  "technical",
  "operational",
  "commercial",
  "custom",
] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const NOTIFICATION_TYPES = [
  "new_chat",
  "new_ticket",
  "critical_ticket",
  "ai_escalation",
  "file_uploaded",
  "system_error",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["unread", "read", "resolved"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
