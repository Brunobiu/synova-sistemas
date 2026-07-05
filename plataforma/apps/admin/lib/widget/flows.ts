import { buildContext, answerMessage } from "@synova/ai";
import type { WidgetScope } from "@synova/shared";
import type { SystemAuth } from "./systems";
import { mintWidgetToken } from "./http";
import { getActiveProvider, getEmbeddingProvider } from "@/lib/ai/provider";
import { createRetriever } from "@/lib/ai/retriever";
import {
  shouldAIRespond,
  notificationTypeForEscalation,
  deriveSubject,
  historyToMessages,
} from "./flow-helpers";
import * as data from "./data";

export { shouldAIRespond, notificationTypeForEscalation, deriveSubject, historyToMessages };

// --- Fluxos (orquestração com DB + IA) ---

export interface InitSessionInput {
  externalRef?: string;
  name?: string;
  email?: string;
  sessionId?: string;
}

export async function initSession(input: InitSessionInput, systemAuth: SystemAuth) {
  const systemId = systemAuth.systemId;
  const tenantId = await data.getOrCreatePrimaryTenant(systemId);
  const resolved = await data.resolveOrCreateUser(systemId, tenantId, {
    externalRef: input.externalRef,
    name: input.name,
    email: input.email,
  });

  let session: data.SessionRow | null = null;
  let chat: data.ChatRow | null = null;

  if (input.sessionId) {
    session = await data.getSessionScoped(input.sessionId, systemId);
    if (session && session.status === "active") {
      chat = (await data.getChatBySession(session.id)) ?? null;
    } else {
      session = null;
    }
  }

  if (!session) {
    session = await data.createSession({ systemId, tenantId, userId: resolved.userId });
    chat = await data.createChat({
      sessionId: session.id,
      systemId,
      tenantId,
      userId: resolved.userId,
    });
    await data.createNotification({
      systemId,
      tenantId,
      type: "new_chat",
      priority: "baixa",
      title: "Novo atendimento iniciado",
      entityType: "session",
      entityId: session.id,
    });
    await data.insertAudit({
      systemId,
      tenantId,
      actorType: resolved.userId ? "user" : "anonymous",
      actorId: resolved.userId ?? input.externalRef,
      action: "widget.session.start",
      targetType: "session",
      targetId: session.id,
    });
  }
  if (!chat) {
    chat = await data.createChat({ sessionId: session.id, systemId, tenantId, userId: resolved.userId });
  }

  const scope: WidgetScope = {
    systemId,
    tenantId,
    userId: resolved.userId ?? undefined,
    externalRef: input.externalRef,
  };
  const token = mintWidgetToken(scope, systemAuth.secret);
  const history = await data.listMessages(chat.id, 50);

  return {
    token,
    sessionId: session.id,
    chatId: chat.id,
    user: { name: resolved.userName, unknown: resolved.unknown },
    history,
  };
}

export interface HandleMessageInput {
  sessionId?: string;
  content: string;
}

export async function handleMessage(
  scope: WidgetScope,
  input: HandleMessageInput,
  ip: string,
): Promise<
  | { ok: false; error: string }
  | { ok: true; messageId: string; reply?: string; escalated: boolean; ticketId?: string }
> {
  if (!input.sessionId) return { ok: false, error: "sessionId obrigatório." };
  const session = await data.getSessionScoped(input.sessionId, scope.systemId);
  if (!session || session.tenant_id !== scope.tenantId) {
    return { ok: false, error: "Sessão inválida." };
  }
  let chat = await data.getChatBySession(session.id);
  if (!chat) {
    chat = await data.createChat({
      sessionId: session.id,
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      userId: session.user_id,
    });
  }

  const senderId = scope.externalRef ?? scope.userId ?? null;
  const userMsg = await data.insertMessage({
    chatId: chat.id,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    senderType: "user",
    senderId,
    content: input.content,
  });

  // Humano no comando (ou IA pausada): registra a mensagem e não responde por IA.
  if (!shouldAIRespond(chat)) {
    return { ok: true, messageId: userMsg.id, escalated: false };
  }

  const provider = await getActiveProvider();

  // Nome do usuário e perfil (para cumprimentar e contextualizar).
  let userName: string | undefined;
  let userProfile: { role?: string; sector?: string } | undefined;
  if (scope.userId) {
    const profile = await data.getUserProfile(scope.userId);
    if (profile) {
      userName = profile.name ?? undefined;
      userProfile = { role: profile.role ?? undefined, sector: profile.sector ?? undefined };
    }
  }

  // Recuperação semântica (se houver provedor de embeddings).
  let matches: Awaited<ReturnType<ReturnType<typeof createRetriever>["search"]>> = [];
  const embedder = await getEmbeddingProvider();
  if (embedder) {
    try {
      matches = await createRetriever(embedder).search(input.content, {
        systemId: scope.systemId,
        tenantId: scope.tenantId,
        limit: 6,
      });
    } catch {
      matches = [];
    }
  }

  const systemMeta = await data.getSystemMeta(scope.systemId);
  const recentHistory = await data.listRecentHistory(chat.id, 10);
  const previousTickets = await data.listPreviousTickets(
    scope.systemId,
    scope.tenantId,
    scope.userId ?? null,
  );

  const context = buildContext({
    systemName: systemMeta.name,
    systemContext: systemMeta.context ?? undefined,
    userName,
    userProfile,
    matches,
    recentHistory,
    previousTickets,
  });

  const outcome = await answerMessage({
    provider,
    messages: historyToMessages(recentHistory),
    context: context.text,
    userName,
    userMessage: input.content,
  });

  const aiMsg = await data.insertMessage({
    chatId: chat.id,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    senderType: "ai",
    content: outcome.answer,
    aiMeta: {
      intent: outcome.result.intent,
      urgency: outcome.result.urgency,
      confidence: outcome.result.confidence,
      escalate: outcome.escalation.escalate,
      aiAvailable: outcome.aiAvailable,
    },
  });

  await data.insertAiContext({
    messageId: aiMsg.id,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    sources: context.sources,
    confidence: outcome.result.confidence,
    provider: provider?.name ?? "none",
  });

  let ticketId: string | undefined;
  if (outcome.escalation.escalate) {
    ticketId = await data.createTicket({
      chatId: chat.id,
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      userId: session.user_id,
      category: outcome.result.intent || "suporte",
      subject: deriveSubject(input.content),
      description: input.content,
      priority: outcome.escalation.priority,
      status: "escalated",
      escalationReason: outcome.escalation.reason,
    });
    await data.setChatStatus(chat.id, "human_active");
    await data.insertTicketEvent({
      ticketId,
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      actorType: "ai",
      toStatus: "escalated",
      note: outcome.escalation.reason,
    });
    await data.createNotification({
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      type: notificationTypeForEscalation(outcome.escalation.immediate),
      priority: outcome.escalation.priority,
      title: outcome.escalation.immediate ? "Ticket CRÍTICO" : "Atendimento escalado para humano",
      body: outcome.escalation.reason,
      entityType: "ticket",
      entityId: ticketId,
    });
    await data.insertAudit({
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      actorType: "ai",
      action: "widget.escalation",
      targetType: "ticket",
      targetId: ticketId,
      ip,
      metadata: { reason: outcome.escalation.reason, priority: outcome.escalation.priority },
    });
  }

  return {
    ok: true,
    messageId: userMsg.id,
    reply: outcome.answer,
    escalated: outcome.escalation.escalate,
    ticketId,
  };
}

export interface OpenTicketInput {
  sessionId?: string;
  category: string;
  subject: string;
  description: string;
  priority?: "baixa" | "media" | "alta" | "critica";
}

export async function openTicket(scope: WidgetScope, input: OpenTicketInput, ip: string) {
  let chatId: string | null = null;
  if (input.sessionId) {
    const session = await data.getSessionScoped(input.sessionId, scope.systemId);
    if (session && session.tenant_id === scope.tenantId) {
      const chat = await data.getChatBySession(session.id);
      chatId = chat?.id ?? null;
    }
  }
  const priority = input.priority ?? "media";
  const ticketId = await data.createTicket({
    chatId,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    userId: scope.userId ?? null,
    category: input.category,
    subject: input.subject,
    description: input.description,
    priority,
    status: "open",
  });
  await data.insertTicketEvent({
    ticketId,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    actorType: "user",
    actorId: scope.externalRef ?? scope.userId,
    toStatus: "open",
  });
  await data.createNotification({
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    type: priority === "critica" ? "critical_ticket" : "new_ticket",
    priority,
    title: "Novo ticket aberto",
    body: input.subject,
    entityType: "ticket",
    entityId: ticketId,
  });
  await data.insertAudit({
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    actorType: scope.userId ? "user" : "anonymous",
    actorId: scope.externalRef ?? scope.userId,
    action: "widget.ticket.open",
    targetType: "ticket",
    targetId: ticketId,
    ip,
  });
  return { ticketId, status: "open", priority };
}

export async function getHistory(scope: WidgetScope, sessionId: string | undefined, limit: number) {
  if (!sessionId) return { ok: false as const, error: "sessionId obrigatório." };
  const session = await data.getSessionScoped(sessionId, scope.systemId);
  if (!session || session.tenant_id !== scope.tenantId) {
    return { ok: false as const, error: "Sessão inválida." };
  }
  const chat = await data.getChatBySession(session.id);
  const history = chat ? await data.listMessages(chat.id, limit) : [];
  return { ok: true as const, sessionId: session.id, chatId: chat?.id ?? null, history };
}
