import type { KnowledgeDocRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import type { KnowledgeDocInput } from "./schema";

/** Lista os documentos da base de conhecimento do sistema (globais + do cliente). */
export async function listKnowledgeDocs(systemId: string): Promise<KnowledgeDocRow[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("knowledge_docs")
    .select("*")
    .eq("system_id", systemId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as KnowledgeDocRow[];
}

/**
 * Cria um documento. `tenantId` = null significa base global do sistema (vale para
 * todos os clientes); preenchido significa base específica do cliente.
 * Retorna o id do documento criado (usado para a indexação semântica).
 */
export async function createKnowledgeDoc(
  systemId: string,
  tenantId: string | null,
  input: KnowledgeDocInput,
): Promise<string> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("knowledge_docs")
    .insert({
      system_id: systemId,
      tenant_id: tenantId,
      kind: input.kind,
      title: input.title,
      content: input.content,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateKnowledgeDoc(
  id: string,
  tenantId: string | null,
  input: KnowledgeDocInput,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("knowledge_docs")
    .update({
      tenant_id: tenantId,
      kind: input.kind,
      title: input.title,
      content: input.content,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  // Os chunks associados caem por cascade (FK on delete cascade).
  const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
  if (error) throw error;
}
