import type { AiProviderConfigRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret, getEncryptionKey } from "./security";
import type { AiProviderInput, AiProviderName } from "./schema";

// Configuração de IA GLOBAL (system_id = null): as chaves valem para toda a plataforma.

export async function listAiProviders(): Promise<AiProviderConfigRow[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("ai_provider_config")
    .select("*")
    .is("system_id", null)
    .order("provider", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AiProviderConfigRow[];
}

async function getRow(provider: AiProviderName): Promise<AiProviderConfigRow | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("ai_provider_config")
    .select("*")
    .eq("provider", provider)
    .is("system_id", null)
    .maybeSingle();
  return (data as unknown as AiProviderConfigRow) ?? null;
}

/**
 * Cria ou atualiza a config de um provedor. Se `apiKey` vier vazio no update,
 * mantém a chave já salva. Retorna erro se for criação sem chave.
 */
export async function upsertAiProvider(input: AiProviderInput): Promise<void> {
  const supabase = await getServerSupabase();
  const existing = await getRow(input.provider);
  const hasNewKey = !!(input.apiKey && input.apiKey.trim());

  if (!existing && !hasNewKey) {
    throw new Error("Chave de API obrigatória na primeira configuração.");
  }

  const patch: Record<string, unknown> = {
    chat_model: input.chatModel || null,
    embeddings_model: input.embeddingsModel || null,
  };
  if (hasNewKey) {
    patch.api_key_encrypted = encryptSecret(input.apiKey!.trim(), getEncryptionKey());
  }

  if (existing) {
    const { error } = await supabase
      .from("ai_provider_config")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ai_provider_config").insert({
      provider: input.provider,
      system_id: null,
      is_active: false,
      ...patch,
    });
    if (error) throw error;
  }
}

/** Marca um provedor como ativo e desativa os demais (um ativo por vez, global). */
export async function setActiveProvider(provider: AiProviderName): Promise<void> {
  const supabase = await getServerSupabase();
  const target = await getRow(provider);
  if (!target) throw new Error("Provedor ainda não configurado.");

  const { error: offErr } = await supabase
    .from("ai_provider_config")
    .update({ is_active: false })
    .is("system_id", null);
  if (offErr) throw offErr;

  const { error } = await supabase
    .from("ai_provider_config")
    .update({ is_active: true })
    .eq("id", target.id);
  if (error) throw error;
}

export async function deleteAiProvider(provider: AiProviderName): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("ai_provider_config")
    .delete()
    .eq("provider", provider)
    .is("system_id", null);
  if (error) throw error;
}

/** Decifra a chave salva de um provedor (server-only, para o teste de conexão). */
export async function getDecryptedKey(provider: AiProviderName): Promise<string | null> {
  const row = await getRow(provider);
  if (!row?.api_key_encrypted) return null;
  try {
    return decryptSecret(row.api_key_encrypted, getEncryptionKey());
  } catch {
    return null;
  }
}
