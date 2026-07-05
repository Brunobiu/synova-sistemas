import { describe, it, expect } from "vitest";
import { WidgetApi, WidgetApiError } from "./api";
import type { WidgetConfig } from "./config";

const cfg: WidgetConfig = {
  apiBase: "https://plat.example.com",
  apiKey: "pk_test",
  title: "Suporte",
  color: "#000",
};

interface Call {
  url: string;
  init: RequestInit;
}

function mockFetch(responder: (call: Call) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  const impl = (async (url: unknown, init: unknown) => {
    const call = { url: String(url), init: (init ?? {}) as RequestInit };
    calls.push(call);
    const { status, body } = responder(call);
    return { status, json: async () => body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("WidgetApi", () => {
  it("startSession envia a chave, desembrulha os dados e guarda o token", async () => {
    const { impl, calls } = mockFetch(() => ({
      status: 200,
      body: {
        ok: true,
        data: {
          token: "tok_123",
          sessionId: "sess",
          chatId: "chat",
          user: { name: "Bruno", unknown: false },
          history: [],
        },
      },
    }));
    const api = new WidgetApi(cfg, impl);
    const res = await api.startSession({ externalRef: "9" });
    expect(res.sessionId).toBe("sess");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["X-Synova-Key"]).toBe("pk_test");
    expect(calls[0].url).toBe("https://plat.example.com/api/widget/session");
  });

  it("depois da sessão, envia o token Bearer nas próximas chamadas", async () => {
    const { impl, calls } = mockFetch((call) => {
      if (call.url.endsWith("/session")) {
        return { status: 200, body: { ok: true, data: { token: "tok_abc", sessionId: "s", chatId: "c", user: { name: null, unknown: true }, history: [] } } };
      }
      return { status: 200, body: { ok: true, data: { messageId: "m1", escalated: false } } };
    });
    const api = new WidgetApi(cfg, impl);
    await api.startSession({});
    const res = await api.sendMessage("s", "olá");
    expect(res.messageId).toBe("m1");
    const msgHeaders = calls[1].init.headers as Record<string, string>;
    expect(msgHeaders["Authorization"]).toBe("Bearer tok_abc");
  });

  it("lança WidgetApiError quando o envelope indica erro", async () => {
    const { impl } = mockFetch(() => ({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "Token inválido." },
    }));
    const api = new WidgetApi(cfg, impl);
    await expect(api.sendMessage("s", "x")).rejects.toBeInstanceOf(WidgetApiError);
  });

  it("fetchHistory monta a query escopada por sessão", async () => {
    const { impl, calls } = mockFetch(() => ({ status: 200, body: { ok: true, data: { history: [] } } }));
    const api = new WidgetApi(cfg, impl);
    await api.fetchHistory("sess-1", 10);
    expect(calls[0].url).toContain("/api/widget/history?sessionId=sess-1&limit=10");
  });
});
