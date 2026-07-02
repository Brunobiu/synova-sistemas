"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientContactSchema, type ClientContactInput } from "@/lib/erp/schema";
import { saveClientContactAction } from "@/lib/erp/detail-actions";
import { Button } from "@/components/ui/button";

export function ClientContactForm({
  systemId,
  tenantId,
  initial,
}: {
  systemId: string;
  tenantId: string;
  initial: { contactName: string; contactPhone: string };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ClientContactInput>({
    resolver: zodResolver(clientContactSchema),
    defaultValues: { contactName: initial.contactName, contactPhone: initial.contactPhone },
  });

  async function onSubmit(values: ClientContactInput) {
    setMsg(null);
    const res = await saveClientContactAction(systemId, tenantId, values);
    setMsg(res.ok ? "Salvo ✓" : res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-3">
      <div className="space-y-1">
        <label className="text-sm">Nome do cliente</label>
        <input className="w-full rounded-md border px-3 py-2 text-sm" {...register("contactName")} />
      </div>
      <div className="space-y-1">
        <label className="text-sm">Telefone</label>
        <input className="w-full rounded-md border px-3 py-2 text-sm" {...register("contactPhone")} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
        {msg && <span className="text-sm text-gray-500">{msg}</span>}
      </div>
    </form>
  );
}
