"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { allowedOriginsSchema } from "@/lib/erp/schema";
import { updateAllowedOrigins, rotateSystemSecret } from "@/lib/erp/systems";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type RotateResult = { ok: true; secret: string } | { ok: false; error: string };

export async function saveAllowedOriginsAction(
  systemId: string,
  origins: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = allowedOriginsSchema.safeParse({ origins });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Domínios inválidos." };
  }
  try {
    await updateAllowedOrigins(systemId, parsed.data.origins);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar os domínios." };
  }
}

export async function rotateSecretAction(systemId: string): Promise<RotateResult> {
  const admin = await requireAdmin();
  try {
    const secret = await rotateSystemSecret(systemId);
    // Ação sensível (chave): registra na auditoria (sem gravar o segredo).
    await logAudit({
      systemId,
      tenantId: null,
      actorType: "admin",
      actorId: admin.id,
      action: "erp.system.rotate_secret",
      targetType: "system",
      targetId: systemId,
    });
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true, secret };
  } catch {
    return { ok: false, error: "Não foi possível rotacionar o segredo." };
  }
}
