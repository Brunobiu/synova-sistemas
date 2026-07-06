"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { adminInviteSchema, type AdminInviteInput } from "@/lib/auth/schema";
import { createAdmin } from "@/lib/auth/admins";
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
