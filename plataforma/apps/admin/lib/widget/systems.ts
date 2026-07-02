import type { SystemRow } from "@synova/database";
import { getServiceSupabase } from "@/lib/supabase/service";
import { decryptSecret, getEncryptionKey } from "@/lib/erp/security";

/** Material de autenticação de um sistema, resolvido a partir da chave pública. */
export interface SystemAuth {
  systemId: string;
  status: SystemRow["status"];
  allowedOrigins: string[];
  /** Segredo atual, em claro (server-only). */
  secret: string;
  /** Segredo anterior em claro, durante a janela de convivência (ou null). */
  previousSecret: string | null;
  /** Momento da última rotação (epoch em segundos) ou null. */
  secretRotatedAt: number | null;
}

/**
 * Busca o sistema pela chave pública (support_api_key) e devolve o material de
 * autenticação com os segredos já decifrados. Usa o client service-role porque a
 * chamada é anônima (widget); o escopo é forçado depois pelo token assinado.
 * Retorna null se a chave não existir.
 */
export async function getSystemAuthByApiKey(apiKey: string): Promise<SystemAuth | null> {
  if (!apiKey) return null;
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("systems")
    .select(
      "id, status, allowed_origins, key_secret_hash, key_secret_prev_hash, secret_rotated_at",
    )
    .eq("support_api_key", apiKey)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Pick<
    SystemRow,
    | "id"
    | "status"
    | "allowed_origins"
    | "key_secret_hash"
    | "key_secret_prev_hash"
    | "secret_rotated_at"
  >;

  const key = getEncryptionKey();
  let secret: string;
  try {
    secret = decryptSecret(row.key_secret_hash, key);
  } catch {
    return null; // segredo corrompido/ilegível → trata como chave inválida
  }

  let previousSecret: string | null = null;
  if (row.key_secret_prev_hash) {
    try {
      previousSecret = decryptSecret(row.key_secret_prev_hash, key);
    } catch {
      previousSecret = null;
    }
  }

  return {
    systemId: row.id,
    status: row.status,
    allowedOrigins: row.allowed_origins ?? [],
    secret,
    previousSecret,
    secretRotatedAt: row.secret_rotated_at
      ? Math.floor(new Date(row.secret_rotated_at).getTime() / 1000)
      : null,
  };
}
