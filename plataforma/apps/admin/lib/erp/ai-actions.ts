"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { aiProviderSchema, type AiProviderInput, type AiProviderName } from "@/lib/erp/schema";
import {
  upsertAiProvider,
  setActiveProvider,
  deleteAiProvider,
  getDecryptedKey,
} from "@/lib/erp/ai-providers";
import { testAiConnection } from "@/lib/erp/ai-test";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type TestActionResult = { ok: boolean; message: string };

export async function saveAiProviderAction(input: AiProviderInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = aiProviderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await upsertAiProvider(parsed.data);
    revalidatePath("/erp/ia");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível salvar.";
    return { ok: false, error: msg };
  }
}

export async function activateAiProviderAction(provider: AiProviderName): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setActiveProvider(provider);
    revalidatePath("/erp/ia");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível ativar.";
    return { ok: false, error: msg };
  }
}

export async function deleteAiProviderAction(provider: AiProviderName): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteAiProvider(provider);
    revalidatePath("/erp/ia");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a configuração." };
  }
}

/** Testa a conexão usando a chave já salva do provedor. */
export async function testAiProviderAction(
  provider: AiProviderName,
): Promise<TestActionResult> {
  await requireAdmin();
  const key = await getDecryptedKey(provider);
  if (!key) return { ok: false, message: "Salve uma chave antes de testar." };
  return testAiConnection(provider, key);
}
