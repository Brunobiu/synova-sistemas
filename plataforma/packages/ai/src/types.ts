import type { AIProviderName, Priority } from "@synova/shared";

export type { AIProviderName, Priority };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatInput {
  messages: ChatMessage[];
  /** Contexto montado pelo motor de RAG (base do sistema/empresa, histórico etc.). */
  context?: string;
  /** Nome do usuário (quando cadastrado) para a IA cumprimentar pelo nome. */
  userName?: string;
  /** Timeout em ms para a chamada ao provedor. */
  timeoutMs?: number;
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

/** Um trecho de conhecimento recuperado pela busca semântica (match_knowledge). */
export interface KnowledgeMatch {
  docId: string;
  /** null = base global do sistema; preenchido = base específica da empresa (tenant). */
  tenantId: string | null;
  content: string;
  similarity: number;
}

/** Fonte de contexto usada numa resposta (para registrar em ai_context — R10.4). */
export interface ContextSource {
  kind: "system_context" | "company_base" | "system_base" | "history" | "ticket" | "state";
  ref?: string;
}
