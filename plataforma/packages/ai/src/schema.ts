import { z } from "zod";
import { PRIORITIES } from "@synova/shared";
import type { ChatResult } from "./types";

// Contrato da saída estruturada que os provedores devem devolver (JSON).
export const chatResultSchema = z.object({
  answer: z.string(),
  intent: z.string().default("desconhecido"),
  urgency: z.enum(PRIORITIES).default("media"),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
  shouldEscalate: z.coerce.boolean().default(false),
  escalationReason: z.string().optional(),
  suggestedPriority: z.enum(PRIORITIES).default("media"),
});

/**
 * Extrai o primeiro objeto JSON de um texto (modelos às vezes cercam com
 * ```json ... ``` ou texto solto). Retorna null se não achar.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // procura o primeiro { ... } balanceado
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Faz o parse+validação da saída do modelo. Se não vier JSON válido, degrada
 * para uma resposta que sinaliza baixa confiança e sugere escalonamento — nunca
 * lança, para não derrubar o atendimento.
 */
export function parseChatResult(raw: string): ChatResult {
  const json = extractJson(raw);
  if (json && typeof json === "object") {
    const parsed = chatResultSchema.safeParse(json);
    if (parsed.success) return parsed.data;
  }
  // Fallback: usa o texto bruto como resposta, com baixa confiança.
  const answer = raw.trim() || "Não consegui processar a resposta.";
  return {
    answer,
    intent: "desconhecido",
    urgency: "media",
    confidence: 0.2,
    shouldEscalate: true,
    escalationReason: "Resposta da IA fora do formato esperado.",
    suggestedPriority: "media",
  };
}
