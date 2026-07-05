"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/auth/schema";
import { loginAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

/** Formata segundos como "M min SS s" (ou "SS s" quando abaixo de 1 min). */
function formatTempo(totalSegundos: number): string {
  const m = Math.floor(totalSegundos / 60);
  const s = totalSegundos % 60;
  if (m > 0) return `${m} min ${s.toString().padStart(2, "0")} s`;
  return `${s} s`;
}

export function LoginForm({
  initialError,
  nextPath,
}: {
  initialError: string | null;
  nextPath: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(initialError);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Contagem regressiva ao vivo enquanto o login estiver bloqueado (rate limit).
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldown <= 0) {
      setCooldown(null);
      setErro(null);
      return;
    }
    const t = setTimeout(
      () => setCooldown((c) => (c === null ? null : c - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(values: LoginInput) {
    setErro(null);
    try {
      const res = await loginAction(values);
      if (!res.ok) {
        setErro(res.error);
        if (res.retryAfterSeconds && res.retryAfterSeconds > 0) {
          setCooldown(res.retryAfterSeconds);
        }
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setErro("Não foi possível conectar. Verifique a configuração do Supabase.");
    }
  }

  const emCooldown = cooldown !== null && cooldown > 0;

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

      {erro && (
        <p className="text-sm text-red-500">
          {erro}
          {emCooldown ? ` Tente de novo em ${formatTempo(cooldown!)}.` : ""}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || emCooldown}>
        {isSubmitting
          ? "Entrando..."
          : emCooldown
            ? `Aguarde ${formatTempo(cooldown!)}`
            : "Entrar"}
      </Button>
    </form>
  );
}
