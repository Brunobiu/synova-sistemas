import Link from "next/link";
import { notFound } from "next/navigation";
import { getSystem } from "@/lib/erp/systems";
import { ensurePrimaryTenant } from "@/lib/erp/tenants";
import { listUsers } from "@/lib/erp/users";
import { listKnowledgeDocs } from "@/lib/erp/knowledge";
import { SYSTEM_STATUS_LABELS } from "@/lib/erp/schema";
import { ClientContactForm } from "@/components/erp/client-contact-form";
import { SystemContextForm } from "@/components/erp/system-context-form";
import { UsersSection } from "@/components/erp/users-section";
import { KnowledgeSection } from "@/components/erp/knowledge-section";
import { WidgetIntegration } from "@/components/erp/widget-integration";

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await getSystem(id);
  if (!system) notFound();

  const tenant = await ensurePrimaryTenant(system.id, system.name);
  const users = await listUsers(system.id);
  const docs = await listKnowledgeDocs(system.id);
  const status = system.status as keyof typeof SYSTEM_STATUS_LABELS;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/erp" className="text-sm text-gray-500 hover:underline">
          ← Voltar ao hub
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{system.name}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {SYSTEM_STATUS_LABELS[status] ?? system.status}
          </span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {system.is_own ? "Próprio" : "Cliente"}
          </span>
        </div>
      </div>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-medium">Cliente</h2>
        <p className="text-sm text-gray-500">
          Quem <strong>contratou</strong> o sistema (o contato principal / dono). É um por
          sistema. Se o projeto é seu, pode deixar em branco.
        </p>
        <ClientContactForm
          systemId={system.id}
          tenantId={tenant.id}
          initial={{
            contactName: tenant.contact_name ?? "",
            contactPhone: tenant.contact_phone ?? "",
          }}
        />
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-medium">Contexto do sistema</h2>
        <SystemContextForm
          systemId={system.id}
          initial={{ context: system.context ?? "", notes: system.notes ?? "" }}
        />
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-medium">Usuários</h2>
        <p className="text-sm text-gray-500">
          As pessoas que <strong>usam</strong> o sistema e abrem suporte (os funcionários do
          cliente). Você pode cadastrar vários — cada um no formulário abaixo. A IA usa o
          identificador (ex.: &quot;9&quot;) para saber quem é e responder pelo nome. Quando o
          widget estiver integrado (bloco 9), novos usuários entram aqui sozinhos.
        </p>
        <UsersSection systemId={system.id} tenantId={tenant.id} users={users} />
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-medium">Base de conhecimento</h2>
        <p className="text-sm text-gray-500">
          Documentos que a IA consulta para responder: manuais técnicos, procedimentos
          operacionais, informações comerciais. Escolha o <strong>escopo</strong>: &quot;Todo o
          sistema&quot; vale para qualquer cliente; &quot;Só do cliente&quot; vale apenas para este.
          A indexação semântica (busca por similaridade) é ligada no bloco 8, quando as chaves de IA
          estiverem ativas.
        </p>
        <KnowledgeSection systemId={system.id} primaryTenantId={tenant.id} docs={docs} />
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-medium">Integração (widget)</h2>
        <p className="text-sm text-gray-500">
          Chave e domínios que o widget de suporte usa no site do cliente.
        </p>
        <WidgetIntegration
          systemId={system.id}
          apiKey={system.support_api_key}
          allowedOrigins={system.allowed_origins ?? []}
          secretRotatedAt={system.secret_rotated_at}
        />
      </section>
    </div>
  );
}
