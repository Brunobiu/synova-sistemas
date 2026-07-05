import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("retorna vazio para texto vazio", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("mantém texto curto em um único trecho", () => {
    expect(chunkText("um texto curto")).toEqual(["um texto curto"]);
  });

  it("divide texto longo em vários trechos respeitando o limite", () => {
    const para = "frase. ".repeat(60).trim(); // ~420 chars
    const text = `${para}\n\n${para}\n\n${para}`;
    const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(500);
  });

  it("fatia parágrafo único gigante", () => {
    const huge = "x".repeat(3000);
    const chunks = chunkText(huge, { maxChars: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
});
