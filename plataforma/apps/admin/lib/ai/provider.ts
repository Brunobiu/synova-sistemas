import { createAIProvider, type AIProvider, type AIProviderName } from "@synova/ai";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decryptSecret, getEncryptionKey } from "@/lib/erp/security";

// Carrega provedores de IA (config global) e os instancia atrás da interface única.
// Usa o service client para funcionar tanto no painel quanto na borda anônima do
// widget. A chave só é decifrada em memória no servidor, nunca exposta.

interface ConfigRow {
  provider: AIProviderName;
  api_key_encrypted: string | null;
  chat_model: string | null;
  embeddings_model: string | null;
  is_active: boolean;
}

async function loadRows(): Promise<ConfigRow[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("ai_provider_config")
    .select("provider, api_key_encrypted, chat_model, embeddings_model, is_active")
    .is("system_id", null);
  return (data ?? []) as unknown as ConfigRow[];
}

function toProvider(row: ConfigRow): AIProvider | null {
  if (!row.api_key_encrypted) return null;
  let apiKey: string;
  try {
    apiKey = decryptSecret(row.api_key_encrypted, getEncryptionKey());
  } catch {
    return null;
  }
  return createAIProvider({
    provider: row.provider,
    apiKey,
    chatModel: row.chat_model ?? undefined,
    embeddingsModel: row.embeddings_model ?? undefined,
  });
}

/** Provedor ativo para chat, ou null se nenhum estiver configurado/ativo (R5.5). */
export async function getActiveProvider(): Promise<AIProvider | null> {
  const rows = await loadRows();
  const active = rows.find((r) => r.is_active && r.api_key_encrypted);
  return active ? toProvider(active) : null;
}

/**
 * Provedor para gerar embeddings. Anthropic não suporta embeddings, então
 * preferimos o ativo (se for openai/google) e, senão, qualquer openai/google
 * configurado. Retorna null se não houver nenhum.
 */
export async function getEmbeddingProvider(): Promise<AIProvider | null> {
  const rows = await loadRows();
  const canEmbed = (r: ConfigRow) =>
    r.api_key_encrypted && (r.provider === "openai" || r.provider === "google");
  const active = rows.find((r) => r.is_active && canEmbed(r));
  const chosen = active ?? rows.find(canEmbed);
  return chosen ? toProvider(chosen) : null;
}
