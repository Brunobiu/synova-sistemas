import { describe, it, expect } from "vitest";
import {
  generateApiKeyPair,
  generateEncryptionKey,
  encryptSecret,
  decryptSecret,
  slugify,
} from "./security";

describe("generateApiKeyPair", () => {
  it("gera apiKey pk_ e secret sk_, únicos a cada chamada", () => {
    const a = generateApiKeyPair();
    const b = generateApiKeyPair();
    expect(a.apiKey.startsWith("pk_")).toBe(true);
    expect(a.secret.startsWith("sk_")).toBe(true);
    expect(a.apiKey).not.toBe(b.apiKey);
    expect(a.secret).not.toBe(b.secret);
  });
});

describe("slugify", () => {
  it("normaliza acentos, espaços e símbolos", () => {
    expect(slugify("Barbearia do Zé!")).toBe("barbearia-do-ze");
    expect(slugify("Distribuidora   Souza")).toBe("distribuidora-souza");
  });
  it("cai no fallback quando vazio", () => {
    expect(slugify("   ")).toBe("sistema");
    expect(slugify("!!!")).toBe("sistema");
  });
});

describe("criptografia do segredo (AES-256-GCM)", () => {
  const key = generateEncryptionKey();

  it("faz roundtrip e não vaza o texto em claro", () => {
    const enc = encryptSecret("sk_super_secreto", key);
    expect(enc).not.toContain("sk_super_secreto");
    expect(decryptSecret(enc, key)).toBe("sk_super_secreto");
  });

  it("falha ao decifrar com chave errada", () => {
    const enc = encryptSecret("segredo", key);
    expect(() => decryptSecret(enc, generateEncryptionKey())).toThrow();
  });

  it("falha se o payload for adulterado", () => {
    const enc = encryptSecret("segredo", key);
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "BB" : "AA");
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it("rejeita chave com tamanho errado", () => {
    expect(() => encryptSecret("x", "chavecurta")).toThrow();
  });
});
