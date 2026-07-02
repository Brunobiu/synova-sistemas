// Tipos de linha (Row) das tabelas do banco, refletindo as migrations.
// Quando o Supabase real for conectado, serão complementados por
// `supabase gen types typescript` (tipos gerados a partir do schema vivo).

export type EntityStatus = "active" | "inactive" | "archived";
export type Priority = "baixa" | "media" | "alta" | "critica";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "waiting_customer"
  | "resolved"
  | "closed";
export type ChatStatus = "ai_active" | "human_active" | "closed" | "archived";
export type SenderType = "user" | "ai" | "admin" | "system";
export type ActorType = SenderType | "anonymous";
export type KnowledgeKind = "technical" | "operational" | "commercial" | "custom";
export type NotificationType =
  | "new_chat"
  | "new_ticket"
  | "critical_ticket"
  | "ai_escalation"
  | "file_uploaded"
  | "system_error";
export type NotificationStatus = "unread" | "read" | "resolved";
export type ProviderName = "openai" | "anthropic" | "google";

type Json = Record<string, unknown>;
type Ts = string;

export interface SystemRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_own: boolean;
  status: EntityStatus;
  support_api_key: string;
  key_secret_hash: string;
  key_secret_prev_hash: string | null;
  secret_rotated_at: Ts | null;
  allowed_origins: string[];
  support_config: Json;
  ai_config: Json;
  context: string;
  notes: string;
  created_at: Ts;
  updated_at: Ts;
}

export interface TenantRow {
  id: string;
  system_id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  plan: string | null;
  is_primary: boolean;
  config: Json;
  status: EntityStatus;
  created_at: Ts;
  updated_at: Ts;
}

export interface UserRow {
  id: string;
  tenant_id: string;
  system_id: string;
  external_ref: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  sector: string | null;
  permissions: Json;
  created_at: Ts;
  updated_at: Ts;
}

export interface KnowledgeDocRow {
  id: string;
  system_id: string;
  tenant_id: string | null;
  kind: KnowledgeKind;
  title: string;
  content: string;
  metadata: Json;
  created_at: Ts;
  updated_at: Ts;
}

export interface KnowledgeChunkRow {
  id: string;
  doc_id: string;
  system_id: string;
  tenant_id: string | null;
  content: string;
  embedding: number[] | null;
  created_at: Ts;
}

export interface SupportSessionRow {
  id: string;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  channel: string;
  status: "active" | "closed" | "archived";
  context_snapshot: Json;
  started_at: Ts;
  last_activity_at: Ts;
}

export interface ChatRow {
  id: string;
  session_id: string | null;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  status: ChatStatus;
  assigned_admin_id: string | null;
  ai_paused: boolean;
  created_at: Ts;
  updated_at: Ts;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  system_id: string;
  tenant_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  ai_meta: Json | null;
  created_at: Ts;
}

export interface TicketRow {
  id: string;
  chat_id: string | null;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  category: string;
  subject: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  escalation_reason: string | null;
  assigned_admin_id: string | null;
  created_at: Ts;
  updated_at: Ts;
  resolved_at: Ts | null;
}

export interface TicketEventRow {
  id: string;
  ticket_id: string;
  system_id: string;
  tenant_id: string;
  actor_type: SenderType;
  actor_id: string | null;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: Ts;
}

export interface AttachmentRow {
  id: string;
  message_id: string | null;
  ticket_id: string | null;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: Ts;
}

export interface AiContextRow {
  id: string;
  message_id: string | null;
  system_id: string;
  tenant_id: string;
  sources: unknown[];
  confidence: number | null;
  provider: string | null;
  model: string | null;
  created_at: Ts;
}

export interface NotificationRow {
  id: string;
  system_id: string;
  tenant_id: string | null;
  type: NotificationType;
  priority: Priority;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: NotificationStatus;
  created_at: Ts;
  read_at: Ts | null;
}

export interface AuditLogRow {
  id: string;
  system_id: string | null;
  tenant_id: string | null;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  metadata: Json;
  created_at: Ts;
}

export interface AiProviderConfigRow {
  id: string;
  provider: ProviderName;
  api_key_encrypted: string;
  chat_model: string | null;
  embeddings_model: string | null;
  is_active: boolean;
  system_id: string | null;
  created_at: Ts;
  updated_at: Ts;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  role: "admin";
  created_at: Ts;
}
