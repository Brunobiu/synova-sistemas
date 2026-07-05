import type { Priority } from "@synova/shared";

// Helpers puros da central de notificações (sem dependência de DB), testáveis.

export interface NotificationView {
  id: string;
  systemId: string;
  systemName: string;
  type: string;
  priority: Priority;
  title: string;
  body: string | null;
  status: "unread" | "read" | "resolved";
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export function unreadCount(notes: NotificationView[]): number {
  return notes.filter((n) => n.status === "unread").length;
}

/** Agrupa por sistema, preservando a ordem de chegada dos grupos. */
export function groupBySystem(notes: NotificationView[]): Array<{ systemName: string; items: NotificationView[] }> {
  const order: string[] = [];
  const map = new Map<string, NotificationView[]>();
  for (const n of notes) {
    const key = n.systemName;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(n);
  }
  return order.map((systemName) => ({ systemName, items: map.get(systemName)! }));
}

export const NOTIFICATION_LABEL: Record<string, string> = {
  new_chat: "Novo atendimento",
  new_ticket: "Novo ticket",
  critical_ticket: "Ticket crítico",
  ai_escalation: "Escalonamento da IA",
  file_uploaded: "Arquivo enviado",
  system_error: "Erro do sistema",
};
