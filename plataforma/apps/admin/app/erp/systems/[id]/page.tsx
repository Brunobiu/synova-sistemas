import Link from "next/link";
import { notFound } from "next/navigation";
import { getSystem } from "@/lib/erp/systems";
import { SYSTEM_STATUS_LABELS } from "@/lib/erp/schema";

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await getSystem(id);
  if (!system) notFound();

  const status = system.status as keyof typeof SYSTEM_STATUS_LABELS;

  return (
    <div className="space-y-4">
      <Link href="/erp" className="text-sm text-gray-500 hover:underline">
        ← Voltar ao hub
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{system.name}</h1>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {SYSTEM_STATUS_LABELS[status] ?? system.status}
        </span>
      </div>

      <div className="rounded-md border p-4 text-sm">
        <div className="text-gray-500">Chave de integração (pública)</div>
        <code className="break-all">{system.support_api_key}</code>
      </div>

      <p className="text-sm text-gray-500">
        Contexto do sistema, dados do cliente e usuários — em construção (bloco 5).
      </p>
    </div>
  );
}
