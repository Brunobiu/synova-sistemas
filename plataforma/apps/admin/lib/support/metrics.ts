import type { Priority } from "@synova/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { computeMetrics, type Metrics } from "./metrics-util";

// Busca os dados (client de sessão do admin, RLS admin_all) e delega o cálculo
// ao agregador puro. O isolamento por sistema é garantido pela RLS.

export async function getMetrics(): Promise<Metrics> {
  const db = await getServerSupabase();
  const [ticketsRes, chatsRes, systemsRes, messagesRes] = await Promise.all([
    db.from("tickets").select("priority, status, system_id, chat_id").limit(5000),
    db.from("chats").select("id, status").limit(5000),
    db.from("systems").select("id, name"),
    db
      .from("messages")
      .select("chat_id, sender_type, created_at")
      .order("created_at", { ascending: true })
      .limit(20000),
  ]);

  const tickets = ((ticketsRes.data ?? []) as Array<{
    priority: Priority;
    status: string;
    system_id: string;
    chat_id: string | null;
  }>).map((t) => ({
    priority: t.priority,
    status: t.status,
    systemId: t.system_id,
    chatId: t.chat_id,
  }));

  const chats = (chatsRes.data ?? []) as Array<{ id: string; status: string }>;

  const systemNames: Record<string, string> = {};
  for (const s of (systemsRes.data ?? []) as Array<{ id: string; name: string }>) {
    systemNames[s.id] = s.name;
  }

  const messages = ((messagesRes.data ?? []) as Array<{
    chat_id: string;
    sender_type: string;
    created_at: string;
  }>).map((row) => ({
    chatId: row.chat_id,
    senderType: row.sender_type,
    createdAt: row.created_at,
  }));

  return computeMetrics({ tickets, chats, systemNames, messages });
}
