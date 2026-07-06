import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientHistory } from "@/lib/support/clients";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  escalated: "Escalado",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
  ai_active: "Com IA",
  human_active: "Com atendente",
  archived: "Arquivada",
};

export default async function ClientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientHistory(id);
  if (!data) notFound();
  const { user, chats, tickets } = data;
  const subtitle = [user.systemName, user.email, user.role, user.sector]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/meu-atendimento/clientes" className="text-sm text-gray-500 hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {user.name}
          {user.externalRef ? ` (#${user.externalRef})` : ""}
        </h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Chamados ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum chamado.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.subject}</div>
                  <div className="text-xs text-gray-500">
                    {t.priority} · {new Date(t.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  {t.chatId && (
                    <Link
                      href={`/meu-atendimento/chats/${t.chatId}`}
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
        <h2 className="text-sm font-medium text-gray-500">Conversas ({chats.length})</h2>
        {chats.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conversa.</p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {chats.map((ch) => (
              <Link
                key={ch.id}
                href={`/meu-atendimento/chats/${ch.id}`}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <span>{new Date(ch.createdAt).toLocaleString("pt-BR")}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {STATUS_LABEL[ch.status] ?? ch.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
