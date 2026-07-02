"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm({
  initialError,
  nextPath,
}: {
  initialError: string | null;
  nextPath: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(initialError);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setErro(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setErro("Não foi possível conectar. Verifique a configuração do Supabase.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Synova · Painel</h1>
        <p className="text-sm text-gray-500">Acesso restrito a administradores</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
