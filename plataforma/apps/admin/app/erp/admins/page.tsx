import { requireAdmin } from "@/lib/auth";
import { listAdmins } from "@/lib/auth/admins";
import { AdminsSection } from "@/components/erp/admins-section";

export default async function AdminsPage() {
  const user = await requireAdmin();
  const admins = await listAdmins();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administradores</h1>
        <p className="text-sm text-gray-500">
          Quem tem acesso ao painel. Adicione novos administradores abaixo.
        </p>
      </div>
      <AdminsSection admins={admins} currentAdminId={user.id} />
    </div>
  );
}
