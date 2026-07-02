"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { KnowledgeDocRow } from "@synova/database";
import {
  knowledgeDocSchema,
  type KnowledgeDocInput,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_KIND_LABELS,
  KNOWLEDGE_SCOPES,
  KNOWLEDGE_SCOPE_LABELS,
  type KnowledgeScope,
} from "@/lib/erp/schema";
import {
  createKnowledgeDocAction,
  updateKnowledgeDocAction,
  deleteKnowledgeDocAction,
} from "@/lib/erp/knowledge-actions";
import { Button } from "@/components/ui/button";

const EMPTY: KnowledgeDocInput = {
  kind: "technical",
  scope: "system",
  title: "",
  content: "",
};

export function KnowledgeSection({
  systemId,
  primaryTenantId,
  docs,
}: {
  systemId: string;
  primaryTenantId: string;
  docs: KnowledgeDocRow[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KnowledgeDocInput>({
    resolver: zodResolver(knowledgeDocSchema),
    defaultValues: EMPTY,
  });

  function startEdit(doc: KnowledgeDocRow) {
    setEditingId(doc.id);
    setMsg(null);
    reset({
      kind: doc.kind,
      scope: doc.tenant_id ? "tenant" : "system",
      title: doc.title,
      content: doc.content,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    reset(EMPTY);
  }

  async function onSubmit(values: KnowledgeDocInput) {
    setMsg(null);
    const res = editingId
      ? await updateKnowledgeDocAction(systemId, editingId, primaryTenantId, values)
      : await createKnowledgeDocAction(systemId, primaryTenantId, values);
    if (res.ok) {
      reset(EMPTY);
      setEditingId(null);
      router.refresh();
      setMsg("Documento salvo ✓");
    } else {
      setMsg(res.error);
    }
  }

  async function onRemove(id: string) {
    setMsg(null);
    const res = await deleteKnowledgeDocAction(systemId, id);
    if (res.ok) {
      if (editingId === id) cancelEdit();
      router.refresh();
    } else {
      setMsg(res.error);
    }
  }

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum documento na base ainda.</p>
      ) : (
        <div className="divide-y rounded-md border text-sm">
          {docs.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {KNOWLEDGE_KIND_LABELS[d.kind]}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {d.tenant_id ? KNOWLEDGE_SCOPE_LABELS.tenant : KNOWLEDGE_SCOPE_LABELS.system}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-gray-500">{d.content}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(d)}>
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onRemove(d.id)}>
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border p-3">
        <div className="text-sm font-medium">
          {editingId ? "Editar documento" : "Novo documento"}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Tipo</label>
            <select className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("kind")}>
              {KNOWLEDGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KNOWLEDGE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Escopo</label>
            <select className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("scope")}>
              {KNOWLEDGE_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {KNOWLEDGE_SCOPE_LABELS[s as KnowledgeScope]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Título</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("title")} />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Conteúdo (a IA lê isto ao responder)</label>
          <textarea
            rows={6}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Ex.: Passo a passo para emitir uma nota fiscal..."
            {...register("content")}
          />
          {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar documento"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
