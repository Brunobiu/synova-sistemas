import type { KnowledgeMatch, ContextSource } from "./types";

// Interface de recuperação semântica (implementada no app via match_knowledge,
// SEMPRE escopada por system_id/tenant_id). Aqui fica só o contrato + a montagem.
export interface KnowledgeRetriever {
  search(
    query: string,
    scope: { systemId: string; tenantId: string | null; limit?: number },
  ): Promise<KnowledgeMatch[]>;
}

export interface TicketSummary {
  subject: string;
  status: string;
  summary?: string;
}

export interface HistoryItem {
  role: "user" | "assistant" | "admin" | "system";
  content: string;
}

export interface BuildContextParams {
  systemName: string;
  /** Contexto global do sistema (systems.context). Não inclui anotações internas. */
  systemContext?: string;
  userName?: string;
  userProfile?: { role?: string; sector?: string };
  /** Trechos recuperados (misturados); são separados por escopo aqui. */
  matches?: KnowledgeMatch[];
  recentHistory?: HistoryItem[];
  previousTickets?: TicketSummary[];
  /** Estado atual do sistema (ex.: incidentes conhecidos). */
  systemState?: string;
}

export interface BuiltContext {
  text: string;
  sources: ContextSource[];
}

const ROLE_LABEL: Record<HistoryItem["role"], string> = {
  user: "Usuário",
  assistant: "IA",
  admin: "Atendente",
  system: "Sistema",
};

/**
 * Monta o contexto textual que vai no prompt da IA, aplicando a precedência da
 * base da empresa sobre a base global do sistema (R11.4) e registrando as fontes
 * usadas (R10.4). Função pura: fácil de testar.
 */
export function buildContext(params: BuildContextParams): BuiltContext {
  const sources: ContextSource[] = [];
  const parts: string[] = [];

  parts.push(`# Sistema: ${params.systemName}`);
  parts.push(
    "Regras e informações da EMPRESA têm prioridade sobre as regras gerais do SISTEMA em caso de conflito.",
  );

  if (params.userName) {
    const extra = [params.userProfile?.role, params.userProfile?.sector]
      .filter(Boolean)
      .join(" · ");
    parts.push(`## Usuário\nNome: ${params.userName}${extra ? ` (${extra})` : ""}`);
  } else {
    parts.push("## Usuário\nDesconhecido (não cadastrado) — atender de forma genérica.");
  }

  if (params.systemContext?.trim()) {
    parts.push(`## Contexto do sistema\n${params.systemContext.trim()}`);
    sources.push({ kind: "system_context" });
  }

  const matches = params.matches ?? [];
  const companyMatches = matches.filter((m) => m.tenantId !== null);
  const systemMatches = matches.filter((m) => m.tenantId === null);

  if (companyMatches.length) {
    parts.push(
      "## Base da empresa (PRIORITÁRIA)\n" +
        companyMatches.map((m) => `- ${m.content}`).join("\n"),
    );
    for (const m of companyMatches) sources.push({ kind: "company_base", ref: m.docId });
  }

  if (systemMatches.length) {
    parts.push(
      "## Base geral do sistema\n" + systemMatches.map((m) => `- ${m.content}`).join("\n"),
    );
    for (const m of systemMatches) sources.push({ kind: "system_base", ref: m.docId });
  }

  if (params.recentHistory?.length) {
    parts.push(
      "## Histórico recente\n" +
        params.recentHistory.map((h) => `${ROLE_LABEL[h.role]}: ${h.content}`).join("\n"),
    );
    sources.push({ kind: "history" });
  }

  if (params.previousTickets?.length) {
    parts.push(
      "## Tickets anteriores\n" +
        params.previousTickets
          .map((t) => `- [${t.status}] ${t.subject}${t.summary ? ` — ${t.summary}` : ""}`)
          .join("\n"),
    );
    for (const _t of params.previousTickets) sources.push({ kind: "ticket" });
  }

  if (params.systemState?.trim()) {
    parts.push(`## Estado atual do sistema\n${params.systemState.trim()}`);
    sources.push({ kind: "state" });
  }

  return { text: parts.join("\n\n"), sources };
}
