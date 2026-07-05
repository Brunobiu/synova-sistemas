import type { AIProvider, ChatMessage, ChatResult } from "./types";
import { decideEscalation, type EscalationDecision } from "./escalation";

export interface AnswerParams {
  /** Provedor ativo, ou null quando nenhuma chave/IA está configurada. */
  provider: AIProvider | null;
  messages: ChatMessage[];
  context?: string;
  userName?: string;
  /** Última mensagem do usuário (para detectar sinais críticos/sensíveis). */
  userMessage?: string;
  timeoutMs?: number;
  confidenceThreshold?: number;
}

export interface AnswerOutcome {
  answer: string;
  result: ChatResult;
  escalation: EscalationDecision;
  /** false quando não havia provedor ativo. */
  aiAvailable: boolean;
  /** true quando o provedor falhou/estourou o tempo. */
  errored: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;

const FALLBACK_MESSAGE =
  "Recebi sua mensagem e vou encaminhar para um atendente humano. Em breve alguém retorna por aqui.";

function degraded(reason: string, aiAvailable: boolean, errored: boolean): AnswerOutcome {
  const result: ChatResult = {
    answer: FALLBACK_MESSAGE,
    intent: "desconhecido",
    urgency: "media",
    confidence: 0,
    shouldEscalate: true,
    escalationReason: reason,
    suggestedPriority: "media",
  };
  return {
    answer: FALLBACK_MESSAGE,
    result,
    escalation: {
      escalate: true,
      reason,
      priority: "media",
      immediate: false,
    },
    aiAvailable,
    errored,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Gera a resposta do atendimento. Nunca lança: se não há IA ativa ou o provedor
 * falha, degrada graciosamente encaminhando para humano (R5.5, R13).
 */
export async function answerMessage(params: AnswerParams): Promise<AnswerOutcome> {
  if (!params.provider) {
    return degraded("IA indisponível (nenhum provedor ativo).", false, false);
  }

  let result: ChatResult;
  try {
    result = await withTimeout(
      params.provider.chat({
        messages: params.messages,
        context: params.context,
        userName: params.userName,
        timeoutMs: params.timeoutMs,
      }),
      params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  } catch {
    return degraded("Falha ao consultar a IA; encaminhado para humano.", true, true);
  }

  const escalation = decideEscalation(result, {
    userMessage: params.userMessage,
    confidenceThreshold: params.confidenceThreshold,
  });

  return { answer: result.answer, result, escalation, aiAvailable: true, errored: false };
}
