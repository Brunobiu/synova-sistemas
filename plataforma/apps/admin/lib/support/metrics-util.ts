import type { Priority } from "@synova/shared";

// Cálculo puro das métricas (R21), testável sem DB. Recebe linhas já escopadas
// (o escopo/isolamento é aplicado na consulta, via RLS de admin).

export interface MetricsInput {
  tickets: Array<{ priority: Priority; status: string; systemId: string; chatId: string | null }>;
  chats: Array<{ id: string; status: string }>;
  systemNames: Record<string, string>;
}

const RESOLVED = new Set(["resolved", "closed"]);

export interface Metrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  criticalOpen: number;
  ticketsByPriority: Record<Priority, number>;
  ticketsBySystem: Array<{ systemName: string; count: number }>;
  totalChats: number;
  escalatedChats: number;
  /** % de conversas que geraram ticket/escalonamento. */
  escalationRate: number;
  /** % de conversas resolvidas sem escalonamento (proxy de resolução automática). */
  autoResolutionRate: number;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function computeMetrics(input: MetricsInput): Metrics {
  const byPriority: Record<Priority, number> = { baixa: 0, media: 0, alta: 0, critica: 0 };
  const bySystem = new Map<string, number>();
  let open = 0;
  let resolved = 0;
  let criticalOpen = 0;

  for (const t of input.tickets) {
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    bySystem.set(t.systemId, (bySystem.get(t.systemId) ?? 0) + 1);
    const isResolved = RESOLVED.has(t.status);
    if (isResolved) resolved += 1;
    else {
      open += 1;
      if (t.priority === "critica") criticalOpen += 1;
    }
  }

  const escalatedChatIds = new Set(
    input.tickets.map((t) => t.chatId).filter((id): id is string => !!id),
  );
  const totalChats = input.chats.length;
  const escalatedChats = input.chats.filter((c) => escalatedChatIds.has(c.id)).length;

  const ticketsBySystem = Array.from(bySystem.entries())
    .map(([systemId, count]) => ({ systemName: input.systemNames[systemId] ?? "—", count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalTickets: input.tickets.length,
    openTickets: open,
    resolvedTickets: resolved,
    criticalOpen,
    ticketsByPriority: byPriority,
    ticketsBySystem,
    totalChats,
    escalatedChats,
    escalationRate: pct(escalatedChats, totalChats),
    autoResolutionRate: pct(totalChats - escalatedChats, totalChats),
  };
}
