import type { AiProviderName } from "./schema";

// Teste de conexão server-only: faz um GET leve no endpoint de "models" de cada
// provedor apenas para validar a chave. Não envia dados do usuário nem gera custo
// de inferência. Nunca retorna a chave em claro nas mensagens.

export interface TestResult {
  ok: boolean;
  message: string;
}

const TIMEOUT_MS = 10_000;

async function pingModels(
  url: string,
  headers: Record<string, string>,
): Promise<TestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.ok) return { ok: true, message: "Conexão OK ✓" };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Chave inválida ou sem permissão." };
    }
    return { ok: false, message: `Falha na conexão (HTTP ${res.status}).` };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      message: aborted ? "Tempo esgotado ao conectar." : "Não foi possível conectar.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function testAiConnection(provider: AiProviderName, apiKey: string): Promise<TestResult> {
  switch (provider) {
    case "openai":
      return pingModels("https://api.openai.com/v1/models", {
        Authorization: `Bearer ${apiKey}`,
      });
    case "anthropic":
      return pingModels("https://api.anthropic.com/v1/models", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      });
    case "google":
      return pingModels(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        {},
      );
    default:
      return Promise.resolve({ ok: false, message: "Provedor desconhecido." });
  }
}
