// Divisão de documentos em trechos para indexação semântica (knowledge_chunks).
// A dimensão do vetor é fixa (1536) e casa com a coluna vector(1536) do banco.

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

export interface ChunkOptions {
  /** Tamanho máximo de cada trecho, em caracteres. */
  maxChars?: number;
  /** Sobreposição entre trechos consecutivos, em caracteres. */
  overlap?: number;
}

/**
 * Quebra o texto em trechos respeitando limites de parágrafo quando possível.
 * Mantém uma pequena sobreposição para não perder contexto nas bordas.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1200;
  const overlap = Math.min(opts.overlap ?? 150, Math.floor(maxChars / 2));
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const para of paragraphs) {
    // parágrafo maior que o limite: fatia em pedaços fixos com sobreposição
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if ((current + "\n\n" + para).trim().length > maxChars) {
      flush();
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  flush();
  return chunks.filter(Boolean);
}
