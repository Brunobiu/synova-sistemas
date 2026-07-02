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
