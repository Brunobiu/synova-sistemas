import type { AIProvider, KnowledgeMatch, KnowledgeRetriever } from "@synova/ai";
import { getServiceSupabase } from "@/lib/supabase/service";

interface MatchRow {
  doc_id: string;
  tenant_id: string | null;
  content: string;
  similarity: number;
}

/**
 * Cria um retriever que gera o embedding da pergunta e chama match_knowledge,
 * SEMPRE escopado por system_id + (tenant específico OU global). A precedência
 * empresa > sistema é aplicada depois, em buildContext.
 */
export function createRetriever(embedder: AIProvider): KnowledgeRetriever {
  return {
    async search(query, scope): Promise<KnowledgeMatch[]> {
      const [embedding] = await embedder.embed([query]);
      if (!embedding) return [];
      const supabase = getServiceSupabase();
      const { data, error } = await supabase.rpc("match_knowledge", {
        p_system_id: scope.systemId,
        p_tenant_id: scope.tenantId,
        p_query_embedding: embedding,
        p_match_count: scope.limit ?? 6,
      });
      if (error) throw error;
      return ((data ?? []) as MatchRow[]).map((r) => ({
        docId: r.doc_id,
        tenantId: r.tenant_id,
        content: r.content,
        similarity: r.similarity,
      }));
    },
  };
}
