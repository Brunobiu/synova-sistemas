-- Bloco 2.3 — Atendimento: sessões, chats, mensagens, tickets e histórico de tickets.
-- Todas as tabelas carregam system_id/tenant_id para escopo e isolamento.

create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid references public.users (id) on delete restrict,
  channel text not null default 'widget',
  status text not null default 'active'
    check (status in ('active', 'closed', 'archived')),
  context_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index support_sessions_system_idx on public.support_sessions (system_id);
create index support_sessions_tenant_idx on public.support_sessions (tenant_id);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.support_sessions (id) on delete restrict,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid references public.users (id) on delete restrict,
  status text not null default 'ai_active'
    check (status in ('ai_active', 'human_active', 'closed', 'archived')),
  assigned_admin_id uuid references auth.users (id),
  ai_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chats_system_idx on public.chats (system_id);
create index chats_tenant_idx on public.chats (tenant_id);
create index chats_status_idx on public.chats (status);
create trigger chats_set_updated_at before update on public.chats
  for each row execute function public.set_updated_at();

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats (id) on delete set null,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid references public.users (id) on delete restrict,
  category text not null,
  subject text not null,
  description text not null default '',
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'escalated', 'waiting_customer', 'resolved', 'closed')),
  escalation_reason text,
  assigned_admin_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index tickets_system_idx on public.tickets (system_id);
create index tickets_tenant_idx on public.tickets (tenant_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_priority_idx on public.tickets (priority);
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete restrict,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  sender_type text not null
    check (sender_type in ('user', 'ai', 'admin', 'system')),
  sender_id text,
  content text not null default '',
  ai_meta jsonb,
  created_at timestamptz not null default now()
);
create index messages_chat_idx on public.messages (chat_id);
create index messages_system_idx on public.messages (system_id);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete restrict,
  system_id uuid not null references public.systems (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  actor_type text not null
    check (actor_type in ('user', 'ai', 'admin', 'system')),
  actor_id text,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events (ticket_id);
