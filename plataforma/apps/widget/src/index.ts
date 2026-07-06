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
  let pendingTicketAttachments: string[] = [];
  let activeTicketId: string | null = null;
  let threadPoll: ReturnType<typeof setInterval> | null = null;
  let updatesPoll: ReturnType<typeof setInterval> | null = null;
  const storageKey = `synova_session_${config.apiKey}`;
  const seenKey = `synova_seen_${config.apiKey}`;

  const ui = new WidgetUI(config, {
    onOpen: connect,
    onSend: handleSend,
    onAttach: handleAttach,
    onOpenTicket: handleTicket,
    onNewChat: resetChat,
    onSubmitTicket: submitTicket,
    onAttachTicket: attachTicket,
    onOpenThread: openThread,
    onSendThreadMessage: sendThreadMessage,
    onCloseThread: closeThread,
    onRateTicket: rateThreadTicket,
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
      ui.setStatus(result.user.name ? `Olá, ${result.user.name}!` : "Conectado", true);
      if (!safeGet(seenKey)) safeSet(seenKey, new Date().toISOString());
      startPolling();
      startUpdatesPolling();
      void flushQueue();
    } catch {
      ui.setStatus("Sem conexão. Tentaremos novamente.", false);
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
      if (res.escalated) ui.showTicketAction();
      ui.setStatus("Conectado", true);
    } catch {
      queue.enqueue(msg);
      ui.setStatus("Offline: mensagem na fila.", false);
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

  function handleTicket() {
    ui.openTicketModal();
    void loadTickets();
  }

  async function loadTickets() {
    if (!connected) return;
    try {
      const { tickets } = await api.listTickets();
      ui.renderTickets(tickets);
      markSeen();
    } catch {
      /* silencioso: a aba de lista simplesmente fica vazia */
    }
  }

  async function openThread(ticketId: string) {
    activeTicketId = ticketId;
    try {
      const { ticket, messages } = await api.getTicketThread(ticketId);
      ui.openThreadView(ticket.subject);
      ui.renderThreadMessages(messages);
      ui.renderThreadRating(ticket);
    } catch {
      ui.openThreadView("Chamado");
    }
    startThreadPolling();
    markSeen();
  }

  async function rateThreadTicket(rating: number) {
    if (!activeTicketId) return;
    try {
      await api.rateTicket(activeTicketId, rating);
      const { ticket } = await api.getTicketThread(activeTicketId);
      ui.renderThreadRating(ticket);
    } catch {
      /* silencioso */
    }
  }

  function closeThread() {
    activeTicketId = null;
    if (threadPoll) {
      clearInterval(threadPoll);
      threadPoll = null;
    }
  }

  async function sendThreadMessage(content: string) {
    if (!activeTicketId) return;
    try {
      const { message } = await api.sendTicketMessage(activeTicketId, content);
      ui.addThreadMessage(message);
    } catch {
      /* silencioso */
    }
  }

  function startThreadPolling() {
    if (threadPoll) return;
    threadPoll = setInterval(async () => {
      if (!activeTicketId) return;
      try {
        const { ticket, messages } = await api.getTicketThread(activeTicketId);
        for (const m of messages) ui.addThreadMessage(m);
        ui.renderThreadRating(ticket);
      } catch {
        /* silencioso */
      }
    }, 5000);
  }

  function getSeen(): string {
    return safeGet(seenKey) ?? new Date(0).toISOString();
  }

  function markSeen() {
    safeSet(seenKey, new Date().toISOString());
    ui.setUnread(0);
  }

  function startUpdatesPolling() {
    if (updatesPoll) return;
    updatesPoll = setInterval(pollUpdates, 10000);
    void pollUpdates();
  }

  async function pollUpdates() {
    if (!connected) return;
    try {
      const { newAdminMessages } = await api.getUpdates(getSeen());
      ui.setUnread(newAdminMessages);
    } catch {
      /* silencioso */
    }
  }

  async function attachTicket(file: File) {
    try {
      const res = await api.upload(file);
      pendingTicketAttachments.push(res.attachmentId);
      ui.addTicketAttachment(res.fileName);
    } catch {
      ui.setTicketResult("Não foi possível anexar o arquivo.");
    }
  }

  async function submitTicket(input: { subject: string; description: string }) {
    const description = input.description.trim();
    if (description.length < 3) {
      ui.setTicketResult("Descreva um pouco mais o que você precisa.");
      return;
    }
    const subject = input.subject.trim() || description.slice(0, 60);
    try {
      await api.openTicket({
        sessionId: sessionId ?? undefined,
        category: "suporte",
        subject,
        description,
        attachmentIds: pendingTicketAttachments,
      });
      pendingTicketAttachments = [];
      ui.clearTicketForm();
      ui.setTicketResult("Enviado ✓ A equipe vai responder por aqui.");
      await loadTickets();
      ui.switchTab("list");
      ui.lockComposer("Chamado aberto — inicie uma nova conversa se precisar.");
    } catch {
      ui.setTicketResult("Não foi possível enviar. Tente de novo.");
    }
  }

  function resetChat() {
    connected = false;
    sessionId = null;
    safeRemove(storageKey);
    if (polling) {
      clearInterval(polling);
      polling = null;
    }
    ui.reset();
    void connect();
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
function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
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
