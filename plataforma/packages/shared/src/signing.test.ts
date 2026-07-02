import { describe, it, expect } from "vitest";
import { signWidgetToken, verifyWidgetToken } from "./signing";

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
