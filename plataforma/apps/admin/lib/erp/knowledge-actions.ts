"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { knowledgeDocSchema, type KnowledgeDocInput } from "@/lib/erp/schema";
import {
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
} from "@/lib/erp/knowledge";
import { reindexDoc } from "@/lib/ai/indexer";

export type ActionResult = { ok: true } | { ok: false; error: string };

function tenantForScope(scope: KnowledgeDocInput["scope"], primaryTenantId: string): string | null {
  return scope === "tenant" ? primaryTenantId : null;
}

/**
 * Indexação best-effort: nunca derruba o salvamento. Se não houver provedor de
 * embeddings configurado, apenas pula (o documento fica salvo mesmo assim).
 */
async function tryReindex(
  systemId: string,
  docId: string,
  tenantId: string | null,
  content: string,
): Promise<void> {
  try {
    await reindexDoc({ docId, systemId, tenantId, content });
  } catch {
    // indexação é opcional aqui; erros de embedding não invalidam o documento
  }
}

export async function createKnowledgeDocAction(
  systemId: string,
  primaryTenantId: string,
  input: KnowledgeDocInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = knowledgeDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const tenantId = tenantForScope(parsed.data.scope, primaryTenantId);
  try {
    const docId = await createKnowledgeDoc(systemId, tenantId, parsed.data);
    await tryReindex(systemId, docId, tenantId, parsed.data.content);
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
  const tenantId = tenantForScope(parsed.data.scope, primaryTenantId);
  try {
    await updateKnowledgeDoc(docId, tenantId, parsed.data);
    await tryReindex(systemId, docId, tenantId, parsed.data.content);
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
