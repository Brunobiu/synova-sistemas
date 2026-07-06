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

/** ID do administrador "root" (o mais antigo): protegido de alteração/exclusão. */
export async function getRootAdminId(): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Altera o papel de uma conta (admin ↔ agent). Via service client. */
export async function updateAdminRole(userId: string, role: Role): Promise<void> {
  const svc = getServiceSupabase();
  const { error } = await svc.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

/**
 * Exclui a conta por completo: desvincula de chats/tickets (a FK para auth.users
 * é RESTRICT e travaria a exclusão) e então remove o usuário do Auth — o perfil
 * some por cascade. O histórico de atendimento é preservado (apenas desatribuído).
 */
export async function deleteAdminAccount(userId: string): Promise<void> {
  const svc = getServiceSupabase();
  await svc.from("chats").update({ assigned_admin_id: null }).eq("assigned_admin_id", userId);
  await svc.from("tickets").update({ assigned_admin_id: null }).eq("assigned_admin_id", userId);
  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) throw error;
}
