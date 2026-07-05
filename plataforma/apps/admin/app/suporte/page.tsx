import Link from "next/link";
import { listTickets, listActiveChats, listSystemsForFilter } from "@/lib/support/data";
import { InboxFilters } from "@/components/support/inbox-filters";
import { TicketControls } from "@/components/support/ticket-controls";
import { AutoRefresh } from "@/components/support/auto-refresh";

export const dynamic = "force-dynamic";

const PRIORITY_STYLE: Record<string, string> = {
  critica: "border-red-300 bg-red-50",
  alta: "border-orange-200 bg-orange-50",
  media: "border-gray-200 bg-white",
  baixa: "border-gray-200 bg-white",
};
const PRIORITY_BADGE: Record<string, string> = {
  critica: "bg-red-600 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-gray-200 text-gray-700",
  baixa: "bg-gray-100 text-gray-600",
};

export default async function SuporteInbox({
  searchParams,
}: {
  searchParams: Promise<{ system?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filters = { systemId: sp.system, status: sp.status, q: sp.q };
  const [tickets, chats, systems] = await Promise.all([
    listTickets(filters),
    listActiveChats({ systemId: sp.system }),
    listSystemsForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={8} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Caixa de atendimento</h1>
        <InboxFilters systems={systems} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum ticket.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
                  PRIORITY_STYLE[t.priority] ?? "border-gray-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        PRIORITY_BADGE[t.priority] ?? "bg-gray-100"
                      }`}
                    >
                      {t.priority.toUpperCase()}
                    </span>
                    <span className="truncate font-medium">{t.subject}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t.systemName} · {t.tenantName} · {t.userName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <TicketControls
                    ticketId={t.id}
                    priority={t.priority}
                    resolved={t.status === "resolved" || t.status === "closed"}
                  />
                  {t.chatId && (
                    <Link
                      href={`/suporte/chats/${t.chatId}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Abrir conversa
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Conversas ativas ({chats.length})</h2>
        {chats.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conversa ativa.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {chats.map((c) => (
              <Link
                key={c.id}
                href={`/suporte/chats/${c.id}`}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span>
                  {c.systemName} · {c.tenantName} · {c.userName}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {c.status === "human_active" ? "humano" : "IA"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
