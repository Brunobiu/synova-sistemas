// Formato da avaliação (CSAT) do cliente, gravada como `note` de um `ticket_event`:
//   "csat:<1..5>"  ou  "csat:<1..5>|<comentário>"
// Fica em shared para que a escrita (widget) e a leitura (métricas) usem o mesmo contrato,
// evitando uma migration dedicada (ticket_events já existe e não é exibido em lugar nenhum).

export const CSAT_NOTE_PREFIX = "csat:";

/** Monta o `note` a partir da nota (1..5) e de um comentário opcional. */
export function buildCsatNote(rating: number, comment?: string): string {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  const c = comment?.trim();
  return c ? `${CSAT_NOTE_PREFIX}${r}|${c}` : `${CSAT_NOTE_PREFIX}${r}`;
}

/** Extrai a nota (1..5) de um `note` de CSAT; retorna null se não for um CSAT válido. */
export function parseCsatNote(note: string | null | undefined): number | null {
  if (!note || !note.startsWith(CSAT_NOTE_PREFIX)) return null;
  const raw = note.slice(CSAT_NOTE_PREFIX.length).split("|")[0];
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
