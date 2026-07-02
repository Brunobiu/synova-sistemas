import type { SystemRow } from "@synova/database";
import { getServerSupabase } from "@/lib/supabase/server";
import type { SystemFormInput } from "./schema";
import {
  generateApiKeyPair,
  encryptSecret,
  getEncryptionKey,
  slugify,
} from "./security";

export type SystemView = "active" | "archived";

/** Lista os sistemas por visão (ativos = não-arquivados; arquivados). RLS garante que só admin vê. */
export async function listSystems(
  search?: string,
  view: SystemView = "active",
): Promise<SystemRow[]> {
  const supabase = await getServerSupabase();
  let query = supabase
    .from("systems")
    .select("*")
    .order("created_at", { ascending: false });
  query =
    view === "archived"
      ? query.eq("status", "archived")
      : query.neq("status", "archived");
  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SystemRow[];
}

export async function getSystem(id: string): Promise<SystemRow | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("systems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SystemRow) ?? null;
}

export interface CreatedSystem {
  id: string;
  apiKey: string;
  /** Segredo em claro — retornado só na criação para exibir uma vez. */
  secret: string;
}

export async function createSystem(input: SystemFormInput): Promise<CreatedSystem> {
  const supabase = await getServerSupabase();
  const { apiKey, secret } = generateApiKeyPair();
  const encryptedSecret = encryptSecret(secret, getEncryptionKey());
  const slug = `${slugify(input.name)}-${apiKey.slice(3, 9)}`;

  const { data, error } = await supabase
    .from("systems")
    .insert({
      name: input.name,
      slug,
      image_url: input.imageUrl || null,
      is_own: input.isOwn,
      status: input.status,
      support_api_key: apiKey,
      // Coluna guarda o segredo CIFRADO (AES-GCM), não um hash.
      key_secret_hash: encryptedSecret,
      allowed_origins: [],
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: (data as { id: string }).id, apiKey, secret };
}

export async function updateSystem(
  id: string,
  input: Partial<SystemFormInput>,
): Promise<void> {
  const supabase = await getServerSupabase();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.isOwn !== undefined) patch.is_own = input.isOwn;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl || null;
  if (input.status !== undefined) patch.status = input.status;
  const { error } = await supabase.from("systems").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archiveSystem(id: string): Promise<void> {
  await updateSystem(id, { status: "archived" });
}
