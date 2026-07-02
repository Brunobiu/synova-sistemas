import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Utilitários server-only do ERP: geração da chave de integração e
// criptografia do segredo (AES-256-GCM). NÃO importar em Client Components.

export interface ApiKeyPair {
  /** Chave pública de integração (identifica o sistema). */
  apiKey: string;
  /** Segredo usado para assinar/validar o widget (HMAC). Mostrado uma vez. */
  secret: string;
}

function token(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateApiKeyPair(): ApiKeyPair {
  return { apiKey: `pk_${token(18)}`, secret: `sk_${token(32)}` };
}

/** Gera apenas um novo segredo (usado na rotação de chave do widget). */
export function generateSecret(): string {
  return `sk_${token(32)}`;
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "sistema";
}

function keyBuffer(keyB64: string): Buffer {
  const buf = Buffer.from(keyB64, "base64");
  if (buf.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY inválida (precisa de 32 bytes em base64).");
  }
  return buf;
}

/** Cifra um segredo com AES-256-GCM. Retorna "ivB64.tagB64.dataB64". */
export function encryptSecret(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(keyB64), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string, keyB64: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("payload cifrado inválido");
  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("payload cifrado inválido");
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer(keyB64), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Lê a chave de criptografia do ambiente (server-only). */
export function getEncryptionKey(): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY não definida no ambiente.");
  return key;
}
