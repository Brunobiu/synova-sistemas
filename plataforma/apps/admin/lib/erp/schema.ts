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
