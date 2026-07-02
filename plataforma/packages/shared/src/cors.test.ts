import { describe, it, expect } from "vitest";
import { isOriginAllowed, corsHeaders } from "./cors";

describe("isOriginAllowed", () => {
  const allowed = ["https://app.cliente.com", "https://cliente.com"];

  it("aceita origem exata (case-insensitive, ignora barra final)", () => {
    expect(isOriginAllowed("https://app.cliente.com", allowed)).toBe(true);
    expect(isOriginAllowed("https://APP.cliente.com/", allowed)).toBe(true);
  });

  it("rejeita origem fora da lista", () => {
    expect(isOriginAllowed("https://evil.com", allowed)).toBe(false);
  });

  it("rejeita quando a lista está vazia", () => {
    expect(isOriginAllowed("https://app.cliente.com", [])).toBe(false);
  });

  it("aceita qualquer origem com curinga *", () => {
    expect(isOriginAllowed("https://qualquer.com", ["*"])).toBe(true);
    expect(isOriginAllowed(null, ["*"])).toBe(true);
  });

  it("rejeita origem ausente sem curinga", () => {
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });
});

describe("corsHeaders", () => {
  const allowed = ["https://app.cliente.com"];

  it("ecoa a origem permitida e inclui Vary", () => {
    const h = corsHeaders("https://app.cliente.com", allowed);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://app.cliente.com");
    expect(h["Vary"]).toBe("Origin");
    expect(h["Access-Control-Allow-Methods"]).toContain("POST");
  });

  it("retorna vazio para origem não permitida", () => {
    expect(corsHeaders("https://evil.com", allowed)).toEqual({});
  });

  it("com curinga e origem presente, ecoa a origem específica", () => {
    const h = corsHeaders("https://qualquer.com", ["*"]);
    expect(h["Access-Control-Allow-Origin"]).toBe("https://qualquer.com");
  });
});
