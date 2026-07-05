import { describe, it, expect } from "vitest";
import { RateLimiter } from "@synova/shared";
import {
  LOGIN_RATE_LIMIT,
  clientIpFromHeaders,
  loginRateKey,
  normalizeEmail,
} from "./login-guard";

describe("normalizeEmail", () => {
  it("faz trim e lowercase", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("loginRateKey", () => {
  it("compõe IP + e-mail normalizado", () => {
    expect(loginRateKey("1.2.3.4", "Foo@Bar.com")).toBe("login:1.2.3.4:foo@bar.com");
  });

  it("usa 'unknown' quando não há IP", () => {
    expect(loginRateKey(null, "a@b.com")).toBe("login:unknown:a@b.com");
  });

  it("isola contas diferentes no mesmo IP", () => {
    expect(loginRateKey("1.2.3.4", "a@b.com")).not.toBe(
      loginRateKey("1.2.3.4", "c@d.com"),
    );
  });
});

describe("clientIpFromHeaders", () => {
  const h = (map: Record<string, string>) => ({ get: (k: string) => map[k] ?? null });

  it("pega o primeiro IP de x-forwarded-for", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe(
      "9.9.9.9",
    );
  });

  it("cai para x-real-ip quando não há forwarded-for", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("retorna 'unknown' sem cabeçalhos", () => {
    expect(clientIpFromHeaders(h({}))).toBe("unknown");
  });
});

describe("rate limit de login", () => {
  it("bloqueia após o limite na mesma chave IP+e-mail", () => {
    const rl = new RateLimiter(() => 1000);
    const key = loginRateKey("1.2.3.4", "a@b.com");
    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i++) {
      expect(rl.check(key, LOGIN_RATE_LIMIT).allowed).toBe(true);
    }
    expect(rl.check(key, LOGIN_RATE_LIMIT).allowed).toBe(false);
  });

  it("não penaliza outra conta no mesmo IP", () => {
    const rl = new RateLimiter(() => 1000);
    const alvo = loginRateKey("1.2.3.4", "a@b.com");
    const outra = loginRateKey("1.2.3.4", "c@d.com");
    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i++) rl.check(alvo, LOGIN_RATE_LIMIT);
    expect(rl.check(alvo, LOGIN_RATE_LIMIT).allowed).toBe(false);
    expect(rl.check(outra, LOGIN_RATE_LIMIT).allowed).toBe(true);
  });
});
