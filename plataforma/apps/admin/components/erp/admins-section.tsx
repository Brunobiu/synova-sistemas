"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProfileRow } from "@synova/database";
import { adminInviteSchema, type AdminInviteInput } from "@/lib/auth/schema";
import { inviteAdminAction } from "@/app/erp/admins/actions";
import { Button } from "@/components/ui/button";

export function AdminsSection({
  admins,
  currentAdminId,
}: {
  admins: ProfileRow[];
  currentAdminId: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminInviteInput>({
    resolver: zodResolver(adminInviteSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onInvite(values: AdminInviteInput) {
    setMsg(null);
    const res = await inviteAdminAction(values);
    if (res.ok) {
      reset();
      router.refresh();
      setMsg("Administrador criado ✓");
    } else {
      setMsg(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-md border text-sm">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {a.email ?? "(sem e-mail)"}
                {a.id === currentAdminId ? (
                  <span className="ml-2 text-xs text-gray-400">(você)</span>
                ) : null}
              </div>
              <div className="truncate text-gray-500">
                Admin desde {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <span className="rounded-full border px-2 py-0.5 text-xs text-gray-500">
              Administrador
            </span>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onInvite)}
        className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <label className="text-xs text-gray-500">E-mail</label>
          <input
            type="email"
            autoComplete="off"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Senha inicial</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "..." : "Adicionar administrador"}
          </Button>
        </div>
      </form>

      <p className="text-xs text-gray-400">
        O novo admin já entra com o e-mail confirmado e a senha definida aqui. Peça para
        ele trocar a senha depois do primeiro acesso.
      </p>
      {msg && <span className="text-sm text-gray-500">{msg}</span>}
    </div>
  );
}
