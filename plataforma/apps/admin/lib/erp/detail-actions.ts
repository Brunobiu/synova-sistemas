"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  clientContactSchema,
  systemContextSchema,
  userFormSchema,
  type ClientContactInput,
  type SystemContextInput,
  type UserFormInput,
} from "@/lib/erp/schema";
import { updateClientContact } from "@/lib/erp/tenants";
import { updateSystemContext } from "@/lib/erp/systems";
import { createUser, deleteUser } from "@/lib/erp/users";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveClientContactAction(
  systemId: string,
  tenantId: string,
  input: ClientContactInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = clientContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await updateClientContact(tenantId, parsed.data);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar o contato." };
  }
}

export async function saveSystemContextAction(
  systemId: string,
  input: SystemContextInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = systemContextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await updateSystemContext(systemId, parsed.data);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar o contexto." };
  }
}

export async function createUserAction(
  systemId: string,
  tenantId: string,
  input: UserFormInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = userFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await createUser(systemId, tenantId, parsed.data);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha ao adicionar (identificador ou e-mail já usado?)." };
  }
}

export async function deleteUserAction(
  systemId: string,
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteUser(userId);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover (usuário com atendimentos?)." };
  }
}
