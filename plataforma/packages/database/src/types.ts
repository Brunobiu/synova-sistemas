// Tipo do banco para o supabase-js.
//
// Enquanto o Supabase real não está conectado, usamos um tipo permissivo que
// permite consultar qualquer tabela/rpc. Quando conectarmos, geramos os tipos
// reais com `supabase gen types typescript` e substituímos este arquivo.
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
