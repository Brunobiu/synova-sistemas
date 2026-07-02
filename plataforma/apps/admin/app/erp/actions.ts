"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { systemFormSchema, type SystemFormInput } from "@/lib/erp/schema";
import { createSystem, archiveSystem, updateSystem } from "@/lib/erp/systems";

export type CreateSystemResult =
  | { ok: true; id: string; apiKey: string; secret: string }
  | { ok: false; error: string };

export async function createSystemAction(
  input: SystemFormInput,
): Promise<CreateSystemResult> {
  await requireAdmin();
  const parsed = systemFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }
  try {
    const created = await createSystem(parsed.data);
    revalidatePath("/erp");
    return { ok: true, id: created.id, apiKey: created.apiKey, secret: created.secret };
  } catch {
    return { ok: false, error: "Não foi possível criar o sistema." };
  }
}

export async function archiveSystemAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await archiveSystem(id);
    revalidatePath("/erp");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function updateSystemStatusAction(
  id: string,
  status: SystemFormInput["status"],
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await updateSystem(id, { status });
    revalidatePath("/erp");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
