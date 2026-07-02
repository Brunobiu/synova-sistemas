import type { AIProviderName, Priority } from "@synova/shared";

export type { AIProviderName };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatInput {
  messages: ChatMessage[];
  /** Contexto montado pelo motor de RAG (base do sistema/empresa, histórico etc.). */
  context?: string;
}

/** Saída estruturada da IA (base para resposta, classificação e escalonamento). */
export interface ChatResult {
  answer: string;
  intent: string;
  urgency: Priority;
  confidence: number; // 0..1
  shouldEscalate: boolean;
  escalationReason?: string;
  suggestedPriority: Priority;
}

export interface AIProvider {
  readonly name: AIProviderName;
  chat(input: ChatInput): Promise<ChatResult>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  chatModel?: string;
  embeddingsModel?: string;
}

/**
 * Fábrica de provedores de IA. Abstrai OpenAI/Anthropic/Google atrás de uma
 * interface única (R5). Implementações reais entram no Bloco 8.
 */
export function createAIProvider(_config: AIProviderConfig): AIProvider {
  throw new Error("createAIProvider: implementação pendente (Bloco 8)");
}
