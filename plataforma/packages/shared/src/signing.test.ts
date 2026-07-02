import { describe, it, expect } from "vitest";
import { signWidgetToken, verifyWidgetToken, verifyWidgetTokenRotating } from "./signing";

const SECRET = "segredo-super-secreto-de-teste";
const scope = {
  systemId: "sys-1",
  tenantId: "ten-1",
  userId: "usr-1",
  externalRef: "9",
};

describe("token do widget (HMAC)", () => {
  it("assina e verifica um token válido, preservando o escopo", () => {
    const token = signWidgetToken(scope, SECRET);
    const result = verifyWidgetToken(token, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.scope.systemId).toBe("sys-1");
      expect(result.scope.tenantId).toBe("ten-1");
      expect(result.scope.userId).toBe("usr-1");
      expect(result.scope.externalRef).toBe("9");
    }
  });

  it("rejeita assinatura adulterada", () => {
    const token = signWidgetToken(scope, SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
    expect(verifyWidgetToken(tampered, SECRET).valid).toBe(false);
  });

  it("rejeita segredo errado", () => {
    const token = signWidgetToken(scope, SECRET);
    expect(verifyWidgetToken(token, "outro-segredo")).toEqual({
      valid: false,
      reason: "bad_signature",
    });
  });

  it("rejeita token expirado", () => {
    const token = signWidgetToken(scope, SECRET, -10);
    expect(verifyWidgetToken(token, SECRET)).toEqual({
      valid: false,
      reason: "expired",
    });
  });

  it("rejeita token malformado", () => {
    expect(verifyWidgetToken("abc", SECRET).valid).toBe(false);
    expect(verifyWidgetToken("", SECRET).valid).toBe(false);
  });
});

describe("verifyWidgetTokenRotating (convivência de segredo)", () => {
  const NEW_SECRET = "segredo-novo-apos-rotacao";
  const nowSec = () => Math.floor(Date.now() / 1000);

  it("aceita token assinado com o segredo atual", () => {
    const token = signWidgetToken(scope, NEW_SECRET);
    const r = verifyWidgetTokenRotating(token, NEW_SECRET, {
      previousSecret: SECRET,
      secretRotatedAt: nowSec(),
    });
    expect(r.valid).toBe(true);
  });

  it("aceita token do segredo anterior dentro da janela de convivência", () => {
    const oldToken = signWidgetToken(scope, SECRET);
    const r = verifyWidgetTokenRotating(oldToken, NEW_SECRET, {
      previousSecret: SECRET,
      secretRotatedAt: nowSec(),
      graceSeconds: 3600,
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.scope.systemId).toBe("sys-1");
  });

  it("rejeita token do segredo anterior depois da janela", () => {
    const oldToken = signWidgetToken(scope, SECRET);
    const r = verifyWidgetTokenRotating(oldToken, NEW_SECRET, {
      previousSecret: SECRET,
      secretRotatedAt: nowSec() - 7200, // rotacionou há 2h
      graceSeconds: 3600, // janela de 1h já passou
    });
    expect(r.valid).toBe(false);
  });

  it("rejeita quando não há segredo anterior e a assinatura não bate", () => {
    const oldToken = signWidgetToken(scope, SECRET);
    const r = verifyWidgetTokenRotating(oldToken, NEW_SECRET, { previousSecret: null });
    expect(r).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("não tenta o segredo anterior se o token está expirado (resultado terminal)", () => {
    const expired = signWidgetToken(scope, NEW_SECRET, -10);
    const r = verifyWidgetTokenRotating(expired, NEW_SECRET, {
      previousSecret: SECRET,
      secretRotatedAt: nowSec(),
    });
    expect(r).toEqual({ valid: false, reason: "expired" });
  });
});
