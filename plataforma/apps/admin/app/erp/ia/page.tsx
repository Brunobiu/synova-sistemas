import Link from "next/link";
import { listAiProviders } from "@/lib/erp/ai-providers";
import {
  AiProvidersSection,
  type ProviderSummary,
} from "@/components/erp/ai-providers-section";
import type { AiProviderName } from "@/lib/erp/schema";

export default async function AiSettingsPage() {
  const rows = await listAiProviders();
  const summaries: ProviderSummary[] = rows.map((r) => ({
    provider: r.provider as AiProviderName,
    configured: !!r.api_key_encrypted,
    isActive: r.is_active,
    chatModel: r.chat_model ?? "",
    embeddingsModel: r.embeddings_model ?? "",
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/erp" className="text-sm text-gray-500 hover:underline">
          ← Voltar ao hub
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Configuração de IA</h1>
        <p className="text-sm text-gray-500">
          Chaves dos provedores de IA usados pelo suporte inteligente. Ficam <strong>cifradas</strong>{" "}
          no banco e valem para toda a plataforma. Configure um ou mais e ative um como padrão.
        </p>
      </div>

      <AiProvidersSection summaries={summaries} />
    </div>
  );
}
