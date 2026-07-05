import type { Priority } from "@synova/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { sortByPriorityThenRecent } from "./sort";
import type { NotificationView } from "./notifications-util";

// Leitura da central de notificações (client de sessão do admin, RLS admin_all).

export interface NotificationFilters {
  systemId?: string;
  status?: string;
  priority?: string;
}

export async function listNotifications(
  filters: NotificationFilters = {},
): Promise<NotificationView[]> {
  const db = await getServerSupabase();
  let q = db
    .from("notifications")
    .select("id, system_id, type, priority, title, body, status, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.systemId) q = q.eq("system_id", filters.systemId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.priority) q = q.eq("priority", filters.priority);
  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    system_id: string;
    type: string;
    priority: Priority;
    title: string;
    body: string | null;
    status: "unread" | "read" | "resolved";
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
  }>;

  const systemIds = Array.from(new Set(rows.map((r) => r.system_id)));
  const names = new Map<string, string>();
  if (systemIds.length) {
    const { data: sys } = await db.from("systems").select("id, name").in("id", systemIds);
    for (const s of (sys ?? []) as Array<{ id: string; name: string }>) names.set(s.id, s.name);
  }

  const views: NotificationView[] = rows.map((r) => ({
    id: r.id,
    systemId: r.system_id,
    systemName: names.get(r.system_id) ?? "—",
    type: r.type,
    priority: r.priority,
    title: r.title,
    body: r.body,
    status: r.status,
    entityType: r.entity_type,
    entityId: r.entity_id,
    createdAt: r.created_at,
  }));

  return sortByPriorityThenRecent(views);
}

export async function countUnread(): Promise<number> {
  const db = await getServerSupabase();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");
  return count ?? 0;
}
