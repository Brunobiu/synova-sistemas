-- Bloco 2.1 — Entidades base da hierarquia multi-tenant: systems -> tenants -> users
-- Retenção: FKs usam ON DELETE RESTRICT (nada de atendimento é apagado em cascata).

create extension if not exists "pgcrypto";

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Nível 1: Sistema (SaaS) — cada card do ERP
create table public.systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  is_own boolean not null default false,               -- projeto próprio x de cliente
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  support_api_key text not null unique,                -- chave pública de integração (pk_...)
  key_secret_hash text not null,                       -- hash do segredo HMAC (nunca em claro)
  allowed_origins text[] not null default '{}',        -- allowlist de domínios do widget
  support_config jsonb not null default '{}'::jsonb,
  ai_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index systems_status_idx on public.systems (status);
create trigger systems_set_updated_at before update on public.systems
  for each row execute function public.set_updated_at();

-- Nível 2: Empresa cliente (Tenant)
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete restrict,
  name text not null,
  contact_name text,                                   -- contato do cliente (nome)
  contact_phone text,                                  -- contato do cliente (telefone)
  plan text,
  is_primary boolean not null default false,           -- tenant primário (sistema de 1 cliente)
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_system_id_idx on public.tenants (system_id);
create trigger tenants_set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- Nível 3: Usuário final
create table public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  system_id uuid not null references public.systems (id) on delete restrict,
  external_ref text,                                   -- rótulo/número do sistema (ex.: "9")
  name text,
  email text,
  role text,
  sector text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, external_ref)
);
create index users_tenant_id_idx on public.users (tenant_id);
create index users_system_id_idx on public.users (system_id);
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
