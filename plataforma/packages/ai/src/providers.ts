import type { AIProvider, AIProviderConfig, ChatInput, ChatResult } from "./types";
import { parseChatResult } from "./schema";
import { EMBEDDING_MODEL } from "./chunk";

// Implementações reais dos provedores atrás da interface única AIProvider (R5.4).
// Chamadas via fetch (sem SDK) para manter o pacote leve. A saída de chat é sempre
// pedida em JSON e validada por parseChatResult.

const DEFAULT_TIMEOUT_MS = 20_000;

const INSTRUCTION = [
  "Você é o assistente de suporte de um sistema. Responda SEMPRE em português do Brasil.",
  "Use apenas o contexto fornecido; se não souber, diga que vai encaminhar para um humano.",
  "Se o usuário tiver nome, cumprimente pelo nome. Nunca invente dados de outros clientes.",
  "Responda ESTRITAMENTE com um objeto JSON (sem texto fora do JSON) com as chaves:",
  '{"answer": string, "intent": string, "urgency": "baixa|media|alta|critica",',
  '"confidence": number entre 0 e 1, "shouldEscalate": boolean,',
  '"escalationReason": string opcional, "suggestedPriority": "baixa|media|alta|critica"}',
].join(" ");

/** Monta a instrução de sistema com o contexto de RAG e o nome do usuário. */
export function buildInstruction(input: ChatInput): string {
  const parts = [INSTRUCTION];
  if (input.userName) parts.push(`\nNome do usuário: ${input.userName}.`);
  if (input.context) parts.push(`\n\n=== CONTEXTO ===\n${input.context}`);
  return parts.join("");
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`provider_http_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  constructor(private cfg: AIProviderConfig) {}

  async chat(input: ChatInput): Promise<ChatResult> {
    const messages = [
      { role: "system", content: buildInstruction(input) },
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const data = (await postJson(
      "https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${this.cfg.apiKey}` },
      {
        model: this.cfg.chatModel || "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )) as { choices?: Array<{ message?: { content?: string } }> };
    return parseChatResult(data.choices?.[0]?.message?.content ?? "");
  }

  async embed(texts: string[]): Promise<number[][]> {
    const data = (await postJson(
      "https://api.openai.com/v1/embeddings",
      { Authorization: `Bearer ${this.cfg.apiKey}` },
      { model: this.cfg.embeddingsModel || EMBEDDING_MODEL, input: texts },
      DEFAULT_TIMEOUT_MS,
    )) as { data?: Array<{ embedding: number[] }> };
    return (data.data ?? []).map((d) => d.embedding);
  }
}

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  constructor(private cfg: AIProviderConfig) {}

  async chat(input: ChatInput): Promise<ChatResult> {
    // Anthropic recebe a instrução em "system" (top-level); mensagens só user/assistant.
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const data = (await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": this.cfg.apiKey, "anthropic-version": "2023-06-01" },
      {
        model: this.cfg.chatModel || "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        system: buildInstruction(input),
        messages,
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).find((c) => c.type === "text")?.text ?? "";
    return parseChatResult(text);
  }

  async embed(): Promise<number[][]> {
    // Anthropic não oferece API de embeddings; use OpenAI ou Google para indexação.
    throw new Error("Anthropic não suporta embeddings. Use OpenAI ou Google.");
  }
}

class GoogleProvider implements AIProvider {
  readonly name = "google" as const;
  constructor(private cfg: AIProviderConfig) {}

  async chat(input: ChatInput): Promise<ChatResult> {
    const model = this.cfg.chatModel || "gemini-1.5-flash";
    const contents = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const data = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.cfg.apiKey)}`,
      {},
      {
        systemInstruction: { parts: [{ text: buildInstruction(input) }] },
        contents,
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseChatResult(text);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const model = this.cfg.embeddingsModel || "text-embedding-004";
    const out: number[][] = [];
    for (const text of texts) {
      const data = (await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(this.cfg.apiKey)}`,
        {},
        { content: { parts: [{ text }] } },
        DEFAULT_TIMEOUT_MS,
      )) as { embedding?: { values?: number[] } };
      out.push(data.embedding?.values ?? []);
    }
    return out;
  }
}

/**
 * Fábrica de provedores (R5.4): troca de provedor não afeta o resto do sistema.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "google":
      return new GoogleProvider(config);
    default:
      throw new Error(`Provedor de IA desconhecido: ${config.provider}`);
  }
}
