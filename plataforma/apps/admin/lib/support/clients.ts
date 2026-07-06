import type { Priority } from "@synova/shared";
import { getServerSupabase } from "@/lib/supabase/server";

// Histórico por cliente (a pessoa que usa o sistema e falou com o suporte).
// Leitura via sessão do admin/atendente (protegido por RLS).

type DB = Awaited<ReturnType<typeof getServerSupabase>>;

function displayName(name: string | null, externalRef: string | null): string {
  return name || (externalRef ? `Usuário ${externalRef}` : "—");
}

async function systemNames(db: DB, ids: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  if (!uniq.length) return new Map();
  const { data } = await db.from("systems").select("id, name").in("id", uniq);
  return new Map(((data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]));
}

export interface ClientRow {
  id: string;
  name: string;
  externalRef: string | null;
  systemName: string;
}

export async function listClients(q?: string): Promise<ClientRow[]> {
  const db = await getServerSupabase();
  const { data } = await db
    .from("users")
    .select("id, name, external_ref, system_id")
    .order("created_at", { ascending: false })
    .limit(300);
  const users = (data ?? []) as Array<{
    id: string;
    name: string | null;
    external_ref: string | null;
    system_id: string;
  }>;
  const sys = await systemNames(db, users.map((u) => u.system_id));

  let rows: ClientRow[] = users.map((u) => ({
    id: u.id,
    name: displayName(u.name, u.external_ref),
    externalRef: u.external_ref,
    systemName: sys.get(u.system_id) ?? "—",
  }));

  if (q) {
    const t = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(t) ||
        (r.externalRef ?? "").toLowerCase().includes(t) ||
        r.systemName.toLowerCase().includes(t),
    );
  }
  return rows;
}

export interface ClientHistory {
  user: {
    id: string;
    name: string;
    externalRef: string | null;
    email: string | null;
    role: string | null;
    sector: string | null;
    systemName: string;
  };
  chats: Array<{ id: string; status: string; createdAt: string }>;
  tickets: Array<{
    id: string;
    subject: string;
    status: string;
    priority: Priority;
    chatId: string | null;
    createdAt: string;
  }>;
}

export async function getClientHistory(userId: string): Promise<ClientHistory | null> {
  const db = await getServerSupabase();
  const { data: u } = await db
    .from("users")
    .select("id, name, external_ref, email, role, sector, system_id")
    .eq("id", userId)
    .maybeSingle();
  if (!u) return null;
  const user = u as {
    id: string;
    name: string | null;
    external_ref: string | null;
    email: string | null;
    role: string | null;
    sector: string | null;
    system_id: string;
  };

  const [{ data: sysRow }, { data: chatsData }, { data: ticketsData }] = await Promise.all([
    db.from("systems").select("name").eq("id", user.system_id).maybeSingle(),
    db
      .from("chats")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    db
      .from("tickets")
      .select("id, subject, status, priority, chat_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    user: {
      id: user.id,
      name: displayName(user.name, user.external_ref),
      externalRef: user.external_ref,
      email: user.email,
      role: user.role,
      sector: user.sector,
      systemName: (sysRow as { name?: string } | null)?.name ?? "—",
    },
    chats: ((chatsData ?? []) as Array<{ id: string; status: string; created_at: string }>).map(
      (c) => ({ id: c.id, status: c.status, createdAt: c.created_at }),
    ),
    tickets: (
      (ticketsData ?? []) as Array<{
        id: string;
        subject: string;
        status: string;
        priority: Priority;
        chat_id: string | null;
        created_at: string;
      }>
    ).map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      chatId: t.chat_id,
      createdAt: t.created_at,
    })),
  };
}
