import type { ChatResult, Priority } from "./types";

// Regras de escalonamento (R13) e classificação de prioridade (R14).
// O modelo sugere; aqui aplicamos regras determinísticas por cima, para não
// depender só do julgamento da IA em casos críticos.

const PRIORITY_RANK: Record<Priority, number> = { baixa: 0, media: 1, alta: 2, critica: 3 };

export function maxPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

// Sinais de severidade crítica (R14.2): sistema parado, erro financeiro,
// falha de pagamento, perda de dados, erro crítico de integração.
const CRITICAL_PATTERNS: RegExp[] = [
  /\bfora do ar\b/i,
  /\bca[ií]u\b/i,
  /\bparad[oa]\b/i,
  /\bn[ãa]o (consigo|consegue|d[áa]) (acess|entr|us)/i,
  /\bpagamento\b/i,
  /\bcobran[çc]a\b/i,
  /\bfinanceir/i,
  /\bperd(a|i|eu) .*(dados|informa)/i,
  /\bintegra[çc][ãa]o\b.*(erro|falh|quebr)/i,
];

// Sinais de que precisa de humano mesmo sem urgência crítica.
const SENSITIVE_PATTERNS: RegExp[] = [
  /\breclama[çc]/i,
  /\bcancel/i,
  /\bjur[ií]dic/i,
  /\bprocess(o|ar) /i,
  /\binaceit/i,
  /\babsurd/i,
];

export function detectCritical(text: string | undefined): boolean {
  if (!text) return false;
  return CRITICAL_PATTERNS.some((re) => re.test(text));
}

export function detectSensitive(text: string | undefined): boolean {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

export interface EscalationDecision {
  escalate: boolean;
  reason?: string;
  priority: Priority;
  /** true = atenção imediata (crítico), destaca no painel. */
  immediate: boolean;
}

export interface EscalationOptions {
  /** Mensagem do usuário, para detectar sinais críticos/sensíveis. */
  userMessage?: string;
  /** Abaixo deste valor de confiança, escalona (padrão 0.5). */
  confidenceThreshold?: number;
}

/**
 * Decide se escalona para humano e qual prioridade aplicar, combinando a saída
 * do modelo com regras determinísticas sobre a mensagem do usuário.
 */
export function decideEscalation(
  result: ChatResult,
  opts: EscalationOptions = {},
): EscalationDecision {
  const threshold = opts.confidenceThreshold ?? 0.5;
  const critical = detectCritical(opts.userMessage) || result.urgency === "critica";
  const sensitive = detectSensitive(opts.userMessage);
  const lowConfidence = result.confidence < threshold;

  let priority = result.suggestedPriority;
  if (critical) priority = "critica";
  else if (result.urgency === "alta") priority = maxPriority(priority, "alta");

  const reasons: string[] = [];
  if (critical) reasons.push("assunto crítico");
  if (lowConfidence) reasons.push("baixa confiança da IA");
  if (sensitive) reasons.push("assunto sensível (reclamação/cancelamento/jurídico)");
  if (result.shouldEscalate && result.escalationReason) reasons.push(result.escalationReason);
  else if (result.shouldEscalate) reasons.push("IA sinalizou necessidade de humano");

  const escalate = critical || lowConfidence || sensitive || result.shouldEscalate;

  return {
    escalate,
    reason: escalate ? reasons.join("; ") || "escalonamento sugerido" : undefined,
    priority,
    immediate: critical,
  };
}
