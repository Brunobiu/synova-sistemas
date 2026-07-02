import { describe, it, expect } from "vitest";
import { signWidgetToken, RateLimiter } from "@synova/shared";
import { guardWidgetRequest, type WidgetGuardDeps } from "./edge";
import type { SystemAuth } from "./systems";

const SYSTEM_ID = "550e8400-e29b-41d4-a716-446655440000";
const TENANT_ID = "123e4567-e89b-42d3-a456-556642440000";
const SECRET = "segredo-do-sistema-de-teste";
const ORIGIN = "https://app.cliente.com";

function makeSystem(overrides: Partial<SystemAuth> = {}): SystemAuth {
  return {
    systemId: SYSTEM_ID,
    status: "active",
    allowedOrigins: [ORIGIN],
    secret: SECRET,
    previousSecret: null,
    secretRotatedAt: null,
    ...overrides,
  };
}

function deps(system: SystemAuth | null, extra: Partial<WidgetGuardDeps> = {}): WidgetGuardDeps {
  return {
    resolveSystem: async () => system,
    rateLimiter: new RateLimiter(),
    rateLimit: { limit: 1000, windowMs: 60_000 },
    ...extra,
  };
}

function validToken(secret = SECRET, systemId = SYSTEM_ID) {
  return signWidgetToken({ systemId, tenantId: TENANT_ID, externalRef: "9" }, secret);
}

const baseInput = () => ({
  apiKey: "pk_valida",
  origin: ORIGIN,
  token: validToken(),
  ip: "1.2.3.4",
});

describe("guardWidgetRequest", () => {
  it("libera requisição válida e devolve escopo + cabeçalhos CORS", async () => {
    const res = await guardWidgetRequest(baseInput(), deps(makeSystem()));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.scope.systemId).toBe(SYSTEM_ID);
      expect(res.scope.externalRef).toBe("9");
      expect(res.headers["Access-Control-Allow-Origin"]).toBe(ORIGIN);
    }
  });

  it("nega sem chave (401)", async () => {
    const res = await guardWidgetRequest({ ...baseInput(), apiKey: null }, deps(makeSystem()));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("nega chave inexistente (401)", async () => {
    const res = await guardWidgetRequest(baseInput(), deps(null));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("nega sistema inativo (403)", async () => {
    const res = await guardWidgetRequest(baseInput(), deps(makeSystem({ status: "archived" })));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
  });

  it("nega origem não permitida (403) e não devolve cabeçalhos CORS", async () => {
    const res = await guardWidgetRequest(
      { ...baseInput(), origin: "https://evil.com" },
      deps(makeSystem()),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(403);
      expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    }
  });

  it("nega token ausente (401)", async () => {
    const res = await guardWidgetRequest({ ...baseInput(), token: null }, deps(makeSystem()));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("nega token assinado com segredo errado (401)", async () => {
    const res = await guardWidgetRequest(
      { ...baseInput(), token: validToken("segredo-errado") },
      deps(makeSystem()),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("nega token de outro sistema (403)", async () => {
    const otherSystemToken = validToken(SECRET, "999e8400-e29b-41d4-a716-446655440999");
    const res = await guardWidgetRequest(
      { ...baseInput(), token: otherSystemToken },
      deps(makeSystem()),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
  });

  it("nega token expirado com mensagem de sessão expirada (401)", async () => {
    const expired = signWidgetToken({ systemId: SYSTEM_ID, tenantId: TENANT_ID }, SECRET, -10);
    const res = await guardWidgetRequest({ ...baseInput(), token: expired }, deps(makeSystem()));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Sessão expirada.");
    }
  });

  it("aceita token do segredo anterior dentro da janela de convivência", async () => {
    const NEW_SECRET = "segredo-novo";
    const oldToken = validToken(SECRET); // assinado com o segredo antigo
    const system = makeSystem({
      secret: NEW_SECRET,
      previousSecret: SECRET,
      secretRotatedAt: Math.floor(Date.now() / 1000),
    });
    const res = await guardWidgetRequest({ ...baseInput(), token: oldToken }, deps(system));
    expect(res.ok).toBe(true);
  });

  it("bloqueia quando o rate limit estoura (429 + Retry-After)", async () => {
    const shared = deps(makeSystem(), {
      rateLimiter: new RateLimiter(() => 1000),
      rateLimit: { limit: 2, windowMs: 60_000 },
    });
    await guardWidgetRequest(baseInput(), shared); // 1
    await guardWidgetRequest(baseInput(), shared); // 2
    const third = await guardWidgetRequest(baseInput(), shared); // 3 → bloqueia
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.status).toBe(429);
      expect(third.headers["Retry-After"]).toBeDefined();
    }
  });
});
