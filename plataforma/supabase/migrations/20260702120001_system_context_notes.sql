-- Bloco 5 — Contexto grande do sistema + anotações do dono, direto na tabela systems.
-- Alimentam a IA do suporte. A indexação semântica (chunks/embeddings) é feita no Bloco 8.
alter table public.systems
  add column if not exists context text not null default '';
alter table public.systems
  add column if not exists notes text not null default '';
