"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  aiProviderSchema,
  type AiProviderInput,
  type AiProviderName,
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
} from "@/lib/erp/schema";
import {
  saveAiProviderAction,
  activateAiProviderAction,
  deleteAiProviderAction,
  testAiProviderAction,
} from "@/lib/erp/ai-actions";
import { Button } from "@/components/ui/button";

// Resumo client-safe: nunca enviamos a chave (nem cifrada) para o cliente.
export interface ProviderSummary {
  provider: AiProviderName;
  configured: boolean;
  isActive: boolean;
  chatModel: string;
  embeddingsModel: string;
}

const MODEL_HINTS: Record<AiProviderName, { chat: string; embeddings: string }> = {
  openai: { chat: "gpt-4o-mini", embeddings: "text-embedding-3-small" },
  anthropic: { chat: "claude-3-5-sonnet-latest", embeddings: "—" },
  google: { chat: "gemini-2.5-flash", embeddings: "gemini-embedding-001" },
};

function ProviderCard({ summary }: { summary: ProviderSummary }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hints = MODEL_HINTS[summary.provider];
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AiProviderInput>({
    resolver: zodResolver(aiProviderSchema),
    defaultValues: {
      provider: summary.provider,
      apiKey: "",
      chatModel: summary.chatModel,
      embeddingsModel: summary.embeddingsModel,
    },
  });

  async function onSave(values: AiProviderInput) {
    setMsg(null);
    setTestMsg(null);
    const res = await saveAiProviderAction({ ...values, provider: summary.provider });
    if (res.ok) {
      router.refresh();
      setMsg("Salvo ✓");
    } else {
      setMsg(res.error);
    }
  }

  async function onActivate() {
    setBusy(true);
    setMsg(null);
    const res = await activateAiProviderAction(summary.provider);
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error);
  }

  async function onTest() {
    setBusy(true);
    setTestMsg("Testando...");
    const res = await testAiProviderAction(summary.provider);
    setBusy(false);
    setTestMsg(res.message);
  }

  async function onRemove() {
    setBusy(true);
    setMsg(null);
    const res = await deleteAiProviderAction(summary.provider);
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error);
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{AI_PROVIDER_LABELS[summary.provider]}</h3>
        {summary.isActive && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Ativo</span>
        )}
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            summary.configured ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"
          }`}
        >
          {summary.configured ? "Configurado" : "Sem chave"}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Chave de API</label>
          <input
            type="password"
            autoComplete="off"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder={summary.configured ? "•••••••• (deixe vazio para manter)" : "Cole a chave aqui"}
            {...register("apiKey")}
          />
          {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey.message}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Modelo de chat</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder={hints.chat}
              {...register("chatModel")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Modelo de embeddings</label>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder={hints.embeddings}
              {...register("embeddingsModel")}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting || busy}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
          {summary.configured && !summary.isActive && (
            <Button type="button" variant="secondary" disabled={busy} onClick={onActivate}>
              Ativar
            </Button>
          )}
          {summary.configured && (
            <Button type="button" variant="outline" disabled={busy} onClick={onTest}>
              Testar conexão
            </Button>
          )}
          {summary.configured && (
            <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
              Remover
            </Button>
          )}
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
          {testMsg && <span className="text-sm text-gray-500">{testMsg}</span>}
        </div>
      </form>
    </div>
  );
}

export function AiProvidersSection({ summaries }: { summaries: ProviderSummary[] }) {
  return (
    <div className="space-y-4">
      {AI_PROVIDERS.map((p) => {
        const summary =
          summaries.find((s) => s.provider === p) ??
          ({
            provider: p,
            configured: false,
            isActive: false,
            chatModel: "",
            embeddingsModel: "",
          } satisfies ProviderSummary);
        return <ProviderCard key={p} summary={summary} />;
      })}
    </div>
  );
}
