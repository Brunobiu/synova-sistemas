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
  attachmentIds?: string[];
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

  // Vincula anexos previamente enviados a esta mensagem (escopado por sistema).
  if (input.attachmentIds?.length) {
    await data.linkAttachments(input.attachmentIds, userMsg.id, scope.systemId);
  }

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

  // Escalonamento agora é uma SUGESTÃO (não cria ticket automático): a IA convida
  // a pessoa a abrir um chamado, e o ticket nasce quando ela envia pelo modal
  // (fluxo openTicket). Aqui só sinalizamos para o widget oferecer o "Abrir chamado".
  return {
    ok: true,
    messageId: userMsg.id,
    reply: outcome.answer,
    escalated: outcome.escalation.escalate,
  };
}

export interface OpenTicketInput {
  sessionId?: string;
  category: string;
  subject: string;
  description: string;
  priority?: "baixa" | "media" | "alta" | "critica";
  attachmentIds?: string[];
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
  // A descrição do cliente vira a 1ª mensagem da thread do ticket (no chat vinculado);
  // daqui em diante a conversa desse ticket é humana.
  if (chatId) {
    const firstMsg = await data.insertMessage({
      chatId,
      systemId: scope.systemId,
      tenantId: scope.tenantId,
      senderType: "user",
      senderId: scope.externalRef ?? scope.userId ?? null,
      content: input.description,
    });
    if (input.attachmentIds?.length) {
      await data.linkAttachments(input.attachmentIds, firstMsg.id, scope.systemId);
    }
    await data.setChatStatus(chatId, "human_active");
  }
  if (input.attachmentIds?.length) {
    await data.linkAttachmentsToTicket(input.attachmentIds, ticketId, scope.systemId);
  }
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
  return { ticketId, status: "open", priority, chatId };
}

/** Thread de um ticket (mensagens do chat vinculado), escopada pelo token. */
export async function getTicketThread(scope: WidgetScope, ticketId: string) {
  const ticket = await data.getTicketScoped(
    ticketId,
    scope.systemId,
    scope.tenantId,
    scope.userId ?? null,
  );
  if (!ticket) return { ok: false as const, error: "Chamado não encontrado." };
  const messages = ticket.chatId ? await data.listMessages(ticket.chatId, 200) : [];
  return {
    ok: true as const,
    ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status, priority: ticket.priority },
    messages,
  };
}

/** Cliente responde na thread de um ticket (não aciona IA; é conversa humana). */
export async function addTicketMessage(
  scope: WidgetScope,
  ticketId: string,
  content: string,
  attachmentIds: string[] | undefined,
) {
  const ticket = await data.getTicketScoped(
    ticketId,
    scope.systemId,
    scope.tenantId,
    scope.userId ?? null,
  );
  if (!ticket || !ticket.chatId) return { ok: false as const, error: "Chamado não encontrado." };
  const msg = await data.insertMessage({
    chatId: ticket.chatId,
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    senderType: "user",
    senderId: scope.externalRef ?? scope.userId ?? null,
    content,
  });
  if (attachmentIds?.length) {
    await data.linkAttachments(attachmentIds, msg.id, scope.systemId);
  }
  await data.createNotification({
    systemId: scope.systemId,
    tenantId: scope.tenantId,
    type: "new_ticket",
    priority: "media",
    title: "Cliente respondeu num chamado",
    body: content.slice(0, 120),
    entityType: "ticket",
    entityId: ticketId,
  });
  return { ok: true as const, message: msg };
}

/** Quantidade de respostas do atendente (admin) desde `since`, para o "sino" do widget. */
export async function getUpdates(scope: WidgetScope, since: string) {
  const chatIds = await data.listTicketChatIds(
    scope.systemId,
    scope.tenantId,
    scope.userId ?? null,
  );
  const newAdminMessages = await data.countAdminMessagesSince(chatIds, since);
  return { newAdminMessages };
}

/** Lista os tickets do cliente (escopado por usuário/tenant do token). */
export async function listUserTickets(scope: WidgetScope) {
  const tickets = await data.listTicketsForScope(
    scope.systemId,
    scope.tenantId,
    scope.userId ?? null,
  );
  return { tickets };
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
