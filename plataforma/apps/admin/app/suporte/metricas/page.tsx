import { getMetrics } from "@/lib/support/metrics";

export const dynamic = "force-dynamic";

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

const PRIORITY_LABEL: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default async function MetricsPage() {
  const m = await getMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Métricas</h1>
        <p className="text-sm text-gray-500">Visão agregada de atendimento (todos os sistemas).</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Tickets no total" value={m.totalTickets} />
        <Card label="Abertos" value={m.openTickets} />
        <Card label="Resolvidos" value={m.resolvedTickets} />
        <Card label="Críticos abertos" value={m.criticalOpen} />
        <Card label="Conversas" value={m.totalChats} />
        <Card label="Escaladas" value={m.escalatedChats} />
        <Card label="Taxa de escalonamento" value={`${m.escalationRate}%`} hint="conversas que viraram ticket" />
        <Card label="Resolução automática" value={`${m.autoResolutionRate}%`} hint="conversas sem escalonamento" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Tickets por prioridade</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["critica", "alta", "media", "baixa"] as const).map((p) => (
            <Card key={p} label={PRIORITY_LABEL[p]} value={m.ticketsByPriority[p] ?? 0} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500">Tickets por sistema</h2>
        {m.ticketsBySystem.length === 0 ? (
          <p className="text-sm text-gray-500">Sem dados ainda.</p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {m.ticketsBySystem.map((s) => (
              <div key={s.systemName} className="flex items-center justify-between px-3 py-2">
                <span>{s.systemName}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Tempos médios de resposta (IA/humano) e satisfação (CSAT) ainda não são coletados — entram
        numa próxima evolução (exigem marcação de tempo por mensagem e um mecanismo de avaliação).
      </p>
    </div>
  );
}
