"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  replyAction,
  takeOverAction,
  releaseToAiAction,
  closeChatAction,
  archiveChatAction,
} from "@/lib/support/actions";
import { Button } from "@/components/ui/button";

export function ReplyBox({
  chatId,
  status,
  aiPaused,
}: {
  chatId: string;
  status: string;
  aiPaused: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const closed = status === "closed" || status === "archived";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, clear = false) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (clear) setContent("");
        router.refresh();
      } else {
        setMsg(res.error ?? "Erro.");
      }
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        {status !== "human_active" ? (
          <Button size="sm" variant="secondary" disabled={pending || closed} onClick={() => run(() => takeOverAction(chatId))}>
            Assumir da IA
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => releaseToAiAction(chatId))}>
            Devolver para a IA
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending || closed} onClick={() => run(() => closeChatAction(chatId))}>
          Encerrar
        </Button>
        <Button size="sm" variant="ghost" disabled={pending || status === "archived"} onClick={() => run(() => archiveChatAction(chatId))}>
          Arquivar
        </Button>
        <span className="self-center text-xs text-gray-500">
          {closed ? "Conversa encerrada" : aiPaused ? "IA pausada (humano no comando)" : "IA respondendo"}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          className="flex-1 rounded-md border px-2 py-1.5 text-sm"
          placeholder="Responder como atendente..."
          value={content}
          disabled={pending || closed}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          disabled={pending || closed || !content.trim()}
          onClick={() => run(() => replyAction(chatId, content), true)}
        >
          Enviar
        </Button>
      </div>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  );
}
