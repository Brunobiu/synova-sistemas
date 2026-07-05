import { indexDocument, type ChunkRow, type ChunkStore } from "@synova/ai";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getEmbeddingProvider } from "./provider";

function createStore(): ChunkStore {
  const supabase = getServiceSupabase();
  return {
    async deleteByDoc(docId: string) {
      const { error } = await supabase.from("knowledge_chunks").delete().eq("doc_id", docId);
      if (error) throw error;
    },
    async insert(rows: ChunkRow[]) {
      const payload = rows.map((r) => ({
        doc_id: r.docId,
        system_id: r.systemId,
        tenant_id: r.tenantId,
        content: r.content,
        embedding: r.embedding,
      }));
      const { error } = await supabase.from("knowledge_chunks").insert(payload);
      if (error) throw error;
    },
  };
}

export interface ReindexParams {
  docId: string;
  systemId: string;
  tenantId: string | null;
  content: string;
}

/**
 * (Re)indexa um documento. Best-effort: se não houver provedor de embeddings
 * configurado, apenas pula (retorna indexed:false) — o documento continua salvo.
 */
export async function reindexDoc(params: ReindexParams): Promise<{ indexed: boolean; chunks: number }> {
  const embedder = await getEmbeddingProvider();
  if (!embedder) return { indexed: false, chunks: 0 };
  const store = createStore();
  const { chunks } = await indexDocument({
    docId: params.docId,
    systemId: params.systemId,
    tenantId: params.tenantId,
    content: params.content,
    embedder,
    store,
  });
  return { indexed: true, chunks };
}

/** Remove o índice de um documento (usado ao excluir). */
export async function removeDocIndex(docId: string): Promise<void> {
  await createStore().deleteByDoc(docId);
}
