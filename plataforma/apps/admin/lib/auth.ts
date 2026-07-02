import { redirect } from "next/navigation";
import type { ProfileRow } from "@synova/database";
import { getServerSupabase } from "./supabase/server";

/** Usuário autenticado atual (ou null). */
export async function getSessionUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Verifica no servidor se o usuário é administrador (tabela profiles). */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data as Pick<ProfileRow, "role"> | null)?.role === "admin";
}

/**
 * Guarda para áreas do painel: exige sessão + papel admin.
 * Redireciona para /login quando não autorizado. Use no topo de layouts/páginas
 * protegidas e em Route Handlers de /api/admin.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    redirect("/login?erro=sem_permissao");
  }
  return user;
}
