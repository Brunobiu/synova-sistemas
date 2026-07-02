# Plano de Implementação — Plataforma Synova (ERP + Suporte)

Execução incremental, guiada por testes. Cada tarefa entrega algo verificável e referencia os
requisitos que atende. Desenvolvimento e testes usam **Supabase local** (`supabase start`);
conectar o projeto real do Supabase e as chaves de IA é feito quando você fornecer as
credenciais. A landing na raiz **não é tocada** em nenhuma tarefa.

- [x] 1. Fundação do monorepo e ferramentas de teste
  - [x] 1.1 Scaffold do `apps/admin` (Next.js App Router + TypeScript + Tailwind + shadcn/ui) e instalar Framer Motion, TanStack Query, Zustand, React Hook Form e Zod
    - _Requisitos: 25_
  - [x] 1.2 Criar `packages/shared` (enums de status/prioridade, tipos de domínio, schemas Zod base e utilitários de assinatura HMAC/JWT) com testes unitários
    - _Requisitos: 7, 23, 24_
  - [x] 1.3 Criar esqueleto de `packages/ai` e `packages/ui`; configurar Vitest, ESLint/Prettier e scripts de teste no monorepo
    - _Requisitos: 24_

- [x] 2. Modelagem do banco e isolamento (Supabase)
  - [x] 2.1 Migration inicial: `systems`, `tenants`, `users` com índices e integridade referencial
    - _Requisitos: 1, 22_
  - [x] 2.2 Migration: `knowledge_docs` e `knowledge_chunks` (pgvector) + função SQL `match_knowledge` escopada
    - _Requisitos: 11, 22_
  - [x] 2.3 Migration: `support_sessions`, `chats`, `messages`, `tickets`, `ticket_events`
    - _Requisitos: 12, 16, 22_
  - [x] 2.4 Migration: `attachments`, `ai_context`, `notifications`, `audit_logs`, `ai_provider_config`, `profiles` (admins)
    - _Requisitos: 5, 19, 20, 22_
  - [x] 2.5 Habilitar RLS e policies (anon negado; admin com leitura ampla; escopo por `system_id`/`tenant_id`) e política append-only de `audit_logs`
    - _Requisitos: 8, 16, 18, 20_
  - [x] 2.6 Gerar tipos TypeScript em `packages/database` e criar helpers de acesso que exigem escopo obrigatório
    - _Requisitos: 8, 22_
  - [x] 2.7 Testes de isolamento multi-tenant (tentativas cross-tenant devem falhar)
    - _Requisitos: 8, 24_

- [ ] 3. Autenticação e autorização do admin
  - [x] 3.1 Supabase Auth (e-mail/senha): tela de login, logout e sessão
    - _Requisitos: 18_
  - [x] 3.2 `middleware.ts` protegendo `/erp`, `/suporte` e `/api/admin`, com verificação de `role=admin` no servidor
    - _Requisitos: 18_
  - [ ] 3.3 Convite de admins adicionais; rate limit de login; auditoria de acesso
    - _Requisitos: 18, 20, 23_
  - [x] 3.4 Testes (acesso negado sem admin; rotas/APIs protegidas)
    - _Requisitos: 18, 24_

- [x] 4. ERP — hub de projetos (systems)
  - [x] 4.1 Listagem em cards (imagem, status, próprio/cliente) com busca, filtro e reordenação
    - _Requisitos: 2_
  - [x] 4.2 CRUD de Sistema (criar/editar/arquivar) com RHF+Zod; geração de `support_api_key` e do segredo (`key_secret`)
    - _Requisitos: 2, 7, 16_
  - [x] 4.3 Testes de entrada/saída dos formulários e das APIs de Sistema
    - _Requisitos: 24_

- [x] 5. ERP — detalhe do sistema (contexto, cliente, usuários)
  - [x] 5.1 Tenant primário + contato do cliente (nome/telefone) na visão geral do sistema
    - _Requisitos: 1, 3_
  - [x] 5.2 Editor do "contexto grande do sistema" + anotações; salvar dispara indexação semântica
    - _Requisitos: 3, 6, 11_
  - [x] 5.3 Cadastro de usuários (`external_ref` "9" → nome/email/cargo/setor)
    - _Requisitos: 4_
  - [x] 5.4 Testes de entrada/saída
    - _Requisitos: 24_

- [x] 6. ERP — base de conhecimento e configuração de IA
  - [x] 6.1 CRUD de `knowledge_docs` (técnica/operacional/comercial/custom) por sistema e por empresa, com indexação em `knowledge_chunks`
    - _Requisitos: 3, 6, 11_
  - [x] 6.2 Configuração multi-provedor (OpenAI/Anthropic/Google): chave criptografada, modelo, ativar/desativar e teste de conexão
    - _Requisitos: 5, 23_
  - [x] 6.3 Integração: exibir snippet do widget, allowlist de domínios e rotação de chave (convivência antiga+nova)
    - _Requisitos: 7_
  - [x] 6.4 Testes (validação, criptografia de chave, escopo/isolamento)
    - _Requisitos: 8, 23, 24_
    - _Nota: docs salvos no banco; a indexação semântica em `knowledge_chunks` (embeddings) é ligada no Bloco 8, quando as chaves de IA estiverem ativas._

- [x] 7. Segurança de borda do widget (`packages/shared` + middleware de API)
  - [x] 7.1 Assinatura/verificação de token (HMAC/JWT) com o segredo do sistema e validação de `support_api_key`
    - _Requisitos: 7_
  - [x] 7.2 CORS por `allowed_origins`, rate limiting por chave/IP e sanitização de erros
    - _Requisitos: 7, 23_
  - [x] 7.3 Schemas Zod dos endpoints do widget (contratos de entrada/saída)
    - _Requisitos: 23, 24_
  - [x] 7.4 Testes de segurança (chave inválida/expirada, assinatura adulterada, origem não permitida, rate limit)
    - _Requisitos: 7, 8, 23, 24_
    - _Nota: as primitivas + o guarda `guardWidgetRequest` estão prontos e testados; a fiação nos endpoints HTTP acontece no Bloco 9. O rate limit é em memória (por instância); store compartilhado fica para o Bloco 15._

- [ ] 8. Módulo de IA e motor de contexto (`packages/ai`)
  - [ ] 8.1 Interface `AIProvider` + factory + implementações OpenAI/Anthropic/Google (chat com saída estruturada)
    - _Requisitos: 5, 10_
  - [ ] 8.2 Embeddings (modelo fixo) e indexação de `knowledge_chunks`
    - _Requisitos: 11_
  - [ ] 8.3 Motor de contexto/RAG: precedência empresa>sistema + histórico + tickets + estado, via `match_knowledge` escopado
    - _Requisitos: 6, 11_
  - [ ] 8.4 Classificação (intenção/urgência/confiança/prioridade) e decisão de escalonamento
    - _Requisitos: 8, 10, 13, 14_
  - [ ] 8.5 Degradação graciosa (sem chave/timeout → escalar para humano)
    - _Requisitos: 5, 13, 24_
  - [ ] 8.6 Testes (saída estruturada, contexto escopado, falha de provedor)
    - _Requisitos: 10, 11, 24_

- [ ] 9. Fluxo de atendimento — API pública do widget
  - [ ] 9.1 `POST /api/widget/session` (valida contexto, histórico inicial) e resolução de usuário ("9"→Matheus)
    - _Requisitos: 4, 9_
  - [ ] 9.2 `POST /api/widget/message` (persiste, chama IA, responde ou escala)
    - _Requisitos: 6, 10, 16_
  - [ ] 9.3 Escalonamento → cria/atualiza ticket + prioridade + notificação + auditoria
    - _Requisitos: 8, 12, 13, 14, 20_
  - [ ] 9.4 `POST /api/widget/ticket` (abertura manual) e `GET /api/widget/history` (escopado)
    - _Requisitos: 12, 16_
  - [ ] 9.5 Testes de entrada/saída e de fluxo (auto-resposta vs escalonamento)
    - _Requisitos: 24_

- [ ] 10. Anexos seguros
  - [ ] 10.1 `POST /api/widget/attachment`: validação de extensão/tamanho, bloqueio de tipos perigosos e limites por tipo
    - _Requisitos: 19, 23_
  - [ ] 10.2 Storage escopado por `system/tenant` + URLs assinadas e expiráveis; compressão de imagem opcional
    - _Requisitos: 8, 19_
  - [ ] 10.3 Testes (tipo perigoso, oversize, isolamento de acesso ao arquivo)
    - _Requisitos: 8, 19, 24_

- [ ] 11. Widget embutível (`apps/widget`)
  - [ ] 11.1 `embed.js` + `init`; UI flutuante em Shadow DOM; responsiva e com estilo isolado
    - _Requisitos: 9_
  - [ ] 11.2 Chat, abrir ticket, upload, histórico recente e indicador de status
    - _Requisitos: 4, 9, 12, 19_
  - [ ] 11.3 Notificação de resposta (Realtime/polling) + fila offline de mensagens
    - _Requisitos: 9_
  - [ ] 11.4 Testes (contrato com a API e estados do widget)
    - _Requisitos: 24_

- [ ] 12. Painel de suporte + tempo real
  - [ ] 12.1 Lista unificada de chats/tickets com críticos em vermelho no topo e filtros por sistema/empresa/usuário
    - _Requisitos: 14, 15_
  - [ ] 12.2 Visão de conversa (histórico + anexos), responder manual, assumir da IA (pausa auto-resposta), encerrar e reclassificar prioridade (auditado)
    - _Requisitos: 10, 12, 14, 15, 20_
  - [ ] 12.3 Assinaturas Supabase Realtime (`chats`/`messages`/`tickets`/`notifications`)
    - _Requisitos: 15_
  - [ ] 12.4 Arquivar/ocultar sem apagar (retenção) e busca no histórico completo
    - _Requisitos: 16_
  - [ ] 12.5 Testes de entrada/saída e de fluxo do painel
    - _Requisitos: 24_

- [ ] 13. Central de notificações (somente painel)
  - [ ] 13.1 Geração em eventos (novo chat/ticket/crítico/escalonamento/arquivo/erro) e agrupamento por sistema/empresa/prioridade/status
    - _Requisitos: 12, 13, 17_
  - [ ] 13.2 Estados (não lida/lida/resolvida) sem apagar, destaque de crítico e atualização em tempo real
    - _Requisitos: 15, 16, 17_
  - [ ] 13.3 Testes
    - _Requisitos: 24_

- [ ] 14. Auditoria e métricas
  - [ ] 14.1 Registro de auditoria nas ações sensíveis (chave, acesso negado, escalonamento, transições de ticket, uploads, ações admin)
    - _Requisitos: 20_
  - [ ] 14.2 Dashboard de métricas (tickets por sistema/empresa, tempos médios IA/humano, taxa de resolução automática, taxa de escalonamento, satisfação) via views agregadas escopadas
    - _Requisitos: 21_
  - [ ] 14.3 Testes das agregações e do escopo
    - _Requisitos: 21, 24_

- [ ] 15. Qualidade, resiliência e portões de pré-deploy
  - [ ] 15.1 Suíte obrigatória de isolamento multi-tenant + segurança + contratos como portão de CI
    - _Requisitos: 8, 23, 24_
  - [ ] 15.2 Testes de carga (widget `/message` e painel) e testes de falha (IA fora, timeouts, dependências indisponíveis)
    - _Requisitos: 24_
  - [ ] 15.3 Integração Sentry + logs e verificação de compatibilidade (nenhuma chave interfere em outra; integrações não quebram)
    - _Requisitos: 23, 24_

---

## Observações
- Tarefas que dependem de credenciais externas (projeto Supabase real, chaves de IA na Vercel) são desenvolvidas/testadas localmente e conectadas quando você fornecer as chaves.
- Deploy na Vercel e roteamento de domínio (`/`, `/suporte`, `/erp`) são finalizados após a implementação, sem alterar a landing.
- Nenhuma tarefa executa DELETE de dados de atendimento (retenção permanente).
