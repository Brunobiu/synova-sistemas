"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function NotificationsFilters({
  systems,
}: {
  systems: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/suporte/notificacoes?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="rounded-md border px-2 py-1.5 text-sm"
        value={params.get("system") ?? ""}
        onChange={(e) => update("system", e.target.value)}
      >
        <option value="">Todos os sistemas</option>
        {systems.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border px-2 py-1.5 text-sm"
        value={params.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="unread">Não lidas</option>
        <option value="read">Lidas</option>
        <option value="resolved">Resolvidas</option>
      </select>
      <select
        className="rounded-md border px-2 py-1.5 text-sm"
        value={params.get("priority") ?? ""}
        onChange={(e) => update("priority", e.target.value)}
      >
        <option value="">Todas as prioridades</option>
        <option value="critica">Crítica</option>
        <option value="alta">Alta</option>
        <option value="media">Média</option>
        <option value="baixa">Baixa</option>
      </select>
    </div>
  );
}
