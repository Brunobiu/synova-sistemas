"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { knowledgeDocSchema, type KnowledgeDocInput } from "@/lib/erp/schema";
import {
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
} from "@/lib/erp/knowledge";

export type ActionResult = { ok: true } | { ok: false; error: string };

function tenantForScope(scope: KnowledgeDocInput["scope"], primaryTenantId: string): string | null {
  return scope === "tenant" ? primaryTenantId : null;
}

export async function createKnowledgeDocAction(
  systemId: string,
  primaryTenantId: string,
  input: KnowledgeDocInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = knowledgeDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await createKnowledgeDoc(
      systemId,
      tenantForScope(parsed.data.scope, primaryTenantId),
      parsed.data,
    );
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar o documento." };
  }
}

export async function updateKnowledgeDocAction(
  systemId: string,
  docId: string,
  primaryTenantId: string,
  input: KnowledgeDocInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = knowledgeDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  try {
    await updateKnowledgeDoc(
      docId,
      tenantForScope(parsed.data.scope, primaryTenantId),
      parsed.data,
    );
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o documento." };
  }
}

export async function deleteKnowledgeDocAction(
  systemId: string,
  docId: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteKnowledgeDoc(docId);
    revalidatePath(`/erp/systems/${systemId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover o documento." };
  }
}
