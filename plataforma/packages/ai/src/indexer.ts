import { chunkText, type ChunkOptions } from "./chunk";

// Orquestração da indexação de um documento em knowledge_chunks.
// Depende de um Embedder (provedor de IA) e de um ChunkStore (acesso ao banco),
// ambos injetados — a lógica aqui é pura e testável sem rede/DB.

export interface ChunkRow {
  docId: string;
  systemId: string;
  tenantId: string | null;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface ChunkStore {
  /** Remove os chunks antigos do documento (reindexação idempotente). */
  deleteByDoc(docId: string): Promise<void>;
  insert(rows: ChunkRow[]): Promise<void>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export interface IndexDocParams {
  docId: string;
  systemId: string;
  tenantId: string | null;
  content: string;
  embedder: Embedder;
  store: ChunkStore;
  chunkOptions?: ChunkOptions;
}

/**
 * (Re)indexa um documento: divide em trechos, gera embeddings e substitui os
 * chunks antigos. Retorna quantos trechos foram gravados.
 */
export async function indexDocument(params: IndexDocParams): Promise<{ chunks: number }> {
  const chunks = chunkText(params.content, params.chunkOptions);

  if (chunks.length === 0) {
    await params.store.deleteByDoc(params.docId);
    return { chunks: 0 };
  }

  const embeddings = await params.embedder.embed(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error("Número de embeddings não corresponde ao número de trechos.");
  }

  const rows: ChunkRow[] = chunks.map((content, i) => ({
    docId: params.docId,
    systemId: params.systemId,
    tenantId: params.tenantId,
    chunkIndex: i,
    content,
    embedding: embeddings[i],
  }));

  await params.store.deleteByDoc(params.docId);
  await params.store.insert(rows);
  return { chunks: rows.length };
}
