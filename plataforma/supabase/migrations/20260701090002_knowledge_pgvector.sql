-- Bloco 2.2 — Base de conhecimento + busca semântica (pgvector) + função de match escopada
-- Modelo de embeddings fixo: OpenAI text-embedding-3-small (1536 dims).

create extension if not exists vector;

-- Documentos da base (contexto do sistema, docs técnicos/operacionais/comerciais/custom)
create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid references public.tenants (id) on delete restrict, -- null = base global do sistema
  kind text not null
    check (kind in ('technical', 'operational', 'commercial', 'custom')),
  title text not null,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_docs_system_idx on public.knowledge_docs (system_id);
create index knowledge_docs_tenant_idx on public.knowledge_docs (tenant_id);
create trigger knowledge_docs_set_updated_at before update on public.knowledge_docs
  for each row execute function public.set_updated_at();

-- Trechos vetorizados para RAG
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.knowledge_docs (id) on delete cascade, -- derivado do doc
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid references public.tenants (id) on delete restrict,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index knowledge_chunks_system_idx on public.knowledge_chunks (system_id);
create index knowledge_chunks_doc_idx on public.knowledge_chunks (doc_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- Busca por similaridade, SEMPRE escopada por system_id e (tenant específico OU global).
-- Precedência (empresa > global) é resolvida na aplicação a partir do tenant_id de cada trecho.
create or replace function public.match_knowledge(
  p_system_id uuid,
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 6
)
returns table (
  id uuid,
  doc_id uuid,
  tenant_id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id,
    kc.doc_id,
    kc.tenant_id,
    kc.content,
    1 - (kc.embedding <=> p_query_embedding) as similarity
  from public.knowledge_chunks kc
  where kc.system_id = p_system_id
    and (kc.tenant_id = p_tenant_id or kc.tenant_id is null)
    and kc.embedding is not null
  order by kc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;
