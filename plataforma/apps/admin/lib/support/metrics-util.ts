import type { Priority } from "@synova/shared";

// Cálculo puro das métricas (R21), testável sem DB. Recebe linhas já escopadas
// (o escopo/isolamento é aplicado na consulta, via RLS de admin).

export interface MetricMessage {
  chatId: string;
  /** user | ai | admin | system */
  senderType: string;
  /** timestamp ISO (created_at). */
  createdAt: string;
}

export interface MetricsInput {
  tickets: Array<{ priority: Priority; status: string; systemId: string; chatId: string | null }>;
  chats: Array<{ id: string; status: string }>;
  systemNames: Record<string, string>;
  /** Mensagens (escopadas) para os tempos de resposta. Opcional. */
  messages?: MetricMessage[];
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
  /** Tempo médio (segundos) da mensagem do cliente até a resposta da IA. null = sem amostras. */
  avgAiResponseSeconds: number | null;
  /** Tempo médio (segundos) da mensagem do cliente até a resposta do atendente (humano). */
  avgHumanResponseSeconds: number | null;
  /** Nº de pares cliente→IA considerados. */
  aiResponseSamples: number;
  /** Nº de pares cliente→atendente considerados. */
  humanResponseSamples: number;
}

export interface ResponseTimes {
  avgAiResponseSeconds: number | null;
  avgHumanResponseSeconds: number | null;
  aiResponseSamples: number;
  humanResponseSamples: number;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Tempo médio de resposta a partir das mensagens (mesma tabela `messages` para chat e thread).
 * Para cada mensagem do cliente (`user`), olha a mensagem imediatamente seguinte no mesmo chat:
 * se for `ai` conta como resposta da IA; se for `admin` conta como resposta humana. Assim mede o
 * tempo desde a última fala do cliente até a resposta. Mensagens fora de ordem/negativas são ignoradas.
 */
export function computeResponseTimes(messages: MetricMessage[]): ResponseTimes {
  const byChat = new Map<string, MetricMessage[]>();
  for (const msg of messages) {
    const arr = byChat.get(msg.chatId);
    if (arr) arr.push(msg);
    else byChat.set(msg.chatId, [msg]);
  }

  const aiDeltas: number[] = [];
  const humanDeltas: number[] = [];

  for (const arr of byChat.values()) {
    arr.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].senderType !== "user") continue;
      const next = arr[i + 1];
      const deltaSec = (Date.parse(next.createdAt) - Date.parse(arr[i].createdAt)) / 1000;
      if (!Number.isFinite(deltaSec) || deltaSec < 0) continue;
      if (next.senderType === "ai") aiDeltas.push(deltaSec);
      else if (next.senderType === "admin") humanDeltas.push(deltaSec);
    }
  }

  return {
    avgAiResponseSeconds: mean(aiDeltas),
    avgHumanResponseSeconds: mean(humanDeltas),
    aiResponseSamples: aiDeltas.length,
    humanResponseSamples: humanDeltas.length,
  };
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

  const responseTimes = computeResponseTimes(input.messages ?? []);

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
    ...responseTimes,
  };
}
