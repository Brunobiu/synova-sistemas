import Link from "next/link";
import { SystemForm } from "@/components/erp/system-form";

export default function NewSystemPage() {
  return (
    <div className="space-y-4">
      <Link href="/erp" className="text-sm text-gray-500 hover:underline">
        ← Voltar ao hub
      </Link>
      <h1 className="text-2xl font-semibold">Novo sistema</h1>
      <p className="text-sm text-gray-500">
        Ao criar, geramos a chave de integração e um segredo (mostrado uma única vez).
      </p>
      <SystemForm />
    </div>
  );
}
