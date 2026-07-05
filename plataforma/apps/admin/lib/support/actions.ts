"use server";

import { revalidatePath } from "next/cache";
import { PRIORITIES, type Priority } from "@synova/shared";
import { requireAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type Result = { ok: true } | { ok: false; error: string };

type DB = Awaited<ReturnType<typeof getServerSupabase>>;

interface ChatScope {
  id: string;
  system_id: string;
  tenant_id: string;
  status: string;
}

async function getChat(db: DB, chatId: string): Promise<ChatScope | null> {
  const { data } = await db
    .from("chats")
    .select("id, system_id, tenant_id, status")
    .eq("id", chatId)
    .maybeSingle();
  return (data as ChatScope) ?? null;
}

export async function replyAction(chatId: string, content: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!content.trim()) return { ok: false, error: "Mensagem vazia." };
  const db = await getServerSupabase();
  const chat = await getChat(db, chatId);
  if (!chat) return { ok: false, error: "Conversa não encontrada." };

  const { error } = await db.from("messages").insert({
    chat_id: chat.id,
    system_id: chat.system_id,
    tenant_id: chat.tenant_id,
    sender_type: "admin",
    sender_id: admin.id,
    content: content.trim(),
  });
  if (error) return { ok: false, error: "Não foi possível enviar." };

  // Responder manualmente assume a conversa e pausa a IA.
  await db.from("chats").update({ status: "human_active", ai_paused: true }).eq("id", chat.id);
  await logAudit({
    systemId: chat.system_id,
    tenantId: chat.tenant_id,
    actorType: "admin",
    actorId: admin.id,
    action: "support.reply",
    targetType: "chat",
    targetId: chat.id,
  });
  revalidatePath(`/meu-atendimento/chats/${chatId}`);
  return { ok: true };
}

async function setChatMode(
  chatId: string,
  patch: { status: string; ai_paused: boolean },
  action: string,
): Promise<Result> {
  const admin = await requireAdmin();
  const db = await getServerSupabase();
  const chat = await getChat(db, chatId);
  if (!chat) return { ok: false, error: "Conversa não encontrada." };
  const { error } = await db.from("chats").update(patch).eq("id", chatId);
  if (error) return { ok: false, error: "Não foi possível atualizar a conversa." };
  await logAudit({
    systemId: chat.system_id,
    tenantId: chat.tenant_id,
    actorType: "admin",
    actorId: admin.id,
    action,
    targetType: "chat",
    targetId: chatId,
  });
  revalidatePath(`/meu-atendimento/chats/${chatId}`);
  revalidatePath("/meu-atendimento");
  return { ok: true };
}

export async function takeOverAction(chatId: string): Promise<Result> {
  return setChatMode(chatId, { status: "human_active", ai_paused: true }, "support.takeover");
}

export async function releaseToAiAction(chatId: string): Promise<Result> {
  return setChatMode(chatId, { status: "ai_active", ai_paused: false }, "support.release");
}

export async function closeChatAction(chatId: string): Promise<Result> {
  return setChatMode(chatId, { status: "closed", ai_paused: false }, "support.close");
}

/** Arquiva a conversa (retenção: oculta sem apagar — R16). */
export async function archiveChatAction(chatId: string): Promise<Result> {
  return setChatMode(chatId, { status: "archived", ai_paused: false }, "support.archive");
}

interface TicketScope {
  id: string;
  system_id: string;
  tenant_id: string;
  status: string;
  priority: Priority;
  chat_id: string | null;
}

async function getTicket(db: DB, ticketId: string): Promise<TicketScope | null> {
  const { data } = await db
    .from("tickets")
    .select("id, system_id, tenant_id, status, priority, chat_id")
    .eq("id", ticketId)
    .maybeSingle();
  return (data as TicketScope) ?? null;
}

export async function reclassifyTicketAction(ticketId: string, priority: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!PRIORITIES.includes(priority as Priority)) return { ok: false, error: "Prioridade inválida." };
  const db = await getServerSupabase();
  const ticket = await getTicket(db, ticketId);
  if (!ticket) return { ok: false, error: "Ticket não encontrado." };

  const { error } = await db
    .from("tickets")
    .update({ priority: priority as Priority })
    .eq("id", ticketId);
  if (error) return { ok: false, error: "Não foi possível reclassificar." };

  await db.from("ticket_events").insert({
    ticket_id: ticketId,
    system_id: ticket.system_id,
    tenant_id: ticket.tenant_id,
    actor_type: "admin",
    actor_id: admin.id,
    to_status: ticket.status,
    note: `Prioridade: ${ticket.priority} → ${priority}`,
  });
  await logAudit({
    systemId: ticket.system_id,
    tenantId: ticket.tenant_id,
    actorType: "admin",
    actorId: admin.id,
    action: "support.ticket.reclassify",
    targetType: "ticket",
    targetId: ticketId,
    metadata: { from: ticket.priority, to: priority },
  });
  revalidatePath("/meu-atendimento");
  if (ticket.chat_id) revalidatePath(`/meu-atendimento/chats/${ticket.chat_id}`);
  return { ok: true };
}

export async function resolveTicketAction(ticketId: string): Promise<Result> {
  const admin = await requireAdmin();
  const db = await getServerSupabase();
  const ticket = await getTicket(db, ticketId);
  if (!ticket) return { ok: false, error: "Ticket não encontrado." };

  const { error } = await db
    .from("tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) return { ok: false, error: "Não foi possível resolver." };

  await db.from("ticket_events").insert({
    ticket_id: ticketId,
    system_id: ticket.system_id,
    tenant_id: ticket.tenant_id,
    actor_type: "admin",
    actor_id: admin.id,
    from_status: ticket.status,
    to_status: "resolved",
  });
  await logAudit({
    systemId: ticket.system_id,
    tenantId: ticket.tenant_id,
    actorType: "admin",
    actorId: admin.id,
    action: "support.ticket.resolve",
    targetType: "ticket",
    targetId: ticketId,
  });
  revalidatePath("/meu-atendimento");
  if (ticket.chat_id) revalidatePath(`/meu-atendimento/chats/${ticket.chat_id}`);
  return { ok: true };
}
