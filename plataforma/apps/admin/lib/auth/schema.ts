import { z } from "zod";

// Schemas client-safe (só zod) de autenticação. Usados tanto nos formulários
// (client) quanto nas server actions, garantindo a mesma validação nas duas pontas.

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Convite de admin (Opção A): cria o usuário com uma senha inicial já confirmada,
// sem depender de e-mail/SMTP. A senha exige um mínimo mais alto que o login.
export const adminInviteSchema = z.object({
  email: z.string().email("E-mail inválido").max(200),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(200),
});
export type AdminInviteInput = z.infer<typeof adminInviteSchema>;
