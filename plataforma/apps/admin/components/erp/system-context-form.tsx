"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { systemContextSchema, type SystemContextInput } from "@/lib/erp/schema";
import { saveSystemContextAction } from "@/lib/erp/detail-actions";
import { Button } from "@/components/ui/button";

export function SystemContextForm({
  systemId,
  initial,
}: {
  systemId: string;
  initial: { context: string; notes: string };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SystemContextInput>({
    resolver: zodResolver(systemContextSchema),
    defaultValues: { context: initial.context, notes: initial.notes },
  });

  async function onSubmit(values: SystemContextInput) {
    setMsg(null);
    const res = await saveSystemContextAction(systemId, values);
    setMsg(res.ok ? "Salvo ✓" : res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm">
          Contexto do sistema (tudo que ele oferece, funcionalidades, regras) — a IA lê isto
        </label>
        <textarea
          rows={10}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          placeholder="Ex.: Este sistema permite emitir notas, cadastrar usuários, gerar relatórios..."
          {...register("context")}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm">Anotações (uso interno, não vai pra IA)</label>
        <textarea
          rows={4}
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("notes")}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar contexto"}
        </Button>
        {msg && <span className="text-sm text-gray-500">{msg}</span>}
      </div>
    </form>
  );
}
