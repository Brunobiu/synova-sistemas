"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserRow } from "@synova/database";
import { userFormSchema, type UserFormInput } from "@/lib/erp/schema";
import { createUserAction, deleteUserAction } from "@/lib/erp/detail-actions";
import { Button } from "@/components/ui/button";

export function UsersSection({
  systemId,
  tenantId,
  users,
}: {
  systemId: string;
  tenantId: string;
  users: UserRow[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormInput>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { externalRef: "", name: "", email: "", role: "", sector: "" },
  });

  async function onAdd(values: UserFormInput) {
    setMsg(null);
    const res = await createUserAction(systemId, tenantId, values);
    if (res.ok) {
      reset();
      router.refresh();
      setMsg("Usuário adicionado ✓");
    } else {
      setMsg(res.error);
    }
  }

  function onRemove(id: string) {
    startTransition(async () => {
      await deleteUserAction(systemId, id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {users.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum usuário cadastrado ainda.</p>
      ) : (
        <div className="divide-y rounded-md border text-sm">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {u.name}
                  {u.external_ref ? ` (#${u.external_ref})` : ""}
                </div>
                <div className="truncate text-gray-500">
                  {[u.email, u.role, u.sector].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => onRemove(u.id)}>
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onAdd)}
        className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Identificador (ex.: 9)</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("externalRef")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Nome</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">E-mail</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Cargo</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("role")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Setor</label>
          <input className="w-full rounded-md border px-2 py-1.5 text-sm" {...register("sector")} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "..." : "Adicionar usuário"}
          </Button>
        </div>
      </form>
      {msg && <span className="text-sm text-gray-500">{msg}</span>}
    </div>
  );
}
