import type { UserRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import type { UserFormInput } from "./schema";

export async function listUsers(systemId: string): Promise<UserRow[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("system_id", systemId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as UserRow[];
}

function toRow(input: UserFormInput) {
  return {
    external_ref: input.externalRef || null,
    name: input.name,
    email: input.email || null,
    role: input.role || null,
    sector: input.sector || null,
  };
}

export async function createUser(
  systemId: string,
  tenantId: string,
  input: UserFormInput,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("users")
    .insert({ system_id: systemId, tenant_id: tenantId, ...toRow(input) });
  if (error) throw error;
}

export async function updateUser(id: string, input: UserFormInput): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("users").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteUser(id: string): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}
