import Link from "next/link";
import { listSystems, type SystemView } from "@/lib/erp/systems";
import { SystemCard } from "@/components/erp/system-card";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function ErpHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;
  const currentView: SystemView = view === "archived" ? "archived" : "active";
  const systems = await listSystems(q, currentView);

  const tabHref = (v: SystemView) => {
    const p = new URLSearchParams();
    if (v === "archived") p.set("view", "archived");
    if (q) p.set("q", q);
    const s = p.toString();
    return `/erp${s ? `?${s}` : ""}`;
  };
  const tabCls = (v: SystemView) =>
    `border-b-2 px-3 py-2 text-sm ${
      currentView === v
        ? "border-gray-900 font-medium text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-900"
    }`;

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

      <div className="flex gap-1 border-b">
        <Link href={tabHref("active")} className={tabCls("active")}>
          Ativos
        </Link>
        <Link href={tabHref("archived")} className={tabCls("archived")}>
          Arquivados
        </Link>
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="view" value={currentView} />
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
          {currentView === "archived"
            ? "Nenhum sistema arquivado."
            : q
              ? "Nenhum sistema encontrado para essa busca."
              : 'Nenhum sistema ativo ainda. Clique em "Novo sistema" para começar.'}
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
