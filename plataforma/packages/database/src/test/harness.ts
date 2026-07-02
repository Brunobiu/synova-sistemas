import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "../../../../supabase/migrations");

/**
 * Ajusta o SQL das migrations para rodar no PGlite (Postgres embutido, sem Docker):
 * - remove `create extension pgcrypto` (gen_random_uuid é nativo no PG13+);
 * - remove o índice vetorial hnsw (só afeta performance, não a correção dos testes).
 * As migrations originais permanecem intactas para o Supabase real.
 */
function preprocessForPglite(sql: string): string {
  return sql
    .replace(/create extension[^;]*pgcrypto[^;]*;/gi, "")
    .replace(/create index[^;]*using hnsw[^;]*;/gi, "");
}

/**
 * Sobe um Postgres embutido, aplica um shim mínimo do ambiente Supabase
 * (schema auth, auth.uid(), roles) e roda todas as migrations em ordem.
 */
export async function createTestDb() {
  const db = new PGlite({ extensions: { vector } });

  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end
    $$;
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = preprocessForPglite(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    await db.exec(sql);
  }

  return db;
}
