import type { AttachmentItem, MessageItem, TicketItem } from "./api";
import type { WidgetConfig } from "./config";

// UI flutuante isolada em Shadow DOM (estilos não vazam nem sofrem do site host).

export interface UICallbacks {
  onOpen: () => void;
  onSend: (content: string) => void;
  onAttach: (file: File) => void;
  onOpenTicket: () => void;
  onNewChat: () => void;
  onSubmitTicket: (input: { subject: string; description: string }) => void;
  onAttachTicket: (file: File) => void;
  onOpenThread: (ticketId: string) => void;
  onSendThreadMessage: (content: string) => void;
  onCloseThread: () => void;
  onRateTicket: (rating: number) => void;
}

/** Dados mínimos do ticket usados para decidir a avaliação (CSAT). */
export interface ThreadTicket {
  status: string;
  csat: number | null;
}

const SENDER_CLASS: Record<string, string> = {
  user: "msg user",
  ai: "msg ai",
  admin: "msg admin",
  system: "msg system",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  escalated: "Escalado",
  waiting_customer: "Aguardando você",
  resolved: "Resolvido",
  closed: "Fechado",
};

export class WidgetUI {
  private root!: ShadowRoot;
  private panel!: HTMLDivElement;
  private list!: HTMLDivElement;
  private input!: HTMLTextAreaElement;
  private statusEl!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private attachBtn!: HTMLButtonElement;
  private modal!: HTMLDivElement;
  private ticketFile!: HTMLInputElement;
  private threadMessages!: HTMLDivElement;
  private threadInput!: HTMLTextAreaElement;
  private open = false;
  private seen = new Set<string>();
  private threadSeen = new Set<string>();
  private lastRatingKey = "";

  constructor(
    private cfg: WidgetConfig,
    private cb: UICallbacks,
  ) {}

  mount(): void {
    const host = document.createElement("div");
    host.id = "synova-widget-root";
    document.body.appendChild(host);
    this.root = host.attachShadow({ mode: "open" });
    this.root.innerHTML = this.template();

    this.panel = this.root.querySelector(".panel")!;
    this.list = this.root.querySelector(".messages")!;
    this.input = this.root.querySelector("textarea.composer-input")!;
    this.statusEl = this.root.querySelector(".status")!;
    this.fileInput = this.root.querySelector("input.chat-file")!;
    this.sendBtn = this.root.querySelector(".send")!;
    this.attachBtn = this.root.querySelector(".attach")!;
    this.modal = this.root.querySelector(".modal")!;
    this.ticketFile = this.root.querySelector("input.t-file")!;
    this.threadMessages = this.root.querySelector(".thread-messages")!;
    this.threadInput = this.root.querySelector("textarea.thread-input")!;

    this.root.querySelector(".launcher")!.addEventListener("click", () => this.toggle());
    this.root.querySelector(".close")!.addEventListener("click", () => this.toggle());
    this.sendBtn.addEventListener("click", () => this.submit());
    this.attachBtn.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => {
      const f = this.fileInput.files?.[0];
      if (f) this.cb.onAttach(f);
      this.fileInput.value = "";
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    // Modal de chamados
    this.root.querySelector(".modal-close")!.addEventListener("click", () => this.closeTicketModal());
    this.root.querySelectorAll(".tab").forEach((t) =>
      t.addEventListener("click", () =>
        this.switchTab((t as HTMLElement).dataset.tab === "list" ? "list" : "new"),
      ),
    );
    this.root.querySelector(".t-attach")!.addEventListener("click", () => this.ticketFile.click());
    this.ticketFile.addEventListener("change", () => {
      const f = this.ticketFile.files?.[0];
      if (f) this.cb.onAttachTicket(f);
      this.ticketFile.value = "";
    });
    this.root.querySelector(".t-submit")!.addEventListener("click", () => {
      const subject = (this.root.querySelector(".t-subject") as HTMLInputElement).value.trim();
      const description = (this.root.querySelector(".t-desc") as HTMLTextAreaElement).value.trim();
      this.cb.onSubmitTicket({ subject, description });
    });

    // Thread do ticket
    this.root.querySelector(".thread-back")!.addEventListener("click", () => this.backToList());
    this.root.querySelector(".thread-send")!.addEventListener("click", () => this.submitThread());
    this.threadInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.submitThread();
      }
    });
  }

  private submit(): void {
    const content = this.input.value.trim();
    if (!content || this.input.disabled) return;
    this.input.value = "";
    this.cb.onSend(content);
  }

  private submitThread(): void {
    const content = this.threadInput.value.trim();
    if (!content) return;
    this.threadInput.value = "";
    this.cb.onSendThreadMessage(content);
  }

  toggle(): void {
    this.open = !this.open;
    this.panel.style.display = this.open ? "flex" : "none";
    if (this.open) {
      this.cb.onOpen();
      if (!this.input.disabled) this.input.focus();
    }
  }

  isOpen(): boolean {
    return this.open;
  }

  setStatus(text: string, connected = false): void {
    const dot = this.statusEl.querySelector(".dot") as HTMLElement | null;
    const label = this.statusEl.querySelector(".status-text") as HTMLElement | null;
    if (label) label.textContent = text;
    if (dot) dot.classList.toggle("on", connected);
  }

  /** Badge de notificação no botão flutuante (respostas do atendente não vistas). */
  setUnread(count: number): void {
    const launcher = this.root.querySelector(".launcher") as HTMLElement;
    const badge = this.root.querySelector(".badge") as HTMLElement;
    if (count > 0) {
      launcher.classList.add("has-unread");
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.style.display = "";
    } else {
      launcher.classList.remove("has-unread");
      badge.style.display = "none";
    }
  }

  addMessage(item: MessageItem): boolean {
    if (this.seen.has(item.id)) return false;
    this.seen.add(item.id);
    this.list.appendChild(this.buildMessageEl(item));
    this.scrollDown(this.list);
    return true;
  }

  /** Monta a bolha da mensagem: texto + anexos (imagem inline / link de arquivo). */
  private buildMessageEl(item: MessageItem): HTMLDivElement {
    const el = document.createElement("div");
    el.className = SENDER_CLASS[item.senderType] ?? "msg system";
    if (item.content) el.appendChild(document.createTextNode(item.content));
    for (const att of item.attachments ?? []) this.appendAttachment(el, att);
    return el;
  }

  private appendAttachment(parent: HTMLElement, att: AttachmentItem): void {
    if (!att.url) return;
    if (att.mimeType.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "msg-img";
      img.src = att.url;
      img.alt = att.fileName;
      img.loading = "lazy";
      img.addEventListener("click", () => window.open(att.url, "_blank", "noopener"));
      parent.appendChild(img);
    } else {
      const link = document.createElement("a");
      link.className = "msg-file";
      link.href = att.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = `\uD83D\uDCCE ${att.fileName}`;
      parent.appendChild(link);
    }
  }

  addLocal(content: string, kind: "user" | "system"): void {
    const el = document.createElement("div");
    el.className = `msg ${kind}`;
    el.textContent = content;
    this.list.appendChild(el);
    this.scrollDown(this.list);
  }

  renderHistory(items: MessageItem[]): void {
    this.list.innerHTML = "";
    this.seen.clear();
    for (const m of items) this.addMessage(m);
  }

  showTicketAction(): void {
    if (this.list.querySelector(".action-ticket")) return;
    const btn = document.createElement("button");
    btn.className = "action-ticket";
    btn.textContent = "Abrir chamado";
    btn.addEventListener("click", () => this.cb.onOpenTicket());
    this.list.appendChild(btn);
    this.scrollDown(this.list);
  }

  lockComposer(message: string): void {
    this.input.disabled = true;
    this.input.value = "";
    this.input.placeholder = message;
    this.sendBtn.disabled = true;
    this.attachBtn.disabled = true;
    if (!this.list.querySelector(".action-newchat")) {
      const btn = document.createElement("button");
      btn.className = "action-newchat";
      btn.textContent = "Iniciar nova conversa";
      btn.addEventListener("click", () => this.cb.onNewChat());
      this.list.appendChild(btn);
      this.scrollDown(this.list);
    }
  }

  reset(): void {
    this.list.innerHTML = "";
    this.seen.clear();
    this.input.disabled = false;
    this.input.placeholder = "Escreva sua mensagem...";
    this.sendBtn.disabled = false;
    this.attachBtn.disabled = false;
  }

  // --- Modal de chamados ---

  openTicketModal(): void {
    this.modal.style.display = "flex";
    this.backToList();
    this.switchTab("new");
  }

  closeTicketModal(): void {
    this.modal.style.display = "none";
    this.cb.onCloseThread();
  }

  switchTab(tab: "new" | "list"): void {
    (this.root.querySelector(".panel-new") as HTMLElement).style.display = tab === "new" ? "flex" : "none";
    (this.root.querySelector(".panel-list") as HTMLElement).style.display = tab === "list" ? "block" : "none";
    this.root.querySelectorAll(".tab").forEach((t) => {
      const el = t as HTMLElement;
      el.classList.toggle("active", el.dataset.tab === tab);
    });
  }

  addTicketAttachment(name: string): void {
    const box = this.root.querySelector(".t-attachments") as HTMLElement;
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `📎 ${name}`;
    box.appendChild(chip);
  }

  clearTicketForm(): void {
    (this.root.querySelector(".t-subject") as HTMLInputElement).value = "";
    (this.root.querySelector(".t-desc") as HTMLTextAreaElement).value = "";
    (this.root.querySelector(".t-attachments") as HTMLElement).innerHTML = "";
  }

  setTicketResult(message: string): void {
    (this.root.querySelector(".t-result") as HTMLElement).textContent = message;
  }

  renderTickets(tickets: TicketItem[]): void {
    const box = this.root.querySelector(".tickets") as HTMLElement;
    if (!tickets.length) {
      box.innerHTML = `<p class="empty">Você ainda não abriu nenhum chamado.</p>`;
      return;
    }
    box.innerHTML = "";
    for (const t of tickets) {
      const row = document.createElement("div");
      row.className = "ticket-row";
      const date = new Date(t.createdAt).toLocaleDateString("pt-BR");
      row.innerHTML = `
        <div class="ticket-subject"></div>
        <div class="ticket-meta"><span class="ticket-status s-${t.status}"></span><span class="ticket-date"></span></div>`;
      (row.querySelector(".ticket-subject") as HTMLElement).textContent = t.subject;
      (row.querySelector(".ticket-status") as HTMLElement).textContent = STATUS_LABEL[t.status] ?? t.status;
      (row.querySelector(".ticket-date") as HTMLElement).textContent = date;
      row.addEventListener("click", () => this.cb.onOpenThread(t.id));
      box.appendChild(row);
    }
  }

  // --- Thread do ticket ---

  openThreadView(subject: string): void {
    (this.root.querySelector(".tabs") as HTMLElement).style.display = "none";
    (this.root.querySelector(".tab-content") as HTMLElement).style.display = "none";
    (this.root.querySelector(".thread") as HTMLElement).style.display = "flex";
    (this.root.querySelector(".thread-title") as HTMLElement).textContent = subject;
    this.threadMessages.innerHTML = "";
    this.threadSeen.clear();
    this.lastRatingKey = "";
    const rating = this.root.querySelector(".thread-rating") as HTMLElement;
    rating.style.display = "none";
    rating.innerHTML = "";
  }

  backToList(): void {
    (this.root.querySelector(".thread") as HTMLElement).style.display = "none";
    (this.root.querySelector(".tabs") as HTMLElement).style.display = "flex";
    (this.root.querySelector(".tab-content") as HTMLElement).style.display = "block";
    this.cb.onCloseThread();
  }

  renderThreadMessages(items: MessageItem[]): void {
    this.threadMessages.innerHTML = "";
    this.threadSeen.clear();
    for (const m of items) this.addThreadMessage(m);
  }

  addThreadMessage(item: MessageItem): boolean {
    if (this.threadSeen.has(item.id)) return false;
    this.threadSeen.add(item.id);
    this.threadMessages.appendChild(this.buildMessageEl(item));
    this.scrollDown(this.threadMessages);
    return true;
  }

  /**
   * Avaliação (CSAT): só aparece quando o chamado está resolvido/fechado.
   * Mostra estrelas clicáveis se ainda não avaliado, ou um agradecimento se já.
   */
  renderThreadRating(ticket: ThreadTicket): void {
    const box = this.root.querySelector(".thread-rating") as HTMLElement;
    const resolved = ticket.status === "resolved" || ticket.status === "closed";
    const key = `${resolved}:${ticket.csat ?? ""}`;
    if (key === this.lastRatingKey) return; // evita re-render (flicker) no polling
    this.lastRatingKey = key;

    box.innerHTML = "";
    if (!resolved) {
      box.style.display = "none";
      return;
    }
    box.style.display = "block";

    if (ticket.csat != null) {
      const thanks = document.createElement("div");
      thanks.className = "rating-thanks";
      thanks.textContent = `Obrigado pela avaliação: ${"★".repeat(ticket.csat)}${"☆".repeat(5 - ticket.csat)}`;
      box.appendChild(thanks);
      return;
    }

    const label = document.createElement("div");
    label.className = "rating-label";
    label.textContent = "Como foi o atendimento?";
    box.appendChild(label);

    const stars = document.createElement("div");
    stars.className = "rating-stars";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star";
      btn.textContent = "★";
      btn.setAttribute("aria-label", `${i} de 5`);
      btn.addEventListener("mouseenter", () => this.highlightStars(stars, i));
      btn.addEventListener("mouseleave", () => this.highlightStars(stars, 0));
      btn.addEventListener("click", () => this.cb.onRateTicket(i));
      stars.appendChild(btn);
    }
    box.appendChild(stars);
  }

  private highlightStars(container: HTMLElement, upTo: number): void {
    container.querySelectorAll(".star").forEach((s, idx) => {
      (s as HTMLElement).classList.toggle("on", idx < upTo);
    });
  }

  private scrollDown(el: HTMLElement): void {
    el.scrollTop = el.scrollHeight;
  }

  private template(): string {
    const c = this.cfg.color;
    return `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .launcher {
          position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px;
          border-radius: 50%; background: ${c}; color: #fff; border: none; cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,.25); font-size: 24px; z-index: 2147483000;
        }
        .launcher.has-unread { background: #dc2626; }
        .badge {
          position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 4px;
          background: #dc2626; color: #fff; border: 2px solid #fff; border-radius: 999px;
          font-size: 11px; line-height: 16px; font-weight: 700;
        }
        .panel {
          position: fixed; right: 20px; bottom: 88px; width: 360px; max-width: calc(100vw - 40px);
          height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,.28); display: none; flex-direction: column;
          overflow: hidden; z-index: 2147483000;
        }
        .header { background: ${c}; color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .header .title { font-weight: 600; font-size: 15px; }
        .close, .modal-close { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .status { font-size: 11px; color: #6b7280; padding: 4px 14px; background: #f9fafb; display: flex; align-items: center; gap: 6px; }
        .status .dot { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; flex: none; }
        .status .dot.on { background: #22c55e; }
        .messages, .thread-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f3f4f6; }
        .msg { max-width: 85%; padding: 8px 10px; border-radius: 10px; font-size: 14px; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
        .msg.user { align-self: flex-end; background: ${c}; color: #fff; border-bottom-right-radius: 2px; }
        .msg.ai, .msg.admin { align-self: flex-start; background: #fff; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
        .msg.system { align-self: center; background: #fef3c7; color: #92400e; font-size: 12px; }
        .msg-img { display: block; max-width: 100%; margin-top: 6px; border-radius: 8px; cursor: pointer; }
        .msg-file { display: inline-block; margin-top: 6px; font-size: 13px; text-decoration: underline; word-break: break-all; }
        .action-ticket, .action-newchat {
          align-self: center; margin: 2px 0; border: none; border-radius: 8px; cursor: pointer;
          padding: 8px 14px; font-size: 13px; font-weight: 600;
        }
        .action-ticket { background: ${c}; color: #fff; }
        .action-newchat { background: #e5e7eb; color: #374151; }
        .composer { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #e5e7eb; align-items: flex-end; }
        textarea { resize: none; padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; }
        .composer-input, .thread-input { flex: 1; height: 40px; max-height: 90px; }
        .composer-input:disabled { background: #f3f4f6; color: #9ca3af; }
        .icon-btn, .send, .thread-send { border: none; border-radius: 8px; cursor: pointer; padding: 9px 10px; }
        .icon-btn:disabled, .send:disabled { opacity: .5; cursor: not-allowed; }
        .attach { background: #e5e7eb; color: #374151; }
        .send, .thread-send { background: ${c}; color: #fff; }
        input[type=file] { display: none; }

        /* Modal de chamados: cobre o painel inteiro */
        .modal { position: absolute; inset: 0; background: #fff; display: none; flex-direction: column; z-index: 5; }
        .modal-header { background: ${c}; color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 15px; }
        .tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
        .tab { flex: 1; padding: 10px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #6b7280; border-bottom: 2px solid transparent; }
        .tab.active { color: #111827; font-weight: 600; border-bottom-color: ${c}; }
        .tab-content { flex: 1; overflow-y: auto; padding: 12px; }
        .panel-new { display: flex; flex-direction: column; gap: 8px; height: 100%; }
        .t-subject { padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .t-desc { flex: 1; min-height: 120px; }
        .t-attachments { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: #eef2ff; color: #3730a3; font-size: 11px; padding: 3px 8px; border-radius: 999px; }
        .modal-actions { display: flex; gap: 6px; }
        .t-attach { background: #e5e7eb; color: #374151; border: none; border-radius: 8px; padding: 9px 10px; cursor: pointer; }
        .t-submit { flex: 1; background: ${c}; color: #fff; border: none; border-radius: 8px; padding: 9px 10px; cursor: pointer; font-weight: 600; }
        .t-result { font-size: 12px; color: #059669; min-height: 16px; }
        .ticket-row { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; margin-bottom: 8px; cursor: pointer; }
        .ticket-row:hover { border-color: ${c}; }
        .ticket-subject { font-size: 14px; color: #111827; margin-bottom: 4px; word-break: break-word; }
        .ticket-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
        .ticket-status { padding: 2px 8px; border-radius: 999px; background: #e5e7eb; color: #374151; }
        .ticket-status.s-resolved, .ticket-status.s-closed { background: #dcfce7; color: #166534; }
        .ticket-status.s-escalated, .ticket-status.s-open { background: #fef3c7; color: #92400e; }
        .ticket-date { color: #9ca3af; }
        .empty { color: #6b7280; font-size: 13px; text-align: center; margin-top: 20px; }

        /* Thread do ticket */
        .thread { position: absolute; inset: 0; top: 47px; background: #fff; display: none; flex-direction: column; }
        .thread-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .thread-back { border: none; background: #e5e7eb; color: #374151; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 16px; }
        .thread-title { font-size: 13px; font-weight: 600; color: #111827; word-break: break-word; }
        .thread-composer { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #e5e7eb; align-items: flex-end; }
        .thread-rating { padding: 8px 12px; border-top: 1px solid #e5e7eb; background: #fff; text-align: center; }
        .rating-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .rating-stars { display: flex; justify-content: center; gap: 4px; }
        .rating-stars .star { border: none; background: transparent; cursor: pointer; font-size: 22px; line-height: 1; color: #d1d5db; padding: 0; }
        .rating-stars .star.on { color: #f59e0b; }
        .rating-thanks { font-size: 12px; color: #059669; }
      </style>
      <button class="launcher" aria-label="Abrir suporte">&#128172;<span class="badge" style="display:none">0</span></button>
      <div class="panel" role="dialog" aria-label="Suporte">
        <div class="header">
          <span class="title">${escapeHtml(this.cfg.title)}</span>
          <button class="close" aria-label="Fechar">&times;</button>
        </div>
        <div class="status"><span class="dot"></span><span class="status-text">Conectando...</span></div>
        <div class="messages"></div>
        <div class="composer">
          <button class="icon-btn attach" aria-label="Anexar">&#128206;</button>
          <textarea class="composer-input" placeholder="Escreva sua mensagem..."></textarea>
          <button class="send" aria-label="Enviar">&#10148;</button>
          <input type="file" class="chat-file" />
        </div>

        <div class="modal" role="dialog" aria-label="Chamados">
          <div class="modal-header">
            <span>Chamados</span>
            <button class="modal-close" aria-label="Fechar">&times;</button>
          </div>
          <div class="tabs">
            <button class="tab active" data-tab="new">Novo chamado</button>
            <button class="tab" data-tab="list">Meus chamados</button>
          </div>
          <div class="tab-content">
            <div class="panel-new">
              <input class="t-subject" placeholder="Assunto (ex.: erro ao emitir nota)" />
              <textarea class="t-desc" placeholder="Descreva o que você precisa. Você pode anexar imagens."></textarea>
              <div class="t-attachments"></div>
              <div class="modal-actions">
                <button class="t-attach" aria-label="Anexar">&#128206; Anexar</button>
                <button class="t-submit">Enviar chamado</button>
              </div>
              <div class="t-result"></div>
              <input type="file" class="t-file" />
            </div>
            <div class="panel-list" style="display:none">
              <div class="tickets"></div>
            </div>
          </div>
          <div class="thread">
            <div class="thread-head">
              <button class="thread-back" aria-label="Voltar">&#8592;</button>
              <span class="thread-title"></span>
            </div>
            <div class="thread-messages"></div>
            <div class="thread-rating" style="display:none"></div>
            <div class="thread-composer">
              <textarea class="thread-input" placeholder="Responder..."></textarea>
              <button class="thread-send" aria-label="Enviar">&#10148;</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] as string,
  );
}
