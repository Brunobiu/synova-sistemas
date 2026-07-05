"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

async function setStatus(id: string, status: "read" | "resolved"): Promise<Result> {
  await requireAdmin();
  const db = await getServerSupabase();
  const patch: Record<string, unknown> = { status };
  if (status === "read") patch.read_at = new Date().toISOString();
  const { error } = await db.from("notifications").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/suporte/notificacoes");
  return { ok: true };
}

export async function markNotificationRead(id: string): Promise<Result> {
  return setStatus(id, "read");
}

export async function markNotificationResolved(id: string): Promise<Result> {
  return setStatus(id, "resolved");
}

/** Marca todas as não lidas como lidas (opcional na UI). */
export async function markAllRead(): Promise<Result> {
  await requireAdmin();
  const db = await getServerSupabase();
  const { error } = await db
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("status", "unread");
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/suporte/notificacoes");
  return { ok: true };
}
