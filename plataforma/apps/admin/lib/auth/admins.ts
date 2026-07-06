import type { ProfileRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Role } from "./roles";

/** Lista os administradores (via sessão do admin; RLS admin_all garante o acesso). */
export async function listAdmins(): Promise<ProfileRow[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProfileRow[];
}

export type CreateAdminOutcome = "created" | "exists";

/** Detecta o erro de "e-mail já registrado" da Admin API do Auth. */
function isAlreadyRegistered(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; message?: string };
  return e.code === "email_exists" || e.status === 422 || /already/i.test(e.message ?? "");
}

/**
 * Cria um administrador (Opção A): cria o usuário no Supabase Auth com e-mail já
 * confirmado (sem depender de SMTP) e marca `role=admin` em `profiles`.
 *
 * EXCEÇÃO CONTROLADA ao uso do service client no painel: criar usuário exige a
 * Admin API do Auth, que só funciona com service role. A ação que chama isto é
 * protegida por requireAdmin(), então só um admin autenticado dispara a criação.
 */
export async function createAdmin(
  email: string,
  password: string,
  role: Role,
): Promise<{ id: string | null; outcome: CreateAdminOutcome }> {
  const svc = getServiceSupabase();

  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    if (isAlreadyRegistered(error)) {
      return { id: null, outcome: "exists" };
    }
    throw error ?? new Error("Auth admin.createUser retornou vazio");
  }

  const userId = data.user.id;
  const { error: profileError } = await svc
    .from("profiles")
    .upsert({ id: userId, email, role });
  if (profileError) throw profileError;

  return { id: userId, outcome: "created" };
}
