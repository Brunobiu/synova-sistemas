"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { systemFormSchema, type SystemFormInput } from "@/lib/erp/schema";
import { createSystemAction } from "@/app/erp/actions";
import { Button, buttonVariants } from "@/components/ui/button";

export function SystemForm() {
  const [created, setCreated] = useState<{ apiKey: string; secret: string; id: string } | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SystemFormInput>({
    resolver: zodResolver(systemFormSchema),
    defaultValues: { name: "", isOwn: false, imageUrl: "", status: "active" },
  });

  async function onSubmit(values: SystemFormInput) {
    setErro(null);
    const res = await createSystemAction(values);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    setCreated({ apiKey: res.apiKey, secret: res.secret, id: res.id });
  }

  if (created) {
    return (
      <div className="max-w-lg space-y-4">
        <h2 className="text-lg font-semibold">Sistema criado ✓</h2>
        <p className="text-sm text-amber-600">
          Guarde o <strong>segredo</strong> agora — por segurança, ele não será mostrado de novo.
        </p>
        <div className="space-y-3 rounded-md border p-4 text-sm">
          <div>
            <div className="text-gray-500">Chave de integração (pública)</div>
            <code className="break-all">{created.apiKey}</code>
          </div>
          <div>
            <div className="text-gray-500">Segredo (secreto)</div>
            <code className="break-all">{created.secret}</code>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/erp" className={buttonVariants()}>
            Voltar ao hub
          </Link>
          <Link
            href={`/erp/systems/${created.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Abrir sistema
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm">
          Nome do sistema
        </label>
        <input
          id="name"
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Ex.: SaaS Barbearia"
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="imageUrl" className="text-sm">
          Imagem (URL, opcional)
        </label>
        <input
          id="imageUrl"
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="https://..."
          {...register("imageUrl")}
        />
        {errors.imageUrl && <p className="text-xs text-red-500">{errors.imageUrl.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className="text-sm">
          Status
        </label>
        <select
          id="status"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("status")}
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isOwn")} />
        Projeto próprio (desmarcado = de cliente)
      </label>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar sistema"}
        </Button>
        <Link href="/erp" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
