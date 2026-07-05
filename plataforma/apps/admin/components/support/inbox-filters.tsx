"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function InboxFilters({
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
    router.push(`/suporte?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="search"
        placeholder="Buscar por assunto... (Enter)"
        className="rounded-md border px-2 py-1.5 text-sm"
        defaultValue={params.get("q") ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value.trim());
        }}
      />
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
        <option value="">Tickets abertos</option>
        <option value="open">Abertos</option>
        <option value="escalated">Escalados</option>
        <option value="in_progress">Em andamento</option>
        <option value="waiting_customer">Aguardando cliente</option>
        <option value="resolved">Resolvidos</option>
        <option value="closed">Fechados</option>
      </select>
    </div>
  );
}
