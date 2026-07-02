-- Bloco 2.5 — Row Level Security (isolamento).
-- Modelo de acesso:
--  * anon: sem acesso a nada.
--  * admin autenticado (painel): acesso amplo via is_admin() (o dono vê todos os tenants).
--  * widget/servidor: operações via service_role (bypassa RLS), com o escopo
--    (system_id/tenant_id) imposto pela camada de acesso em @synova/database e
--    coberto por testes de isolamento. RLS é a rede de proteção que barra anon.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Habilitar RLS em todas as tabelas
alter table public.systems            enable row level security;
alter table public.tenants            enable row level security;
alter table public.users              enable row level security;
alter table public.knowledge_docs     enable row level security;
alter table public.knowledge_chunks   enable row level security;
alter table public.ai_provider_config enable row level security;
alter table public.profiles           enable row level security;
alter table public.support_sessions   enable row level security;
alter table public.chats              enable row level security;
alter table public.messages           enable row level security;
alter table public.tickets            enable row level security;
alter table public.ticket_events      enable row level security;
alter table public.attachments        enable row level security;
alter table public.ai_context         enable row level security;
alter table public.notifications      enable row level security;
alter table public.audit_logs         enable row level security;

-- Políticas de admin (acesso total) nas tabelas operacionais
create policy admin_all on public.systems            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.tenants            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.users              for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.knowledge_docs     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.knowledge_chunks   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.ai_provider_config for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.support_sessions   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.chats              for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.messages           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.tickets            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.ticket_events      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.attachments        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.ai_context         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.notifications      for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: admin total + cada usuário lê o próprio registro
create policy admin_all  on public.profiles for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy self_read  on public.profiles for select to authenticated using (id = auth.uid());

-- audit_logs: admin apenas lê (escrita ocorre via service_role); sem update/delete
create policy admin_read on public.audit_logs for select to authenticated using (public.is_admin());
