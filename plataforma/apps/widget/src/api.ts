import type { WidgetConfig } from "./config";

// Cliente da API pública do widget. Cuida do envelope { ok, data | code,message },
// injeta a chave e o token (Bearer) e expõe os endpoints do Bloco 9.

export interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
}

export interface MessageItem {
  id: string;
  senderType: "user" | "ai" | "admin" | "system";
  content: string;
  createdAt: string;
  attachments?: AttachmentItem[];
}

export interface SessionResult {
  token: string;
  sessionId: string;
  chatId: string;
  user: { name: string | null; unknown: boolean };
  history: MessageItem[];
}

export interface SendResult {
  messageId: string;
  reply?: string;
  escalated: boolean;
  ticketId?: string;
}

export interface UploadResult {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export class WidgetApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class WidgetApi {
  private token: string | null = null;

  constructor(
    private cfg: WidgetConfig,
    private fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  setToken(token: string | null) {
    this.token = token;
  }

  private url(path: string): string {
    return `${this.cfg.apiBase}${path}`;
  }

  private authHeaders(json: boolean): Record<string, string> {
    const h: Record<string, string> = { "X-Synova-Key": this.cfg.apiKey };
    if (json) h["Content-Type"] = "application/json";
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private async unwrap<T>(res: Response): Promise<T> {
    let body: Envelope<T> | null = null;
    try {
      body = (await res.json()) as Envelope<T>;
    } catch {
      throw new WidgetApiError("Resposta inválida do servidor.", "bad_response", res.status);
    }
    if (body && body.ok) return body.data;
    const code = body && !body.ok ? body.code : "server_error";
    const message = body && !body.ok ? body.message : "Erro inesperado.";
    throw new WidgetApiError(message, code, res.status);
  }

  async startSession(input: {
    externalRef?: string;
    name?: string;
    email?: string;
    sessionId?: string;
  }): Promise<SessionResult> {
    const res = await this.fetchImpl(this.url("/api/widget/session"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    });
    const data = await this.unwrap<SessionResult>(res);
    this.token = data.token;
    return data;
  }

  async sendMessage(sessionId: string, content: string, attachmentIds?: string[]): Promise<SendResult> {
    const res = await this.fetchImpl(this.url("/api/widget/message"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify({ sessionId, content, attachmentIds }),
    });
    return this.unwrap<SendResult>(res);
  }

  async fetchHistory(sessionId: string, limit = 30): Promise<{ history: MessageItem[] }> {
    const res = await this.fetchImpl(
      this.url(`/api/widget/history?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`),
      { method: "GET", headers: this.authHeaders(false) },
    );
    return this.unwrap<{ history: MessageItem[] }>(res);
  }

  async openTicket(input: {
    sessionId?: string;
    category: string;
    subject: string;
    description: string;
    priority?: string;
    attachmentIds?: string[];
  }): Promise<{ ticketId: string; status: string; priority: string }> {
    const res = await this.fetchImpl(this.url("/api/widget/ticket"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify(input),
    });
    return this.unwrap<{ ticketId: string; status: string; priority: string }>(res);
  }

  async listTickets(): Promise<{ tickets: TicketItem[] }> {
    const res = await this.fetchImpl(this.url("/api/widget/tickets"), {
      method: "GET",
      headers: this.authHeaders(false),
    });
    return this.unwrap<{ tickets: TicketItem[] }>(res);
  }

  async getTicketThread(ticketId: string): Promise<{
    ticket: { id: string; subject: string; status: string; priority: string; csat: number | null };
    messages: MessageItem[];
  }> {
    const res = await this.fetchImpl(
      this.url(`/api/widget/ticket-thread?ticketId=${encodeURIComponent(ticketId)}`),
      { method: "GET", headers: this.authHeaders(false) },
    );
    return this.unwrap(res);
  }

  async rateTicket(
    ticketId: string,
    rating: number,
    comment?: string,
  ): Promise<{ csat: number; alreadyRated: boolean }> {
    const res = await this.fetchImpl(this.url("/api/widget/ticket-rating"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify({ ticketId, rating, comment }),
    });
    return this.unwrap<{ csat: number; alreadyRated: boolean }>(res);
  }

  async sendTicketMessage(
    ticketId: string,
    content: string,
    attachmentIds?: string[],
  ): Promise<{ message: MessageItem }> {
    const res = await this.fetchImpl(this.url("/api/widget/ticket-message"), {
      method: "POST",
      headers: this.authHeaders(true),
      body: JSON.stringify({ ticketId, content, attachmentIds }),
    });
    return this.unwrap<{ message: MessageItem }>(res);
  }

  async getUpdates(since: string): Promise<{ newAdminMessages: number }> {
    const res = await this.fetchImpl(
      this.url(`/api/widget/updates?since=${encodeURIComponent(since)}`),
      { method: "GET", headers: this.authHeaders(false) },
    );
    return this.unwrap<{ newAdminMessages: number }>(res);
  }

  async upload(file: File): Promise<UploadResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await this.fetchImpl(this.url("/api/widget/attachment"), {
      method: "POST",
      headers: this.authHeaders(false), // sem Content-Type: o browser define o boundary
      body: form,
    });
    return this.unwrap<UploadResult>(res);
  }
}
