import { describe, it, expect } from "vitest";
import { signWidgetToken, RateLimiter } from "@synova/shared";
import { guardWidgetRequest } from "./edge";
import type { SystemAuth } from "./systems";

// Verificação de compatibilidade/isolamento: a chave/segredo de um sistema NUNCA
// pode ser aceita por outro (nenhuma integração interfere na outra) — R8/R23.

const SYS_A = "11111111-1111-4111-8111-111111111111";
const SYS_B = "22222222-2222-4222-8222-222222222222";
const ORIGIN = "https://cliente.com";

function systemB(): SystemAuth {
  return {
    systemId: SYS_B,
    status: "active",
    allowedOrigins: [ORIGIN],
    secret: "segredo-do-sistema-B",
    previousSecret: null,
    secretRotatedAt: null,
  };
}

function deps() {
  return {
    resolveSystem: async () => systemB(),
    rateLimiter: new RateLimiter(),
    rateLimit: { limit: 1000, windowMs: 60_000 },
  };
}

describe("isolamento entre chaves de sistemas", () => {
  it("rejeita token legítimo do sistema A quando a chave resolve o sistema B (assinatura não bate)", async () => {
    const tokenA = signWidgetToken({ systemId: SYS_A, tenantId: SYS_A }, "segredo-do-sistema-A");
    const res = await guardWidgetRequest(
      { apiKey: "pk_B", origin: ORIGIN, token: tokenA, ip: "1.1.1.1" },
      deps(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401); // segredo de A não valida no sistema B
  });

  it("rejeita token forjado com o systemId de B mas assinado com o segredo de A", async () => {
    const forged = signWidgetToken({ systemId: SYS_B, tenantId: SYS_B }, "segredo-do-sistema-A");
    const res = await guardWidgetRequest(
      { apiKey: "pk_B", origin: ORIGIN, token: forged, ip: "1.1.1.1" },
      deps(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("rejeita token válido (segredo de B) mas com systemId divergente — rede de proteção de escopo (403)", async () => {
    const wrongScope = signWidgetToken({ systemId: SYS_A, tenantId: SYS_A }, "segredo-do-sistema-B");
    const res = await guardWidgetRequest(
      { apiKey: "pk_B", origin: ORIGIN, token: wrongScope, ip: "1.1.1.1" },
      deps(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
  });

  it("aceita token legítimo do próprio sistema B", async () => {
    const tokenB = signWidgetToken({ systemId: SYS_B, tenantId: SYS_B }, "segredo-do-sistema-B");
    const res = await guardWidgetRequest(
      { apiKey: "pk_B", origin: ORIGIN, token: tokenB, ip: "1.1.1.1" },
      deps(),
    );
    expect(res.ok).toBe(true);
  });
});
