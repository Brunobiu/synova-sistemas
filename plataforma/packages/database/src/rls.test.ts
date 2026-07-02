import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./test/harness";

let db: Awaited<ReturnType<typeof createTestDb>>;
const adminId = randomUUID();
const sysA = randomUUID();
const sysB = randomUUID();

async function asRole(role: string, sub = "") {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`,
  );
}
async function asSuperuser() {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
}

beforeAll(async () => {
  db = await createTestDb();
  await db.query("insert into auth.users (id, email) values ($1, 'dono@synova.com')", [
    adminId,
  ]);
  await db.query(
    "insert into profiles (id, email, role) values ($1, 'dono@synova.com', 'admin')",
    [adminId],
  );
  await db.query(
    "insert into systems (id,name,slug,support_api_key,key_secret_hash) values ($1,'A','a','pk_a','ha'),($2,'B','b','pk_b','hb')",
    [sysA, sysB],
  );
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("Bloco 2 — enforcement de RLS", () => {
  it("admin autenticado enxerga os sistemas", async () => {
    await asRole("authenticated", adminId);
    const res = await db.query("select id from systems");
    await asSuperuser();
    expect(res.rows.length).toBeGreaterThanOrEqual(2);
  });

  it("usuário autenticado NÃO-admin não enxerga nada (RLS bloqueia)", async () => {
    await asRole("authenticated", randomUUID());
    const res = await db.query("select id from systems");
    await asSuperuser();
    expect(res.rows.length).toBe(0);
  });

  it("anon não enxerga nada", async () => {
    await asRole("anon");
    const res = await db.query("select id from systems");
    await asSuperuser();
    expect(res.rows.length).toBe(0);
  });

  it("anon não consegue inserir (sem policy/grant de escrita)", async () => {
    await asRole("anon");
    let failed = false;
    try {
      await db.query(
        "insert into systems (name,slug,support_api_key,key_secret_hash) values ('X','x','pk_x','h')",
      );
    } catch {
      failed = true;
    }
    await asSuperuser();
    expect(failed).toBe(true);
  });

  it("audit_logs não pode ser alterado por admin (append-only: sem policy de update)", async () => {
    await db.query(
      "insert into audit_logs (system_id, actor_type, action) values ($1,'system','test')",
      [sysA],
    );
    await asRole("authenticated", adminId);
    const upd = await db.query("update audit_logs set action = 'hacked' returning id");
    await asSuperuser();
    expect(upd.rows.length).toBe(0); // nenhuma linha atualizável via RLS
  });
});
