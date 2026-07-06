import { redirect } from "next/navigation";
import type { ProfileRow } from "@synova/database";
import { getServerSupabase } from "./supabase/server";
import { isRole, type Role } from "./auth/roles";

/** Usuário autenticado atual (ou null). */
export async function getSessionUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Papel do usuário na tabela profiles (ou null se não tiver perfil válido). */
export async function getUserRole(userId: string): Promise<Role | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = (data as Pick<ProfileRow, "role"> | null)?.role;
  return isRole(role) ? role : null;
}

/** Verifica no servidor se o usuário é administrador (dono). */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === "admin";
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
export interface SessionProfile {
  user: SessionUser;
  role: Role;
}

/**
 * Guarda base do painel: exige sessão + um papel válido (admin ou agent).
 * Redireciona para /login quando não autenticado ou sem perfil.
 */
export async function requireStaff(): Promise<SessionProfile> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const role = await getUserRole(user.id);
  if (!role) {
    redirect("/login?erro=sem_permissao");
  }
  return { user, role };
}

/**
 * Guarda para áreas exclusivas do dono (ERP, IA, admins, config de sistema).
 * Atendente autenticado é mandado para a área dele (/meu-atendimento).
 */
export async function requireOwner(): Promise<SessionUser> {
  const { user, role } = await requireStaff();
  if (role !== "admin") {
    redirect("/meu-atendimento?erro=sem_permissao");
  }
  return user;
}

/** Alias histórico: as áreas do ERP que já usavam requireAdmin exigem o dono. */
export const requireAdmin = requireOwner;
