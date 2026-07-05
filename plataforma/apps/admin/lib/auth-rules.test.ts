import { describe, it, expect } from "vitest";
import { isProtectedPath, decideAccess } from "./auth-rules";

describe("isProtectedPath", () => {
  it("protege /erp, /meu-atendimento e /api/admin (e subrotas)", () => {
    expect(isProtectedPath("/erp")).toBe(true);
    expect(isProtectedPath("/erp/sistemas")).toBe(true);
    expect(isProtectedPath("/meu-atendimento")).toBe(true);
    expect(isProtectedPath("/meu-atendimento/chats/123")).toBe(true);
    expect(isProtectedPath("/api/admin/users")).toBe(true);
  });

  it("não protege rotas públicas", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/api/widget/message")).toBe(false);
    expect(isProtectedPath("/erpzinho")).toBe(false); // não é subrota de /erp
  });
});

describe("decideAccess", () => {
  it("redireciona para login em rota protegida sem usuário", () => {
    expect(decideAccess("/erp", false)).toBe("redirect-login");
    expect(decideAccess("/meu-atendimento/chats", false)).toBe("redirect-login");
  });

  it("permite rota protegida com usuário", () => {
    expect(decideAccess("/erp", true)).toBe("allow");
  });

  it("permite rota pública com ou sem usuário", () => {
    expect(decideAccess("/", false)).toBe("allow");
    expect(decideAccess("/login", false)).toBe("allow");
  });
});
