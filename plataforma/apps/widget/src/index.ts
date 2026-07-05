import { WidgetApi } from "./api";
import { readConfigFromScript, type WidgetConfig } from "./config";
import { WidgetUI } from "./ui";
import { OfflineQueue } from "./queue";

// Captura a tag <script> atual no momento do carregamento (IIFE).
const currentScript = document.currentScript as HTMLScriptElement | null;

interface QueuedMessage {
  content: string;
  attachmentIds?: string[];
}

function start(config: WidgetConfig) {
  const api = new WidgetApi(config);
  const queue = new OfflineQueue<QueuedMessage>();
  let sessionId: string | null = null;
  let connected = false;
  let polling: ReturnType<typeof setInterval> | null = null;
  let pendingAttachments: string[] = [];
  const storageKey = `synova_session_${config.apiKey}`;

  const ui = new WidgetUI(config, {
    onOpen: connect,
    onSend: handleSend,
    onAttach: handleAttach,
    onOpenTicket: handleTicket,
  });
  ui.mount();

  async function connect() {
    if (connected) return;
    try {
      const stored = safeGet(storageKey) ?? undefined;
      const result = await api.startSession(stored ? { sessionId: stored } : {});
      sessionId = result.sessionId;
      safeSet(storageKey, sessionId);
      connected = true;
      ui.renderHistory(result.history);
      ui.setStatus(result.user.name ? `Olá, ${result.user.name}!` : "Conectado");
      startPolling();
      void flushQueue();
    } catch {
      ui.setStatus("Sem conexão. Tentaremos novamente.");
    }
  }

  async function handleSend(content: string) {
    ui.addLocal(content, "user");
    const attachmentIds = pendingAttachments;
    pendingAttachments = [];
    if (!connected || !sessionId) {
      queue.enqueue({ content, attachmentIds });
      ui.setStatus("Offline: mensagem na fila.");
      void connect();
      return;
    }
    await deliver({ content, attachmentIds });
  }

  async function deliver(msg: QueuedMessage) {
    try {
      const res = await api.sendMessage(sessionId!, msg.content, msg.attachmentIds);
      if (res.reply) ui.addMessage({ id: res.messageId + "-ai", senderType: "ai", content: res.reply, createdAt: new Date().toISOString() });
      if (res.escalated) ui.addLocal("Encaminhamos para um atendente humano.", "system");
      ui.setStatus("Conectado");
    } catch {
      queue.enqueue(msg);
      ui.setStatus("Offline: mensagem na fila.");
    }
  }

  async function flushQueue() {
    if (!connected || !sessionId) return;
    await queue.flush(async (msg) => {
      const res = await api.sendMessage(sessionId!, msg.content, msg.attachmentIds);
      if (res.reply) ui.addMessage({ id: res.messageId + "-ai", senderType: "ai", content: res.reply, createdAt: new Date().toISOString() });
    });
  }

  async function handleAttach(file: File) {
    try {
      const res = await api.upload(file);
      pendingAttachments.push(res.attachmentId);
      ui.addLocal(`Anexo pronto: ${res.fileName}`, "system");
    } catch {
      ui.addLocal("Não foi possível enviar o anexo.", "system");
    }
  }

  async function handleTicket() {
    const subject = window.prompt("Assunto do chamado:");
    if (!subject) return;
    const description = window.prompt("Descreva o problema:") ?? subject;
    try {
      const res = await api.openTicket({
        sessionId: sessionId ?? undefined,
        category: "suporte",
        subject,
        description,
      });
      ui.addLocal(`Chamado aberto (prioridade ${res.priority}).`, "system");
    } catch {
      ui.addLocal("Não foi possível abrir o chamado.", "system");
    }
  }

  function startPolling() {
    if (polling) return;
    polling = setInterval(async () => {
      if (!connected || !sessionId) return;
      try {
        const { history } = await api.fetchHistory(sessionId, 30);
        for (const m of history) ui.addMessage(m);
      } catch {
        /* silencioso: próxima iteração tenta de novo */
      }
    }, 5000);
  }

  window.addEventListener("online", () => void flushQueue());
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage indisponível */
  }
}

interface SynovaGlobal {
  init: (script?: HTMLScriptElement) => void;
}

const SynovaWidget: SynovaGlobal = {
  init(script?: HTMLScriptElement) {
    const el = script ?? currentScript;
    if (!el) {
      console.error("Synova: não foi possível localizar a tag <script>.");
      return;
    }
    try {
      const config = readConfigFromScript(el, new URL(el.src, window.location.href).origin);
      start(config);
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Synova: erro ao iniciar.");
    }
  },
};

(window as unknown as { SynovaWidget: SynovaGlobal }).SynovaWidget = SynovaWidget;

// Auto-inicializa se a tag tiver a chave.
if (currentScript?.getAttribute("data-synova-key")) {
  SynovaWidget.init(currentScript);
}

export { SynovaWidget };
