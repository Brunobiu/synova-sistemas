import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversation } from "@/lib/support/data";
import { ReplyBox } from "@/components/support/reply-box";
import { TicketControls } from "@/components/support/ticket-controls";
import { AutoRefresh } from "@/components/support/auto-refresh";

export const dynamic = "force-dynamic";

const SENDER_LABEL: Record<string, string> = {
  user: "Cliente",
  ai: "IA",
  admin: "Atendente",
  system: "Sistema",
};

const SENDER_ALIGN: Record<string, string> = {
  user: "items-start",
  ai: "items-end",
  admin: "items-end",
  system: "items-center",
};

const SENDER_BUBBLE: Record<string, string> = {
  user: "bg-white border",
  ai: "bg-indigo-50 border border-indigo-100",
  admin: "bg-emerald-50 border border-emerald-100",
  system: "bg-amber-50 text-amber-800 text-xs",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <AutoRefresh seconds={5} />
      <div>
        <Link href="/meu-atendimento" className="text-sm text-gray-500 hover:underline">
          ← Voltar à caixa
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {conv.chat.systemName} · {conv.chat.tenantName}
        </h1>
        <p className="text-sm text-gray-500">Cliente: {conv.chat.userName}</p>
      </div>

      {conv.ticket && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Ticket: {conv.ticket.subject}</p>
              {conv.ticket.escalationReason && (
                <p className="text-xs text-gray-600">Motivo: {conv.ticket.escalationReason}</p>
              )}
            </div>
            <TicketControls
              ticketId={conv.ticket.id}
              priority={conv.ticket.priority}
              resolved={conv.ticket.status === "resolved" || conv.ticket.status === "closed"}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-md border bg-gray-50 p-3">
        {conv.messages.length === 0 ? (
          <p className="text-sm text-gray-500">Sem mensagens ainda.</p>
        ) : (
          conv.messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${SENDER_ALIGN[m.senderType] ?? "items-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${SENDER_BUBBLE[m.senderType] ?? "bg-white border"}`}>
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                  {SENDER_LABEL[m.senderType] ?? m.senderType}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                {m.attachments.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {m.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-indigo-600 hover:underline"
                      >
                        📎 {a.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ReplyBox chatId={conv.chat.id} status={conv.chat.status} aiPaused={conv.chat.aiPaused} />
    </div>
  );
}
