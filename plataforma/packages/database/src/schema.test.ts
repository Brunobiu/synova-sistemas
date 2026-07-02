import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./test/harness";

/** Vetor de 1536 dimensões com 1 na posição indicada (one-hot). */
function embedding(hotIndex: number): string {
  const arr = new Array(1536).fill(0);
  arr[hotIndex] = 1;
  return `[${arr.join(",")}]`;
}

let db: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("Bloco 2 — migrations e isolamento (Postgres embutido)", () => {
  it("aplica todas as migrations e cria as tabelas principais", async () => {
    const res = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = res.rows.map((r) => r.table_name);
    for (const t of [
      "systems",
      "tenants",
      "users",
      "knowledge_docs",
      "knowledge_chunks",
      "support_sessions",
      "chats",
      "messages",
      "tickets",
      "ticket_events",
      "attachments",
      "ai_context",
      "notifications",
      "audit_logs",
      "ai_provider_config",
      "profiles",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("match_knowledge isola por system_id (não vaza entre sistemas)", async () => {
    const sysA = randomUUID();
    const sysB = randomUUID();
    await db.query(
      "insert into systems (id,name,slug,support_api_key,key_secret_hash) values ($1,'A','a','pk_a','ha'),($2,'B','b','pk_b','hb')",
      [sysA, sysB],
    );
    const docA = randomUUID();
    const docB = randomUUID();
    await db.query(
      "insert into knowledge_docs (id,system_id,kind,title) values ($1,$2,'technical','DocA'),($3,$4,'technical','DocB')",
      [docA, sysA, docB, sysB],
    );
    await db.query(
      "insert into knowledge_chunks (doc_id,system_id,tenant_id,content,embedding) values ($1,$2,null,'conteudo A',$3::vector)",
      [docA, sysA, embedding(0)],
    );
    await db.query(
      "insert into knowledge_chunks (doc_id,system_id,tenant_id,content,embedding) values ($1,$2,null,'conteudo B',$3::vector)",
      [docB, sysB, embedding(1)],
    );

    const fromA = await db.query<{ content: string }>(
      "select * from match_knowledge($1, null, $2::vector, 10)",
      [sysA, embedding(0)],
    );
    expect(fromA.rows.length).toBe(1);
    expect(fromA.rows[0]?.content).toBe("conteudo A");

    const fromB = await db.query<{ content: string }>(
      "select * from match_knowledge($1, null, $2::vector, 10)",
      [sysB, embedding(0)],
    );
    expect(fromB.rows.length).toBe(1);
    expect(fromB.rows[0]?.content).toBe("conteudo B");
  });

  it("garante integridade referencial (tenant sem sistema válido é rejeitado)", async () => {
    await expect(
      db.query("insert into tenants (system_id, name) values ($1, 'orfao')", [
        randomUUID(),
      ]),
    ).rejects.toBeDefined();
  });
});
