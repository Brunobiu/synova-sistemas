import type { TenantRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ClientContactInput } from "./schema";

/** Retorna o tenant primário do sistema (o "cliente" no caso de 1 cliente por sistema). */
export async function getPrimaryTenant(systemId: string): Promise<TenantRow | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("system_id", systemId)
    .eq("is_primary", true)
    .maybeSingle();
  return (data as unknown as TenantRow) ?? null;
}

/** Garante que exista um tenant primário; cria se não houver. Idempotente. */
export async function ensurePrimaryTenant(
  systemId: string,
  systemName: string,
): Promise<TenantRow> {
  const existing = await getPrimaryTenant(systemId);
  if (existing) return existing;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      system_id: systemId,
      name: systemName,
      is_primary: true,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as TenantRow;
}

export async function updateClientContact(
  tenantId: string,
  input: ClientContactInput,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("tenants")
    .update({
      contact_name: input.contactName || null,
      contact_phone: input.contactPhone || null,
    })
    .eq("id", tenantId);
  if (error) throw error;
}
