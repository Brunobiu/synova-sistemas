import type { MessageItem } from "./api";
import type { WidgetConfig } from "./config";

// UI flutuante isolada em Shadow DOM (estilos não vazam nem sofrem do site host).

export interface UICallbacks {
  onOpen: () => void;
  onSend: (content: string) => void;
  onAttach: (file: File) => void;
  onOpenTicket: () => void;
}

const SENDER_CLASS: Record<string, string> = {
  user: "msg user",
  ai: "msg ai",
  admin: "msg admin",
  system: "msg system",
};

export class WidgetUI {
  private root!: ShadowRoot;
  private panel!: HTMLDivElement;
  private list!: HTMLDivElement;
  private input!: HTMLTextAreaElement;
  private statusEl!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private open = false;
  private seen = new Set<string>();

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
    this.input = this.root.querySelector("textarea")!;
    this.statusEl = this.root.querySelector(".status")!;
    this.fileInput = this.root.querySelector("input[type=file]")!;

    this.root.querySelector(".launcher")!.addEventListener("click", () => this.toggle());
    this.root.querySelector(".close")!.addEventListener("click", () => this.toggle());
    this.root.querySelector(".send")!.addEventListener("click", () => this.submit());
    this.root.querySelector(".ticket")!.addEventListener("click", () => this.cb.onOpenTicket());
    this.root.querySelector(".attach")!.addEventListener("click", () => this.fileInput.click());
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
  }

  private submit(): void {
    const content = this.input.value.trim();
    if (!content) return;
    this.input.value = "";
    this.cb.onSend(content);
  }

  toggle(): void {
    this.open = !this.open;
    this.panel.style.display = this.open ? "flex" : "none";
    if (this.open) {
      this.cb.onOpen();
      this.input.focus();
    }
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  addMessage(item: MessageItem): boolean {
    if (this.seen.has(item.id)) return false;
    this.seen.add(item.id);
    const el = document.createElement("div");
    el.className = SENDER_CLASS[item.senderType] ?? "msg system";
    el.textContent = item.content;
    this.list.appendChild(el);
    this.list.scrollTop = this.list.scrollHeight;
    return true;
  }

  addLocal(content: string, kind: "user" | "system"): void {
    const el = document.createElement("div");
    el.className = `msg ${kind}`;
    el.textContent = content;
    this.list.appendChild(el);
    this.list.scrollTop = this.list.scrollHeight;
  }

  renderHistory(items: MessageItem[]): void {
    this.list.innerHTML = "";
    this.seen.clear();
    for (const m of items) this.addMessage(m);
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
        .panel {
          position: fixed; right: 20px; bottom: 88px; width: 360px; max-width: calc(100vw - 40px);
          height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,.28); display: none; flex-direction: column;
          overflow: hidden; z-index: 2147483000;
        }
        .header { background: ${c}; color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .header .title { font-weight: 600; font-size: 15px; }
        .close { background: transparent; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .status { font-size: 11px; color: #6b7280; padding: 4px 14px; background: #f9fafb; }
        .messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f3f4f6; }
        .msg { max-width: 85%; padding: 8px 10px; border-radius: 10px; font-size: 14px; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
        .msg.user { align-self: flex-end; background: ${c}; color: #fff; border-bottom-right-radius: 2px; }
        .msg.ai, .msg.admin { align-self: flex-start; background: #fff; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
        .msg.system { align-self: center; background: #fef3c7; color: #92400e; font-size: 12px; }
        .composer { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #e5e7eb; align-items: flex-end; }
        textarea { flex: 1; resize: none; height: 40px; max-height: 90px; padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .icon-btn, .send { border: none; border-radius: 8px; cursor: pointer; padding: 9px 10px; }
        .attach { background: #e5e7eb; color: #374151; }
        .send { background: ${c}; color: #fff; }
        .ticket { text-align: center; font-size: 12px; color: ${c}; cursor: pointer; padding: 6px; text-decoration: underline; background: #fff; border: none; }
        input[type=file] { display: none; }
      </style>
      <button class="launcher" aria-label="Abrir suporte">&#128172;</button>
      <div class="panel" role="dialog" aria-label="Suporte">
        <div class="header">
          <span class="title">${escapeHtml(this.cfg.title)}</span>
          <button class="close" aria-label="Fechar">&times;</button>
        </div>
        <div class="status">Conectando...</div>
        <div class="messages"></div>
        <button class="ticket">Abrir chamado</button>
        <div class="composer">
          <button class="icon-btn attach" aria-label="Anexar">&#128206;</button>
          <textarea placeholder="Escreva sua mensagem..."></textarea>
          <button class="send" aria-label="Enviar">&#10148;</button>
          <input type="file" />
        </div>
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
