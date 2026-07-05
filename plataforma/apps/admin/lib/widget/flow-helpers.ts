import type { NotificationType } from "@synova/shared";
import type { ChatMessage, HistoryItem } from "@synova/ai";

// Helpers puros dos fluxos do widget (sem dependência de DB/next), fáceis de testar.

export function shouldAIRespond(chat: { status: string; ai_paused: boolean }): boolean {
  return chat.status === "ai_active" && !chat.ai_paused;
}

export function notificationTypeForEscalation(immediate: boolean): NotificationType {
  return immediate ? "critical_ticket" : "ai_escalation";
}

/** Assunto curto para o ticket a partir da mensagem do usuário. */
export function deriveSubject(content: string): string {
  const clean = content.trim().replace(/\s+/g, " ");
  return clean.length <= 80 ? clean : `${clean.slice(0, 77)}...`;
}

const HISTORY_ROLE_TO_CHAT: Record<HistoryItem["role"], ChatMessage["role"] | null> = {
  user: "user",
  assistant: "assistant",
  admin: "assistant",
  system: null, // não reinjeta mensagens de sistema como turnos
};

export function historyToMessages(history: HistoryItem[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const h of history) {
    const role = HISTORY_ROLE_TO_CHAT[h.role];
    if (role) out.push({ role, content: h.content });
  }
  return out;
}
