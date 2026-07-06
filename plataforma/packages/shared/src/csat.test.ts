import { describe, it, expect } from "vitest";
import { buildCsatNote, parseCsatNote } from "./csat";

describe("csat note", () => {
  it("monta e lê a nota sem comentário", () => {
    const note = buildCsatNote(5);
    expect(note).toBe("csat:5");
    expect(parseCsatNote(note)).toBe(5);
  });

  it("monta e lê a nota com comentário (sem perder a nota)", () => {
    const note = buildCsatNote(4, "atendimento rápido");
    expect(note).toBe("csat:4|atendimento rápido");
    expect(parseCsatNote(note)).toBe(4);
  });

  it("faz clamp da nota para 1..5", () => {
    expect(buildCsatNote(9)).toBe("csat:5");
    expect(buildCsatNote(0)).toBe("csat:1");
  });

  it("ignora notes que não são CSAT", () => {
    expect(parseCsatNote("Prioridade: media → alta")).toBeNull();
    expect(parseCsatNote(null)).toBeNull();
    expect(parseCsatNote("csat:9")).toBeNull();
    expect(parseCsatNote("csat:x")).toBeNull();
  });
});
