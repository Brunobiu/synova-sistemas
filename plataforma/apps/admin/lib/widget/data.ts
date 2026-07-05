import type { Priority } from "@synova/shared";
import type { HistoryItem, TicketSummary } from "@synova/ai";
import { getServiceSupabase } from "@/lib/supabase/service";

// Acesso a dados da borda do widget (service client). O escopo (system/tenant) é
// SEMPRE aplicado explicitamente aqui, já que o widget é anônimo.

type DB = ReturnType<typeof getServiceSupabase>;

export interface SessionRow {
  id: string;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  status: string;
}

export interface ChatRow {
  id: string;
  session_id: string | null;
  system_id: string;
  tenant_id: string;
  user_id: string | null;
  status: string;
  ai_paused: boolean;
}

export interface ResolvedUser {
  userId: string | null;
  userName: string | null;
  unknown: boolean;
}

/** Retorna (ou cria) o tenant primário do sistema. */
export async function getOrCreatePrimaryTenant(systemId: string): Promise<string> {
  const db: DB = getServiceSupabase();
  const { data: existing } = await db
    .from("tenants")
    .select("id")
    .eq("system_id", systemId)
    .eq("is_primary", true)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: sys } = await db.from("systems").select("name").eq("id", systemId).single();
  const name = (sys as { name?: string } | null)?.name ?? "Cliente";
  const { data: created, error } = await db
    .from("tenants")
    .insert({ system_id: systemId, name, is_primary: true })
    .select("id")
    .single();
  if (error) throw error;
  return (created as { id: string }).id;
}

export interface SystemMeta {
  name: string;
  context: string | null;
}

export interface UserProfile {
  name: string | null;
  role: string | null;
  sector: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db: DB = getServiceSupabase();
  const { data } = await db.from("users").select("name, role, sector").eq("id", userId).maybeSingle();
  return (data as UserProfile) ?? null;
}

export async function getSystemMeta(systemId: string): Promise<SystemMeta> {
  const db: DB = getServiceSupabase();
  const { data } = await db.from("systems").select("name, context").eq("id", systemId).single();
  const row = (data as { name?: string; context?: string | null } | null) ?? {};
  return { name: row.name ?? "Sistema", context: row.context ?? null };
}

/**
 * Resolve o usuário pelo identificador externo (ex.: "9"→Matheus). Se não existir
 * e vier nome/identificador, cria (auto-captura). Sem identificador → anônimo.
 */
export async function resolveOrCreateUser(
  systemId: string,
  tenantId: string,
  input: { externalRef?: string; name?: string; email?: string },
): Promise<ResolvedUser> {
  const externalRef = input.externalRef?.trim();
  if (!externalRef) {
    return { userId: null, userName: input.name?.trim() || null, unknown: true };
  }
  const db: DB = getServiceSupabase();
  const { data: found } = await db
    .from("users")
    .select("id, name")
    .eq("system_id", systemId)
    .eq("external_ref", externalRef)
    .maybeSingle();
  if (found) {
    const f = found as { id: string; name: string | null };
    return { userId: f.id, userName: input.name?.trim() || f.name, unknown: false };
  }

  const { data: created, error } = await db
    .from("users")
    .insert({
      system_id: systemId,
      tenant_id: tenantId,
      external_ref: externalRef,
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id, name")
    .single();
  if (error) {
    // corrida na constraint unique(system_id, external_ref): tenta reler
    const { data: retry } = await db
      .from("users")
      .select("id, name")
      .eq("system_id", systemId)
      .eq("external_ref", externalRef)
      .maybeSingle();
    if (retry) {
      const r = retry as { id: string; name: string | null };
      return { userId: r.id, userName: input.name?.trim() || r.name, unknown: false };
    }
    throw error;
  }
  const c = created as { id: string; name: string | null };
  return { userId: c.id, userName: c.name, unknown: false };
}

export async function getSessionScoped(
  sessionId: string,
  systemId: string,
): Promise<SessionRow | null> {
  const db: DB = getServiceSupabase();
  const { data } = await db
    .from("support_sessions")
    .select("id, system_id, tenant_id, user_id, status")
    .eq("id", sessionId)
    .eq("system_id", systemId)
    .maybeSingle();
  return (data as SessionRow) ?? null;
}

export async function createSession(params: {
  systemId: string;
  tenantId: string;
  userId: string | null;
}): Promise<SessionRow> {
  const db: DB = getServiceSupabase();
  const { data, error } = await db
    .from("support_sessions")
    .insert({ system_id: params.systemId, tenant_id: params.tenantId, user_id: params.userId })
    .select("id, system_id, tenant_id, user_id, status")
    .single();
  if (error) throw error;
  return data as SessionRow;
}

export async function getChatBySession(sessionId: string): Promise<ChatRow | null> {
  const db: DB = getServiceSupabase();
  const { data } = await db
    .from("chats")
    .select("id, session_id, system_id, tenant_id, user_id, status, ai_paused")
    .eq("session_id", sessionId)
    .maybeSingle();
  return (data as ChatRow) ?? null;
}

export async function createChat(params: {
  sessionId: string;
  systemId: string;
  tenantId: string;
  userId: string | null;
}): Promise<ChatRow> {
  const db: DB = getServiceSupabase();
  const { data, error } = await db
    .from("chats")
    .insert({
      session_id: params.sessionId,
      system_id: params.systemId,
      tenant_id: params.tenantId,
      user_id: params.userId,
      status: "ai_active",
    })
    .select("id, session_id, system_id, tenant_id, user_id, status, ai_paused")
    .single();
  if (error) throw error;
  return data as ChatRow;
}

export interface StoredMessage {
  id: string;
  senderType: "user" | "ai" | "admin" | "system";
  content: string;
  createdAt: string;
}

export async function insertMessage(params: {
  chatId: string;
  systemId: string;
  tenantId: string;
  senderType: "user" | "ai" | "admin" | "system";
  senderId?: string | null;
  content: string;
  aiMeta?: unknown;
}): Promise<StoredMessage> {
  const db: DB = getServiceSupabase();
  const { data, error } = await db
    .from("messages")
    .insert({
      chat_id: params.chatId,
      system_id: params.systemId,
      tenant_id: params.tenantId,
      sender_type: params.senderType,
      sender_id: params.senderId ?? null,
      content: params.content,
      ai_meta: params.aiMeta ?? null,
    })
    .select("id, sender_type, content, created_at")
    .single();
  if (error) throw error;
  const r = data as { id: string; sender_type: StoredMessage["senderType"]; content: string; created_at: string };
  return { id: r.id, senderType: r.sender_type, content: r.content, createdAt: r.created_at };
}

export async function listMessages(chatId: string, limit: number): Promise<StoredMessage[]> {
  const db: DB = getServiceSupabase();
  const { data } = await db
    .from("messages")
    .select("id, sender_type, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Array<{ id: string; sender_type: StoredMessage["senderType"]; content: string; created_at: string }>).map(
    (r) => ({ id: r.id, senderType: r.sender_type, content: r.content, createdAt: r.created_at }),
  );
}

const SENDER_TO_ROLE: Record<string, HistoryItem["role"]> = {
  user: "user",
  ai: "assistant",
  admin: "admin",
  system: "system",
};

export async function listRecentHistory(chatId: string, limit: number): Promise<HistoryItem[]> {
  const db: DB = getServiceSupabase();
  const { data } = await db
    .from("messages")
    .select("sender_type, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = ((data ?? []) as Array<{ sender_type: string; content: string }>).reverse();
  return rows.map((r) => ({ role: SENDER_TO_ROLE[r.sender_type] ?? "user", content: r.content }));
}

export async function listPreviousTickets(
  systemId: string,
  tenantId: string,
  userId: string | null,
): Promise<TicketSummary[]> {
  const db: DB = getServiceSupabase();
  let q = db
    .from("tickets")
    .select("subject, status")
    .eq("system_id", systemId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return ((data ?? []) as Array<{ subject: string; status: string }>).map((t) => ({
    subject: t.subject,
    status: t.status,
  }));
}

export async function insertAiContext(params: {
  messageId: string;
  systemId: string;
  tenantId: string;
  sources: unknown;
  confidence: number;
  provider: string;
}): Promise<void> {
  const db: DB = getServiceSupabase();
  await db.from("ai_context").insert({
    message_id: params.messageId,
    system_id: params.systemId,
    tenant_id: params.tenantId,
    sources: params.sources,
    confidence: params.confidence,
    provider: params.provider,
  });
}

export async function createTicket(params: {
  chatId: string | null;
  systemId: string;
  tenantId: string;
  userId: string | null;
  category: string;
  subject: string;
  description: string;
  priority: Priority;
  status: string;
  escalationReason?: string;
}): Promise<string> {
  const db: DB = getServiceSupabase();
  const { data, error } = await db
    .from("tickets")
    .insert({
      chat_id: params.chatId,
      system_id: params.systemId,
      tenant_id: params.tenantId,
      user_id: params.userId,
      category: params.category,
      subject: params.subject,
      description: params.description,
      priority: params.priority,
      status: params.status,
      escalation_reason: params.escalationReason ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function insertTicketEvent(params: {
  ticketId: string;
  systemId: string;
  tenantId: string;
  actorType: "user" | "ai" | "admin" | "system";
  actorId?: string | null;
  toStatus: string;
  note?: string;
}): Promise<void> {
  const db: DB = getServiceSupabase();
  await db.from("ticket_events").insert({
    ticket_id: params.ticketId,
    system_id: params.systemId,
    tenant_id: params.tenantId,
    actor_type: params.actorType,
    actor_id: params.actorId ?? null,
    to_status: params.toStatus,
    note: params.note ?? null,
  });
}

export async function setChatStatus(chatId: string, status: string): Promise<void> {
  const db: DB = getServiceSupabase();
  await db.from("chats").update({ status }).eq("id", chatId);
}

export async function createNotification(params: {
  systemId: string;
  tenantId: string | null;
  type: string;
  priority: Priority;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const db: DB = getServiceSupabase();
  await db.from("notifications").insert({
    system_id: params.systemId,
    tenant_id: params.tenantId,
    type: params.type,
    priority: params.priority,
    title: params.title,
    body: params.body ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });
}

export async function insertAudit(params: {
  systemId: string;
  tenantId: string | null;
  actorType: "user" | "ai" | "admin" | "system" | "anonymous";
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db: DB = getServiceSupabase();
  await db.from("audit_logs").insert({
    system_id: params.systemId,
    tenant_id: params.tenantId,
    actor_type: params.actorType,
    actor_id: params.actorId ?? null,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    ip: params.ip ?? null,
    metadata: params.metadata ?? {},
  });
}
