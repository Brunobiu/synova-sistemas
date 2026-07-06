-- Bloco 16 — Papel "agent" (Atendente): acesso restrito à área de atendimento.
--
-- Admin (dono) mantém acesso total via as policies admin_all já existentes.
-- Atendente (agent): lê/escreve nas tabelas de atendimento e lê os nomes de
-- sistema/empresa/usuário que o painel exibe. NÃO acessa config de sistema, base
-- de conhecimento, chaves de IA, contexto de IA nem a gestão de contas (profiles).
--
-- RLS combina policies permissivas por OR, então basta ADICIONAR as do atendente
-- às admin_all que já existem. Idempotente (pode rodar novamente com segurança).

-- 1) Permitir o novo papel na tabela de perfis.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'agent'));

-- 2) É membro do painel (admin OU agent)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'agent')
  );
$$;

-- 3) Leitura + escrita do atendente nas tabelas de atendimento.
drop policy if exists staff_rw on public.chats;
create policy staff_rw on public.chats for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_rw on public.messages;
create policy staff_rw on public.messages for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_rw on public.tickets;
create policy staff_rw on public.tickets for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_rw on public.ticket_events;
create policy staff_rw on public.ticket_events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_rw on public.notifications;
create policy staff_rw on public.notifications for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 4) Somente leitura no que o painel precisa exibir (nomes, anexos, sessões).
drop policy if exists staff_read on public.support_sessions;
create policy staff_read on public.support_sessions for select to authenticated
  using (public.is_staff());

drop policy if exists staff_read on public.attachments;
create policy staff_read on public.attachments for select to authenticated
  using (public.is_staff());

drop policy if exists staff_read on public.systems;
create policy staff_read on public.systems for select to authenticated
  using (public.is_staff());

drop policy if exists staff_read on public.tenants;
create policy staff_read on public.tenants for select to authenticated
  using (public.is_staff());

drop policy if exists staff_read on public.users;
create policy staff_read on public.users for select to authenticated
  using (public.is_staff());

-- Notas:
--  * knowledge_docs, knowledge_chunks, ai_provider_config e ai_context continuam
--    apenas com admin_all: o atendente não os acessa.
--  * profiles: atendente só lê o próprio registro (self_read); não gerencia contas.
--  * audit_logs: escrita via service_role (append-only); leitura só admin.
--  * Escopo por cliente (atendente ver só alguns sistemas) fica para a v2:
--    trocaria o using(is_staff()) por uma checagem numa tabela agent_systems.
