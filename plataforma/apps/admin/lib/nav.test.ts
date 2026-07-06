import { describe, it, expect } from "vitest";
import { isNavActive, visibleNavFor } from "./nav";

describe("isNavActive", () => {
  it("Projetos ativo em /erp e no detalhe de sistema, não em /erp/ia nem /erp/landing", () => {
    expect(isNavActive("/erp", "/erp")).toBe(true);
    expect(isNavActive("/erp", "/erp/systems/123")).toBe(true);
    expect(isNavActive("/erp", "/erp/ia")).toBe(false);
    expect(isNavActive("/erp", "/erp/landing")).toBe(false);
  });

  it("IA, Admins e Landing page só ativam nas próprias rotas", () => {
    expect(isNavActive("/erp/ia", "/erp/ia")).toBe(true);
    expect(isNavActive("/erp/admins", "/erp/admins")).toBe(true);
    expect(isNavActive("/erp/landing", "/erp/landing")).toBe(true);
    expect(isNavActive("/erp/landing", "/erp")).toBe(false);
  });

  it("Atendimento ativo na caixa e na conversa, não em notificações", () => {
    expect(isNavActive("/meu-atendimento", "/meu-atendimento")).toBe(true);
    expect(isNavActive("/meu-atendimento", "/meu-atendimento/chats/9")).toBe(true);
    expect(isNavActive("/meu-atendimento", "/meu-atendimento/notificacoes")).toBe(false);
  });

  it("Notificações e Métricas ativam nas próprias rotas", () => {
    expect(isNavActive("/meu-atendimento/notificacoes", "/meu-atendimento/notificacoes")).toBe(true);
    expect(isNavActive("/meu-atendimento/metricas", "/meu-atendimento/metricas")).toBe(true);
  });
});

describe("visibleNavFor", () => {
  it("admin vê todos os itens (ERP + atendimento + landing)", () => {
    expect(visibleNavFor("admin")).toHaveLength(7);
  });

  it("agent vê só os itens de atendimento", () => {
    expect(visibleNavFor("agent").map((i) => i.label)).toEqual([
      "Atendimento",
      "Notificações",
      "Métricas",
    ]);
  });
});
