"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { adminInviteSchema, type AdminInviteInput } from "@/lib/auth/schema";
import {
  createAdmin,
  deleteAdminAccount,
  getRootAdminId,
  updateAdminRole,
} from "@/lib/auth/admins";
import { isRole } from "@/lib/auth/roles";
import { clientIpFromHeaders, normalizeEmail } from "@/lib/auth/login-guard";

export type InviteAdminResult = { ok: true } | { ok: false; error: string };

/** Cria um novo administrador (Opção A). Só admins autenticados podem chamar. */
export async function inviteAdminAction(
  input: AdminInviteInput,
): Promise<InviteAdminResult> {
  const actor = await requireAdmin();
  const parsed = adminInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }
  const email = normalizeEmail(parsed.data.email);

  try {
    const { id, outcome } = await createAdmin(email, parsed.data.password, parsed.data.role);
    if (outcome === "exists") {
      return { ok: false, error: "Já existe um usuário com esse e-mail." };
    }
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "admin",
      actorId: actor.id,
      action: "admin.invited",
      targetType: "profile",
      targetId: id ?? undefined,
      ip: clientIpFromHeaders(await headers()),
      metadata: { email, role: parsed.data.role },
    });
    revalidatePath("/erp/admins");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível criar a conta." };
  }
}

/** Altera o papel de uma conta (admin ↔ agent). Root e a própria conta são protegidos. */
export async function changeAdminRoleAction(
  userId: string,
  role: string,
): Promise<InviteAdminResult> {
  const actor = await requireAdmin();
  if (!isRole(role)) {
    return { ok: false, error: "Papel inválido." };
  }
  const rootId = await getRootAdminId();
  if (userId === rootId) {
    return { ok: false, error: "O administrador root não pode ser alterado." };
  }
  if (userId === actor.id) {
    return { ok: false, error: "Você não pode mudar o seu próprio papel." };
  }
  try {
    await updateAdminRole(userId, role);
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "admin",
      actorId: actor.id,
      action: "admin.role_changed",
      targetType: "profile",
      targetId: userId,
      ip: clientIpFromHeaders(await headers()),
      metadata: { role },
    });
    revalidatePath("/erp/admins");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível alterar o papel." };
  }
}

/** Exclui uma conta (perde todo o acesso). Root e a própria conta são protegidos. */
export async function deleteAdminAction(userId: string): Promise<InviteAdminResult> {
  const actor = await requireAdmin();
  const rootId = await getRootAdminId();
  if (userId === rootId) {
    return { ok: false, error: "O administrador root não pode ser excluído." };
  }
  if (userId === actor.id) {
    return { ok: false, error: "Você não pode excluir a sua própria conta." };
  }
  try {
    await deleteAdminAccount(userId);
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "admin",
      actorId: actor.id,
      action: "admin.deleted",
      targetType: "profile",
      targetId: userId,
      ip: clientIpFromHeaders(await headers()),
    });
    revalidatePath("/erp/admins");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir a conta." };
  }
}
