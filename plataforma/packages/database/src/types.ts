// Tipos do banco gerados pelo Supabase.
// Depois de conectar o projeto, gere os tipos reais com:
//   supabase gen types typescript --project-id <PROJECT_ID> > packages/database/src/types.ts
//
// Por enquanto, um placeholder para o cliente compilar.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
