import Link from "next/link";
import { listSystems } from "@/lib/erp/systems";
import { SystemCard } from "@/components/erp/system-card";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function ErpHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const systems = await listSystems(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-gray-500">
            Seus sistemas (próprios e de clientes)
          </p>
        </div>
        <Link href="/erp/systems/new" className={buttonVariants()}>
          Novo sistema
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome..."
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {systems.length === 0 ? (
        <p className="text-sm text-gray-500">
          {q
            ? "Nenhum sistema encontrado para essa busca."
            : 'Nenhum sistema ainda. Clique em "Novo sistema" para começar.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <SystemCard key={system.id} system={system} />
          ))}
        </div>
      )}
    </div>
  );
}
