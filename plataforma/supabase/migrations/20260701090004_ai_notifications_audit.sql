-- Bloco 2.4 — Perfis de admin, config de IA, anexos, contexto de IA, notificações e auditoria.

-- Perfis de administrador (espelham auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- Configuração multi-provedor de IA (chave criptografada; global ou por sistema)
create table public.ai_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('openai', 'anthropic', 'google')),
  api_key_encrypted text not null,
  chat_model text,
  embeddings_model text,
  is_active boolean not null default false,
  system_id uuid references public.systems (id) on delete cascade, -- null = global
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_provider_config_system_idx on public.ai_provider_config (system_id);
create trigger ai_provider_config_set_updated_at before update on public.ai_provider_config
  for each row execute function public.set_updated_at();

-- Anexos (isolados por system/tenant; acesso via URL assinada)
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages (id) on delete set null,
  ticket_id uuid references public.tickets (id) on delete set null,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid references public.users (id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);
create index attachments_system_idx on public.attachments (system_id);

-- Contexto usado pela IA em cada resposta (fontes, confiança, provedor)
create table public.ai_context (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages (id) on delete cascade,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  sources jsonb not null default '[]'::jsonb,
  confidence real,
  provider text,
  model text,
  created_at timestamptz not null default now()
);
create index ai_context_message_idx on public.ai_context (message_id);

-- Notificações (somente painel)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid references public.tenants (id) on delete restrict,
  type text not null
    check (type in ('new_chat', 'new_ticket', 'critical_ticket', 'ai_escalation', 'file_uploaded', 'system_error')),
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta', 'critica')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_system_idx on public.notifications (system_id);
create index notifications_status_idx on public.notifications (status);
create index notifications_priority_idx on public.notifications (priority);

-- Auditoria (append-only; imutável pela aplicação)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references public.systems (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  actor_type text not null
    check (actor_type in ('user', 'ai', 'admin', 'system', 'anonymous')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  ip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_system_idx on public.audit_logs (system_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_idx on public.audit_logs (created_at);
