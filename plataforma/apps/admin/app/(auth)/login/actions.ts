"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { loginSchema, type LoginInput } from "@/lib/auth/schema";
import {
  LOGIN_RATE_LIMIT,
  clientIpFromHeaders,
  loginRateKey,
  loginRateLimiter,
  normalizeEmail,
} from "@/lib/auth/login-guard";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSeconds?: number };

/**
 * Login do painel feito no servidor: permite (1) rate limit por IP+e-mail e
 * (2) auditoria das tentativas. Ao autenticar, o cliente SSR grava os cookies de
 * sessão na resposta desta action. Só admins entram; qualquer outro é desconectado.
 */
export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }
  const email = normalizeEmail(parsed.data.email);
  const ip = clientIpFromHeaders(await headers());

  const rl = loginRateLimiter.check(loginRateKey(ip, email), LOGIN_RATE_LIMIT);
  if (!rl.allowed) {
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "anonymous",
      action: "admin.login.rate_limited",
      ip,
      metadata: { email },
    });
    return {
      ok: false,
      error: "Muitas tentativas de login.",
      retryAfterSeconds: rl.retryAfterSeconds,
    };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "anonymous",
      action: "admin.login.failed",
      ip,
      metadata: { email },
    });
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  // Confere o papel usando o mesmo client já autenticado (RLS self_read).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    await logAudit({
      systemId: null,
      tenantId: null,
      actorType: "user",
      actorId: data.user.id,
      action: "admin.access_denied",
      ip,
      metadata: { email, reason: "not_admin" },
    });
    return { ok: false, error: "Sua conta não tem permissão de administrador." };
  }

  await logAudit({
    systemId: null,
    tenantId: null,
    actorType: "admin",
    actorId: data.user.id,
    action: "admin.login.success",
    ip,
    metadata: { email },
  });
  return { ok: true };
}
