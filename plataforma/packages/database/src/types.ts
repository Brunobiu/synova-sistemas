// Tipo do banco para o supabase-js.
//
// Tipo PERMISSIVO enquanto não geramos os tipos reais. A geração
// (`supabase gen types typescript`) precisa de Docker (via --db-url) ou de um
// access token (via --project-id). Quando tivermos um deles, rodamos:
//   supabase gen types typescript --project-id ndfhkcavdewdjkdoywfh > src/types.ts
// e substituímos este arquivo pelos tipos reais do schema.
type AnyRow = Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      [table: string]: {
        Row: AnyRow;
        Insert: AnyRow;
        Update: AnyRow;
        Relationships: [];
      };
    };
    Views: {
      [view: string]: { Row: AnyRow };
    };
    Functions: {
      [fn: string]: { Args: Record<string, unknown>; Returns: unknown };
    };
    Enums: {
      [name: string]: string;
    };
    CompositeTypes: {
      [name: string]: AnyRow;
    };
  };
};
