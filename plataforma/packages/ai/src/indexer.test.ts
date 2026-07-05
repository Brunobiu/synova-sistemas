import { describe, it, expect } from "vitest";
import { indexDocument, type ChunkRow, type ChunkStore } from "./indexer";

class MemoryStore implements ChunkStore {
  rows: ChunkRow[] = [];
  deleted: string[] = [];
  async deleteByDoc(docId: string) {
    this.deleted.push(docId);
    this.rows = this.rows.filter((r) => r.docId !== docId);
  }
  async insert(rows: ChunkRow[]) {
    this.rows.push(...rows);
  }
}

const fakeEmbedder = {
  // embedding determinístico: tamanho do trecho como único valor
  embed: async (texts: string[]) => texts.map((t) => [t.length]),
};

describe("indexDocument", () => {
  it("indexa, substituindo chunks antigos", async () => {
    const store = new MemoryStore();
    const { chunks } = await indexDocument({
      docId: "d1",
      systemId: "s1",
      tenantId: null,
      content: "conteúdo simples do documento",
      embedder: fakeEmbedder,
      store,
    });
    expect(chunks).toBe(1);
    expect(store.deleted).toContain("d1"); // idempotente
    expect(store.rows[0].embedding).toEqual([store.rows[0].content.length]);
    expect(store.rows[0].tenantId).toBeNull();
  });

  it("documento vazio remove chunks e grava zero", async () => {
    const store = new MemoryStore();
    const { chunks } = await indexDocument({
      docId: "d2",
      systemId: "s1",
      tenantId: "t1",
      content: "   ",
      embedder: fakeEmbedder,
      store,
    });
    expect(chunks).toBe(0);
    expect(store.deleted).toContain("d2");
    expect(store.rows).toHaveLength(0);
  });

  it("falha se embeddings não casam com trechos", async () => {
    const store = new MemoryStore();
    const badEmbedder = { embed: async () => [] };
    await expect(
      indexDocument({
        docId: "d3",
        systemId: "s1",
        tenantId: null,
        content: "algo com conteúdo",
        embedder: badEmbedder,
        store,
      }),
    ).rejects.toThrow();
  });
});
