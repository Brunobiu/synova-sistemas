import { describe, it, expect } from "vitest";
import { validateAttachment, sanitizeFilename } from "./attachments";

const MB = 1024 * 1024;

describe("validateAttachment", () => {
  it("aceita imagem dentro do limite", () => {
    const r = validateAttachment({ name: "foto.png", mimeType: "image/png", size: 2 * MB });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.category).toBe("image");
  });

  it("aceita PDF", () => {
    expect(
      validateAttachment({ name: "doc.pdf", mimeType: "application/pdf", size: 1 * MB }).ok,
    ).toBe(true);
  });

  it("bloqueia tipo perigoso pela extensão mesmo com mime aceito", () => {
    const r = validateAttachment({ name: "malware.exe", mimeType: "image/png", size: 1000 });
    expect(r.ok).toBe(false);
  });

  it("bloqueia .js e .svg", () => {
    expect(validateAttachment({ name: "x.js", mimeType: "text/plain", size: 10 }).ok).toBe(false);
    expect(validateAttachment({ name: "x.svg", mimeType: "image/webp", size: 10 }).ok).toBe(false);
  });

  it("rejeita mime não suportado", () => {
    const r = validateAttachment({ name: "a.bin", mimeType: "application/octet-stream", size: 10 });
    expect(r.ok).toBe(false);
  });

  it("rejeita arquivo acima do limite", () => {
    const r = validateAttachment({ name: "grande.png", mimeType: "image/png", size: 11 * MB });
    expect(r.ok).toBe(false);
  });

  it("rejeita arquivo vazio", () => {
    expect(validateAttachment({ name: "v.png", mimeType: "image/png", size: 0 }).ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("remove caminho e caracteres perigosos", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
  });

  it("mantém nome simples e limita tamanho", () => {
    expect(sanitizeFilename("relatório final.pdf")).toBe("relat_rio final.pdf");
    expect(sanitizeFilename("a".repeat(300)).length).toBeLessThanOrEqual(200);
  });
});
