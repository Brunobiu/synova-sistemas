import type { Priority } from "@synova/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/widget/storage";
import { sortByPriorityThenRecent } from "./sort";

// Leitura do painel de suporte (client de sessão do admin, protegido por RLS).
// Nomes de sistema/empresa/usuário são resolvidos em consultas separadas e unidos
// em JS (evita as pegadinhas de embed do PostgREST).

const OPEN_TICKET_STATUSES = ["open", "in_progress", "escalated", "waiting_customer"];

type DB = Awaited<ReturnType<typeof getServerSupabase>>;

async function nameMaps(db: DB, systemIds: string[], tenantIds: string[], userIds: string[]) {
  const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
  const [sys, ten, usr] = await Promise.all([
    uniq(systemIds).length
      ? db.from("systems").select("id, name").in("id", uniq(systemIds))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    uniq(tenantIds).length
      ? db.from("tenants").select("id, name").in("id", uniq(tenantIds))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    uniq(userIds).length
      ? db.from("users").select("id, name, external_ref").in("id", uniq(userIds))
      : Promise.resolve({ data: [] as { id: string; name: string | null; external_ref: string | null }[] }),
  ]);
  const systems = new Map((sys.data ?? []).map((r) => [r.id, r.name]));
  const tenants = new Map((ten.data ?? []).map((r) => [r.id, r.name]));
  const users = new Map(
    ((usr.data ?? []) as { id: string; name: string | null; external_ref: string | null }[]).map(
      (r) => [r.id, r.name || (r.external_ref ? `Usuário ${r.external_ref}` : "—")],
    ),
  );
  return { systems, tenants, users };
}

export interface InboxFilters {
  systemId?: string;
  status?: string;
  q?: string;
}

export interface TicketRow {
  id: string;
  chatId: string | null;
  subject: string;
  status: string;
  priority: Priority;
  systemName: string;
  tenantName: string;
  userName: string;
  createdAt: string;
}

export async function listTickets(filters: InboxFilters = {}): Promise<TicketRow[]> {
  const db = await getServerSupabase();
  let q = db
    .from("tickets")
    .select("id, chat_id, subject, status, priority, system_id, tenant_id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.systemId) q = q.eq("system_id", filters.systemId);
  if (filters.status) q = q.eq("status", filters.status);
  else q = q.in("status", OPEN_TICKET_STATUSES);
  if (filters.q) q = q.ilike("subject", `%${filters.q}%`);
  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    chat_id: string | null;
    subject: string;
    status: string;
    priority: Priority;
    system_id: string;
    tenant_id: string;
    user_id: string | null;
    created_at: string;
  }>;

  const maps = await nameMaps(
    db,
    rows.map((r) => r.system_id),
    rows.map((r) => r.tenant_id),
    rows.map((r) => r.user_id).filter((x): x is string => !!x),
  );

  return sortByPriorityThenRecent(
    rows.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      systemName: maps.systems.get(r.system_id) ?? "—",
      tenantName: maps.tenants.get(r.tenant_id) ?? "—",
      userName: r.user_id ? maps.users.get(r.user_id) ?? "—" : "—",
      createdAt: r.created_at,
    })),
  );
}

export interface ChatRow {
  id: string;
  status: string;
  aiPaused: boolean;
  systemName: string;
  tenantName: string;
  userName: string;
  updatedAt: string;
}

export async function listActiveChats(filters: InboxFilters = {}): Promise<ChatRow[]> {
  const db = await getServerSupabase();
  let q = db
    .from("chats")
    .select("id, status, ai_paused, system_id, tenant_id, user_id, updated_at")
    .in("status", ["ai_active", "human_active"])
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filters.systemId) q = q.eq("system_id", filters.systemId);
  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    ai_paused: boolean;
    system_id: string;
    tenant_id: string;
    user_id: string | null;
    updated_at: string;
  }>;

  const maps = await nameMaps(
    db,
    rows.map((r) => r.system_id),
    rows.map((r) => r.tenant_id),
    rows.map((r) => r.user_id).filter((x): x is string => !!x),
  );

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    aiPaused: r.ai_paused,
    systemName: maps.systems.get(r.system_id) ?? "—",
    tenantName: maps.tenants.get(r.tenant_id) ?? "—",
    userName: r.user_id ? maps.users.get(r.user_id) ?? "—" : "—",
    updatedAt: r.updated_at,
  }));
}

export async function listSystemsForFilter(): Promise<Array<{ id: string; name: string }>> {
  const db = await getServerSupabase();
  const { data } = await db.from("systems").select("id, name").order("name", { ascending: true });
  return (data ?? []) as Array<{ id: string; name: string }>;
}

export interface ConversationMessage {
  id: string;
  senderType: string;
  senderId: string | null;
  content: string;
  createdAt: string;
  attachments: Array<{ id: string; fileName: string; url: string }>;
}

export interface ConversationTicket {
  id: string;
  subject: string;
  status: string;
  priority: Priority;
  escalationReason: string | null;
}

export interface Conversation {
  chat: {
    id: string;
    status: string;
    aiPaused: boolean;
    systemId: string;
    tenantId: string;
    systemName: string;
    tenantName: string;
    userName: string;
  };
  messages: ConversationMessage[];
  ticket: ConversationTicket | null;
}

export async function getConversation(chatId: string): Promise<Conversation | null> {
  const db = await getServerSupabase();
  const { data: chatData } = await db
    .from("chats")
    .select("id, status, ai_paused, system_id, tenant_id, user_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chatData) return null;
  const chat = chatData as {
    id: string;
    status: string;
    ai_paused: boolean;
    system_id: string;
    tenant_id: string;
    user_id: string | null;
  };

  const maps = await nameMaps(db, [chat.system_id], [chat.tenant_id], chat.user_id ? [chat.user_id] : []);

  const { data: msgData } = await db
    .from("messages")
    .select("id, sender_type, sender_id, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(500);
  const msgs = (msgData ?? []) as Array<{
    id: string;
    sender_type: string;
    sender_id: string | null;
    content: string;
    created_at: string;
  }>;

  // Anexos das mensagens deste chat
  const msgIds = msgs.map((m) => m.id);
  const attByMsg = new Map<string, Array<{ id: string; fileName: string; url: string }>>();
  if (msgIds.length) {
    const { data: attData } = await db
      .from("attachments")
      .select("id, message_id, file_name, storage_path")
      .in("message_id", msgIds);
    for (const a of (attData ?? []) as Array<{
      id: string;
      message_id: string;
      file_name: string;
      storage_path: string;
    }>) {
      let url = "";
      try {
        url = await signedUrl(a.storage_path, 300);
      } catch {
        url = "";
      }
      const list = attByMsg.get(a.message_id) ?? [];
      list.push({ id: a.id, fileName: a.file_name, url });
      attByMsg.set(a.message_id, list);
    }
  }

  const { data: ticketData } = await db
    .from("tickets")
    .select("id, subject, status, priority, escalation_reason")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ticket = ticketData
    ? {
        id: (ticketData as { id: string }).id,
        subject: (ticketData as { subject: string }).subject,
        status: (ticketData as { status: string }).status,
        priority: (ticketData as { priority: Priority }).priority,
        escalationReason: (ticketData as { escalation_reason: string | null }).escalation_reason,
      }
    : null;

  return {
    chat: {
      id: chat.id,
      status: chat.status,
      aiPaused: chat.ai_paused,
      systemId: chat.system_id,
      tenantId: chat.tenant_id,
      systemName: maps.systems.get(chat.system_id) ?? "—",
      tenantName: maps.tenants.get(chat.tenant_id) ?? "—",
      userName: chat.user_id ? maps.users.get(chat.user_id) ?? "—" : "Desconhecido",
    },
    messages: msgs.map((m) => ({
      id: m.id,
      senderType: m.sender_type,
      senderId: m.sender_id,
      content: m.content,
      createdAt: m.created_at,
      attachments: attByMsg.get(m.id) ?? [],
    })),
    ticket,
  };
}
