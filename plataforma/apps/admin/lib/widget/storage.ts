import { getServiceSupabase } from "@/lib/supabase/service";

// Storage dos anexos: bucket PRIVADO, caminho escopado por system/tenant e acesso
// somente via URL assinada e expirável (R8/R19). Nunca é público.

const BUCKET = "widget-attachments";

/** Caminho isolado por sistema/empresa: <system>/<tenant>/<uuid>-<arquivo>. */
export function buildStoragePath(systemId: string, tenantId: string, safeName: string): string {
  const uuid = globalThis.crypto.randomUUID();
  return `${systemId}/${tenantId}/${uuid}-${safeName}`;
}

let bucketEnsured = false;

/** Garante que o bucket privado exista (idempotente). */
export async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const db = getServiceSupabase();
  const { data } = await db.storage.getBucket(BUCKET);
  if (!data) {
    await db.storage.createBucket(BUCKET, { public: false });
  }
  bucketEnsured = true;
}

export async function uploadAttachment(
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await ensureBucket();
  const db = getServiceSupabase();
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
}

/** URL assinada temporária (padrão: 5 minutos). */
export async function signedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const db = getServiceSupabase();
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Falha ao gerar URL assinada.");
  return data.signedUrl;
}
