import { getServiceSupabase } from "@/lib/supabase/service";

// audit_logs é append-only e o admin só tem SELECT via RLS; a escrita vai pelo
// service client. Usado tanto pela borda do widget quanto pelas ações do painel.

export async function logAudit(params: {
  systemId: string | null;
  tenantId: string | null;
  actorType: "user" | "ai" | "admin" | "system" | "anonymous";
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getServiceSupabase();
    await db.from("audit_logs").insert({
      system_id: params.systemId,
      tenant_id: params.tenantId,
      actor_type: params.actorType,
      actor_id: params.actorId ?? null,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      ip: params.ip ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // auditoria não deve derrubar a ação principal
  }
}
