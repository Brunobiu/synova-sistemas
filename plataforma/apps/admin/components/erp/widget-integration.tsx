"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseOrigins } from "@/lib/erp/schema";
import { saveAllowedOriginsAction, rotateSecretAction } from "@/lib/erp/widget-actions";
import { Button } from "@/components/ui/button";

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={copy}>
      {done ? "Copiado ✓" : label}
    </Button>
  );
}

export function WidgetIntegration({
  systemId,
  apiKey,
  allowedOrigins,
  secretRotatedAt,
}: {
  systemId: string;
  apiKey: string;
  allowedOrigins: string[];
  secretRotatedAt: string | null;
}) {
  const router = useRouter();
  const [originsText, setOriginsText] = useState(allowedOrigins.join("\n"));
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotateMsg, setRotateMsg] = useState<string | null>(null);

  const snippet = `<script
  src="https://SEU_DOMINIO/widget/embed.js"
  data-synova-key="${apiKey}"
  defer
></script>`;

  async function onSaveOrigins() {
    setSaving(true);
    setMsg(null);
    const origins = parseOrigins(originsText);
    const res = await saveAllowedOriginsAction(systemId, origins);
    setSaving(false);
    if (res.ok) {
      setOriginsText(origins.join("\n"));
      router.refresh();
      setMsg("Domínios salvos ✓");
    } else {
      setMsg(res.error);
    }
  }

  async function onRotate() {
    setRotating(true);
    setRotateMsg(null);
    const res = await rotateSecretAction(systemId);
    setRotating(false);
    setConfirmRotate(false);
    if (res.ok) {
      setNewSecret(res.secret);
      router.refresh();
    } else {
      setRotateMsg(res.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Chave pública (identifica o sistema)</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border bg-gray-50 px-3 py-2 text-sm">
            {apiKey}
          </code>
          <CopyButton value={apiKey} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Snippet de instalação</label>
        <p className="text-xs text-gray-500">
          Cole antes do <code>&lt;/body&gt;</code> do site do cliente. Troque{" "}
          <code>SEU_DOMINIO</code> pelo domínio onde a plataforma estiver publicada. (O widget em si
          é entregue no bloco 11.)
        </p>
        <textarea
          readOnly
          rows={5}
          value={snippet}
          className="w-full rounded-md border bg-gray-50 px-3 py-2 font-mono text-xs"
        />
        <CopyButton value={snippet} label="Copiar snippet" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Domínios permitidos (CORS)</label>
        <p className="text-xs text-gray-500">
          Um por linha. Só esses domínios poderão usar o widget. Use{" "}
          <code>https://seusite.com</code> (sem caminho) ou <code>*</code> para liberar todos (não
          recomendado em produção).
        </p>
        <textarea
          rows={4}
          value={originsText}
          onChange={(e) => setOriginsText(e.target.value)}
          placeholder={"https://app.cliente.com\nhttps://cliente.com"}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <Button type="button" disabled={saving} onClick={onSaveOrigins}>
            {saving ? "Salvando..." : "Salvar domínios"}
          </Button>
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
        <label className="text-sm font-medium">Segredo de assinatura</label>
        <p className="text-xs text-gray-600">
          Usado para assinar as mensagens do widget. Ao rotacionar, o segredo anterior continua
          válido por um período (convivência), evitando quebrar instalações ativas. O segredo só
          aparece uma vez — guarde com cuidado.
          {secretRotatedAt && (
            <>
              {" "}
              Última rotação: {new Date(secretRotatedAt).toLocaleString("pt-BR")}.
            </>
          )}
        </p>

        {newSecret ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-800">
              Novo segredo (copie agora, não será mostrado de novo):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-white px-3 py-2 text-sm">
                {newSecret}
              </code>
              <CopyButton value={newSecret} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNewSecret(null)}>
              Já guardei
            </Button>
          </div>
        ) : confirmRotate ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-amber-800">Confirmar rotação do segredo?</span>
            <Button type="button" variant="destructive" disabled={rotating} onClick={onRotate}>
              {rotating ? "Rotacionando..." : "Confirmar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmRotate(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirmRotate(true)}>
            Rotacionar segredo
          </Button>
        )}
        {rotateMsg && <p className="text-sm text-red-500">{rotateMsg}</p>}
      </div>
    </div>
  );
}
