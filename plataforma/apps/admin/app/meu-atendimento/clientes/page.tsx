import Link from "next/link";
import { listClients } from "@/lib/support/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await listClients(q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-gray-500">
          Histórico de conversas e chamados de cada pessoa.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome, identificador ou sistema..."
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          Buscar
        </button>
      </form>

      {clients.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum cliente encontrado.</p>
      ) : (
        <div className="divide-y rounded-md border text-sm">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/meu-atendimento/clientes/${c.id}`}
              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50"
            >
              <span className="truncate font-medium">
                {c.name}
                {c.externalRef ? ` (#${c.externalRef})` : ""}
              </span>
              <span className="shrink-0 text-gray-500">{c.systemName}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
