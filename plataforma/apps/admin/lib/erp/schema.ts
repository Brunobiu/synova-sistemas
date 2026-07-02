import { z } from "zod";

// Schema client-safe (só zod) do formulário de Sistema no ERP.
// Usado tanto no formulário (client) quanto na server action.

export const systemFormSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120, "Nome muito longo"),
  isOwn: z.boolean(),
  imageUrl: z
    .union([z.string().url("URL inválida").max(500), z.literal("")])
    .optional(),
  status: z.enum(["active", "inactive", "archived"]),
});

export type SystemFormInput = z.infer<typeof systemFormSchema>;

export const SYSTEM_STATUS_LABELS: Record<SystemFormInput["status"], string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

// --- Bloco 5: detalhe do sistema (cliente, contexto, usuários) ---

export const clientContactSchema = z.object({
  contactName: z.union([z.string().max(160), z.literal("")]).optional(),
  contactPhone: z.union([z.string().max(40), z.literal("")]).optional(),
});
export type ClientContactInput = z.infer<typeof clientContactSchema>;

export const systemContextSchema = z.object({
  context: z.string().max(50000),
  notes: z.string().max(20000),
});
export type SystemContextInput = z.infer<typeof systemContextSchema>;

export const userFormSchema = z.object({
  externalRef: z.union([z.string().max(120), z.literal("")]).optional(),
  name: z.string().min(1, "Nome obrigatório").max(160),
  email: z.union([z.string().email("E-mail inválido").max(200), z.literal("")]).optional(),
  role: z.union([z.string().max(120), z.literal("")]).optional(),
  sector: z.union([z.string().max(120), z.literal("")]).optional(),
});
export type UserFormInput = z.infer<typeof userFormSchema>;

// --- Bloco 6.1: base de conhecimento (knowledge_docs) ---

export const KNOWLEDGE_KINDS = ["technical", "operational", "commercial", "custom"] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const KNOWLEDGE_KIND_LABELS: Record<KnowledgeKind, string> = {
  technical: "Técnico",
  operational: "Operacional",
  commercial: "Comercial",
  custom: "Personalizado",
};

// Escopo do documento: "system" = vale para todo o sistema (todos os clientes);
// "tenant" = vale só para o cliente (tenant primário).
export const KNOWLEDGE_SCOPES = ["system", "tenant"] as const;
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

export const KNOWLEDGE_SCOPE_LABELS: Record<KnowledgeScope, string> = {
  system: "Todo o sistema",
  tenant: "Só do cliente",
};

export const knowledgeDocSchema = z.object({
  kind: z.enum(KNOWLEDGE_KINDS),
  scope: z.enum(KNOWLEDGE_SCOPES),
  title: z.string().min(2, "Título muito curto").max(200, "Título muito longo"),
  content: z.string().min(1, "Conteúdo obrigatório").max(50000, "Conteúdo muito longo"),
});
export type KnowledgeDocInput = z.infer<typeof knowledgeDocSchema>;

// --- Bloco 6.2: configuração de provedores de IA ---

export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
};

export const aiProviderSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  // Vazio no update = manter a chave já salva. Obrigatória só quando ainda não há chave.
  apiKey: z.union([z.string().min(10, "Chave muito curta").max(400), z.literal("")]).optional(),
  chatModel: z.union([z.string().max(120), z.literal("")]).optional(),
  embeddingsModel: z.union([z.string().max(120), z.literal("")]).optional(),
});
export type AiProviderInput = z.infer<typeof aiProviderSchema>;

// --- Bloco 6.3: integração do widget (domínios permitidos) ---

// Origem no formato de CORS: "*" ou "https://host[:porta]" (sem caminho).
const ORIGIN_RE = /^https?:\/\/[^/\s]+$/;
export function isValidOrigin(value: string): boolean {
  return value === "*" || ORIGIN_RE.test(value);
}

export const allowedOriginsSchema = z.object({
  origins: z
    .array(z.string().max(200))
    .max(50, "Máximo de 50 domínios")
    .refine((arr) => arr.every(isValidOrigin), {
      message: "Use * ou URLs como https://seusite.com (sem caminho).",
    }),
});
export type AllowedOriginsInput = z.infer<typeof allowedOriginsSchema>;

/** Converte texto (um por linha) em lista de origens normalizadas e sem duplicatas. */
export function parseOrigins(text: string): string[] {
  const list = text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}
