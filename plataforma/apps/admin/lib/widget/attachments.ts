// Validação de anexos do widget (R19/R23). Regras puras e testáveis.

const MB = 1024 * 1024;

// Allowlist de tipos aceitos, com limite de tamanho por categoria.
const ALLOWED: Record<string, { category: string; maxBytes: number }> = {
  "image/png": { category: "image", maxBytes: 10 * MB },
  "image/jpeg": { category: "image", maxBytes: 10 * MB },
  "image/gif": { category: "image", maxBytes: 10 * MB },
  "image/webp": { category: "image", maxBytes: 10 * MB },
  "application/pdf": { category: "document", maxBytes: 20 * MB },
  "text/plain": { category: "document", maxBytes: 5 * MB },
  "text/csv": { category: "document", maxBytes: 5 * MB },
  "application/msword": { category: "document", maxBytes: 20 * MB },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "document",
    maxBytes: 20 * MB,
  },
  "application/vnd.ms-excel": { category: "document", maxBytes: 20 * MB },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "document",
    maxBytes: 20 * MB,
  },
};

// Extensões executáveis/perigosas sempre bloqueadas (defesa em profundidade).
const BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "sh", "bash", "js", "mjs", "cjs", "jar", "msi", "com",
  "scr", "ps1", "vbs", "dll", "app", "deb", "rpm", "apk", "bin", "run", "php",
  "py", "rb", "pl", "html", "htm", "svg",
]);

export const MAX_FILENAME_LEN = 200;

export interface AttachmentMeta {
  name: string;
  mimeType: string;
  size: number;
}

export type AttachmentValidation =
  | { ok: true; category: string; safeName: string }
  | { ok: false; error: string };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Remove caracteres de caminho/controle e limita o tamanho do nome. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[\x00-\x1f]/g, "").trim();
  const cleaned = base
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\.{2,}/g, "."); // colapsa ".." (evita traversal/confusão)
  return (cleaned || "arquivo").slice(0, MAX_FILENAME_LEN);
}

export function validateAttachment(meta: AttachmentMeta): AttachmentValidation {
  if (!meta.size || meta.size <= 0) return { ok: false, error: "Arquivo vazio." };

  const ext = extensionOf(meta.name);
  if (BLOCKED_EXT.has(ext)) {
    return { ok: false, error: "Tipo de arquivo não permitido." };
  }

  const rule = ALLOWED[meta.mimeType];
  if (!rule) {
    return { ok: false, error: "Tipo de arquivo não suportado." };
  }
  if (meta.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / MB);
    return { ok: false, error: `Arquivo maior que o limite (${mb}MB).` };
  }

  return { ok: true, category: rule.category, safeName: sanitizeFilename(meta.name) };
}
