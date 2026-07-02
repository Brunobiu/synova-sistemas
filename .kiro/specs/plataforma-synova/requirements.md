# Documento de Requisitos — Plataforma Synova (ERP + Suporte Inteligente)

## Introdução

A **Plataforma Synova** é a ferramenta de controle interna da empresa, composta por duas
áreas **interligadas** que compartilham o mesmo backend e modelo de dados:

1. **ERP (painel de controle do dono)** — onde o dono cadastra e organiza **todos os
   projetos/sistemas** que ele criou (próprios ou vendidos para clientes), exibidos como
   cards visuais lado a lado. Dentro de cada projeto ficam: imagem/logo, dados do cliente
   (nome, telefone), um **contexto grande do sistema** (tudo que o sistema oferece,
   funcionalidades, regras), anotações/especificações, a **lista de usuários** daquele
   sistema e a **configuração de IA** (provedor + chave).

2. **Suporte Inteligente (multi-tenant)** — centraliza chats, tickets, documentação e
   atendimento com IA + humano para os clientes de todos os sistemas. Cada sistema externo
   integra um **widget flutuante** via **chave de integração exclusiva**. Todas as
   interações chegam a um **painel central protegido**.

**A interligação é o coração da plataforma:** quando um chat/ticket chega, o suporte
identifica o **sistema**, a **empresa** e o **usuário** de origem e lê, no ERP, o **contexto
daquele sistema** e o **cadastro daquele usuário** para responder de forma correta e
personalizada (ex.: "Olá Matheus, tudo bem? Como posso ajudar?").

**Contexto técnico:**
- Código no monorepo já criado (`plataforma/`). A landing atual na raiz permanece intocada.
- ERP e Suporte são áreas **protegidas por login**, de uso do dono/administradores. O painel de suporte fica acessível em `/suporte`. O widget é a única superfície pública (autenticada por chave).
- Stack: Next.js, React, TypeScript, Tailwind, shadcn/ui, Framer Motion, TanStack Query, Zustand, React Hook Form, Zod, Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector). Sentry para monitoramento. Redis opcional para cache/rate limiting.
- IA multi-provedor: **OpenAI, Anthropic (Claude) e Google (Gemini)**. As chaves são configuradas no ERP; a plataforma usa o provedor conforme a chave ativa.
- Idioma dos atendimentos: **português** (por enquanto).

**Decisões já tomadas:**
- Sem pagamentos (Stripe) por enquanto.
- Sem notificações por e-mail ou WhatsApp por enquanto — as notificações ficam **apenas no painel**, com os itens **críticos destacados em vermelho e no topo**.
- **Nunca apagar** dados: todas as conversas e tickets (inclusive resolvidos) ficam guardados permanentemente.

## Glossário

- **Sistema (SaaS) — Nível 1:** um produto/projeto criado pelo dono (ex.: SaaS Barbearia). No ERP é representado por um card. Possui `system_id` e `support_api_key` única.
- **Empresa cliente (Tenant) — Nível 2:** cliente que usa um Sistema (ex.: "Distribuidora Souza"). Identificada por `tenant_id`. Guarda contato (nome, telefone) e configurações próprias.
- **Usuário final — Nível 3:** pessoa que usa o Sistema e abre suporte (ex.: "usuário 9 = Matheus"). Identificada por `user_id`.
- **Contexto do sistema:** texto/estrutura grande, cadastrado no ERP, que descreve tudo que o Sistema oferece. É a base de conhecimento principal que a IA lê.
- **Administrador:** o dono (e, futuramente, admins convidados) que acessa ERP e painel de suporte.
- **Widget:** componente flutuante embutido nos Sistemas externos.
- **support_api_key:** chave exclusiva por Sistema, usada para autenticar/identificar chamadas do widget.
- **Provedor de IA:** OpenAI, Anthropic ou Google, selecionado pela chave configurada no ERP.

---

## Requisitos

> Seção A — ERP (painel de controle e origem do contexto)

### Requisito 1 — Hierarquia multi-tenant (Sistema → Empresa → Usuário)

**História:** Como administrador, quero uma hierarquia clara de Sistema → Empresa → Usuário, para organizar e isolar os dados de cada projeto.

**Critérios de aceitação:**
1. QUANDO um Sistema é cadastrado, ENTÃO a plataforma DEVE registrar `system_id` único, nome, imagem/logo, `support_api_key` única, status, configuração de suporte, configuração de IA e contexto do sistema.
2. QUANDO uma Empresa (Tenant) é criada, ENTÃO a plataforma DEVE vinculá-la a um `system_id` e registrar `tenant_id`, nome, contato (nome/telefone), plano, configurações próprias e base de conhecimento própria.
3. QUANDO um Usuário final é criado, ENTÃO a plataforma DEVE vinculá-lo a um `tenant_id` e registrar `user_id`, identificador/rótulo (ex.: "usuário 9"), nome, email, cargo/perfil, permissões e setor.
4. Toda interação de suporte DEVE identificar simultaneamente `system_id`, `tenant_id` e `user_id`.
5. SE uma entidade referenciar um pai inexistente, ENTÃO a plataforma DEVE rejeitar a operação com erro de validação.
6. ONDE um Sistema é vendido para um único cliente, a plataforma DEVE permitir um Tenant primário que carregue o contato do cliente, sem exigir configuração complexa.

### Requisito 2 — ERP: hub visual de projetos/sistemas

**História:** Como dono, quero ver todos os meus projetos como cards lado a lado, para ter uma visão geral e entrar em cada um rapidamente.

**Critérios de aceitação:**
1. O ERP DEVE exibir todos os Sistemas como cards (containers) com imagem/logo, nome, status e indicador de próprio vs. cliente.
2. O dono DEVE poder criar, editar, arquivar e reordenar os cards de Sistemas.
3. QUANDO o dono clica em um card, ENTÃO a plataforma DEVE abrir a página do Sistema com todos os seus detalhes (contexto, cliente, usuários, IA, documentação, suporte).
4. O ERP DEVE permitir marcar um projeto como "próprio" ou "de cliente".
5. O ERP DEVE suportar muitos Sistemas (dezenas/centenas) com busca e filtro por nome/status.
6. Todo acesso ao ERP DEVE exigir autenticação de administrador (ver Requisito 18).

### Requisito 3 — ERP: dados e contexto de cada projeto

**História:** Como dono, quero cadastrar em cada projeto o contato do cliente e um contexto grande do sistema, para a IA ter tudo que precisa para atender.

**Critérios de aceitação:**
1. Cada Sistema DEVE permitir cadastrar contato do cliente (nome, telefone) quando for um projeto de cliente.
2. Cada Sistema DEVE permitir um **contexto do sistema** extenso (o que o sistema oferece, funcionalidades, regras, fluxos), editável a qualquer momento.
3. Cada Sistema DEVE permitir anotações/especificações livres do dono.
4. QUANDO o contexto ou a documentação de um Sistema é salvo, ENTÃO a plataforma DEVE indexá-lo para busca semântica (ver Requisito 11).
5. O contexto do sistema DEVE ser a fonte primária consultada pela IA ao atender usuários daquele Sistema.

### Requisito 4 — ERP: registro de usuários por sistema (atendimento personalizado)

**História:** Como dono, quero cadastrar os usuários de cada sistema (número → pessoa), para a IA saber com quem está falando e responder pelo nome.

**Critérios de aceitação:**
1. Cada Sistema DEVE permitir cadastrar seus usuários finais com rótulo/número, nome, email, cargo/perfil e setor.
2. QUANDO um chat/ticket chega com um identificador de usuário, ENTÃO a plataforma DEVE resolver esse identificador para a pessoa cadastrada (ex.: "usuário 9" → "Matheus").
3. QUANDO a IA responde, ENTÃO DEVE usar o nome da pessoa e o contexto correto do Sistema.
4. SE o usuário de origem não estiver cadastrado, ENTÃO a plataforma DEVE atender mesmo assim de forma genérica e registrar que o usuário é desconhecido.

### Requisito 5 — ERP: configuração multi-provedor de IA

**História:** Como dono, quero configurar as chaves de IA no ERP, para escolher qual provedor a plataforma usa apenas colocando a chave.

**Critérios de aceitação:**
1. O ERP DEVE permitir configurar chaves de **OpenAI, Anthropic (Claude) e Google (Gemini)**.
2. QUANDO uma chave de um provedor é configurada e ativada, ENTÃO a plataforma DEVE passar a usar esse provedor para as respostas de IA.
3. As chaves de IA DEVEM ser armazenadas de forma segura (criptografadas em repouso) e NUNCA expostas ao cliente/browser nem em logs.
4. A plataforma DEVE abstrair os três provedores atrás de uma interface comum, de modo que trocar de provedor não exija mudança no restante do sistema.
5. SE nenhuma chave estiver configurada/ativa, ENTÃO a plataforma DEVE degradar graciosamente (encaminhar para humano) e sinalizar no painel que a IA está indisponível.
6. ONDE fizer sentido, a plataforma PODE permitir provedor específico por Sistema (opcional/futuro), mantendo um padrão global.

### Requisito 6 — Interligação ERP ↔ Suporte

**História:** Como dono, quero que o suporte leia automaticamente o contexto e os cadastros do ERP, para que a IA atenda com base no conhecimento de cada sistema.

**Critérios de aceitação:**
1. QUANDO uma mensagem chega ao suporte, ENTÃO a plataforma DEVE carregar o contexto do Sistema, o Tenant e o Usuário correspondentes a partir dos dados do ERP.
2. A IA NÃO DEVE responder sem antes carregar o contexto do Sistema de origem.
3. QUANDO o dono atualiza o contexto de um Sistema no ERP, ENTÃO os próximos atendimentos daquele Sistema DEVEM refletir a atualização.
4. A leitura de contexto DEVE respeitar o isolamento entre tenants (Requisito 8).

> Seção B — Suporte, widget e IA

### Requisito 7 — Chave de integração e autenticação entre sistemas

**História:** Como dono, quero uma chave exclusiva por Sistema, para autenticar as chamadas do widget com segurança e sem falsificação.

**Critérios de aceitação:**
1. Cada Sistema DEVE possuir uma `support_api_key` única e revogável.
2. QUANDO o widget chama a API, ENTÃO DEVE enviar `support_api_key`, assinatura segura (HMAC) e metadata do Sistema.
3. QUANDO a API recebe a chamada, ENTÃO DEVE validar chave e assinatura antes de processar.
4. SE a chave for inválida/revogada ou a assinatura não conferir, ENTÃO a plataforma DEVE rejeitar com HTTP 401 e registrar em `audit_logs`.
5. A plataforma DEVE suportar expiração/rotação de sessões e convivência temporária de chave antiga + nova, sem quebrar integrações.
6. A plataforma DEVE impedir spoofing validando assinatura e origem (allowlist de domínios por Sistema, quando configurada).

### Requisito 8 — Isolamento crítico entre tenants

**História:** Como administrador, quero isolamento total entre sistemas, empresas e usuários, para que nenhum dado vaze entre tenants.

**Critérios de aceitação:**
1. Qualquer consulta DEVE retornar exclusivamente dados do `system_id`/`tenant_id` autenticado.
2. A plataforma DEVE habilitar Row Level Security (RLS) em todas as tabelas multi-tenant.
3. SE uma requisição tentar acessar dados de outro tenant, ENTÃO a plataforma DEVE negar e registrar em `audit_logs`.
4. Nenhuma `support_api_key` DEVE acessar dados de outro Sistema.
5. Anexos no Storage DEVEM ser isolados por `system_id`/`tenant_id`, com URLs assinadas e expiráveis.
6. Testes automatizados de isolamento DEVEM existir e passar antes de qualquer deploy.

### Requisito 9 — Widget de suporte flutuante e reutilizável

**História:** Como dono, quero um widget flutuante instalável via chave, para oferecer suporte dentro de qualquer sistema meu.

**Critérios de aceitação:**
1. O widget DEVE ser embutível em qualquer Sistema externo via snippet de script + `support_api_key`.
2. O widget DEVE oferecer: chat flutuante, abertura de ticket, envio de texto, imagem, arquivo/anexos, histórico recente, indicador de status e notificações de resposta.
3. QUANDO o usuário abre o widget, ENTÃO o Sistema DEVE enviar o contexto autenticado (system/tenant/user + metadata).
4. QUANDO o contexto chega, ENTÃO a IA DEVE analisá-lo e responder; e SE necessário, escalar para ticket humano.
5. O widget DEVE ser responsivo e ter estilo isolado (não conflitar com o CSS do Sistema hospedeiro).
6. SE a conexão cair, ENTÃO o widget DEVE indicar status offline e preservar a mensagem não enviada.

### Requisito 10 — Chat inteligente com IA (auto-resposta personalizada)

**História:** Como usuário final, quero que a IA responda dúvidas simples automaticamente e pelo meu nome, para resolver rápido.

**Critérios de aceitação:**
1. QUANDO uma dúvida simples/operacional/recorrente chega (ex.: "como emitir nota?", "onde altero a senha?"), ENTÃO a IA DEVE responder automaticamente usando o contexto do Sistema e o cadastro do Usuário.
2. A IA DEVE cumprimentar o usuário pelo nome quando ele estiver cadastrado.
3. A IA DEVE interpretar intenção, classificar urgência, resumir conversas, detectar erros e sugerir soluções.
4. QUANDO a IA responde, ENTÃO a plataforma DEVE registrar a resposta, a confiança estimada e as fontes de contexto usadas.
5. SE a IA tiver baixa confiança, ENTÃO DEVE escalar em vez de arriscar uma resposta incorreta (ver Requisito 13).
6. A IA NUNCA DEVE expor dados ou conhecimento de outro tenant.

### Requisito 11 — Motor de contexto da IA e base de conhecimento (busca semântica)

**História:** Como administrador, quero que a IA consulte a base correta antes de responder, para dar respostas precisas por sistema e por empresa.

**Critérios de aceitação:**
1. QUANDO a IA recebe uma mensagem, ENTÃO DEVE consultar nesta ordem: (1) contexto/base global do Sistema, (2) base específica da Empresa, (3) histórico do usuário, (4) conversas anteriores, (5) tickets anteriores, (6) estado atual do Sistema — e só então responder.
2. A plataforma DEVE indexar contexto e documentos com **embeddings/busca semântica** (pgvector no Supabase).
3. A base de conhecimento DEVE armazenar documentação técnica (regras, fluxos, APIs, módulos, limitações), operacional (FAQ, tutoriais, processos, manuais) e comercial (planos, limites, políticas, termos).
4. ONDE uma Empresa tem regras exclusivas, a plataforma DEVE priorizar a base da Empresa sobre a base global do Sistema.
5. A busca de contexto DEVE respeitar o isolamento por tenant.

### Requisito 12 — Sistema de tickets (atendimento humano)

**História:** Como usuário final, quero abrir tickets para assuntos críticos ou complexos, para ter atendimento humano.

**Critérios de aceitação:**
1. QUANDO um ticket é criado, ENTÃO a plataforma DEVE registrar `system_id`, `tenant_id`, `user_id`, categoria, descrição, prioridade e anexos opcionais.
2. Um ticket DEVE ter estados: aberto, em atendimento, escalado, aguardando cliente, resolvido e fechado.
3. QUANDO o estado muda, ENTÃO a plataforma DEVE registrar a transição (quem, quando, motivo).
4. Exemplos de ticket humano: bugs, erros sistêmicos, falha de integração, problemas financeiros, solicitações especiais e incidentes de produção.
5. A plataforma DEVE vincular a conversa de IA que originou o ticket ao próprio ticket.

### Requisito 13 — Escalonamento automático para humano

**História:** Como administrador, quero que a IA transfira para humano quando não puder resolver com segurança.

**Critérios de aceitação:**
1. QUANDO a IA detecta urgência alta, baixa confiança, reclamação, frustração, assunto sensível ou pedido fora da base, ENTÃO DEVE escalar automaticamente.
2. QUANDO ocorre escalonamento, ENTÃO a plataforma DEVE criar/atualizar um ticket com motivo e resumo da conversa.
3. QUANDO ocorre escalonamento, ENTÃO a plataforma DEVE gerar notificação no painel (Requisito 17).
4. SE o assunto for crítico, ENTÃO o escalonamento DEVE ser imediato e marcado como prioridade crítica.

### Requisito 14 — Classificação automática de prioridade

**História:** Como administrador, quero prioridade automática nos tickets, para atacar primeiro o mais urgente.

**Critérios de aceitação:**
1. A IA DEVE classificar cada ticket em: baixa, média, alta ou crítica.
2. SE envolver sistema fora do ar, erro financeiro, falha de pagamento, perda de dados ou erro de integração crítica, ENTÃO DEVE ser crítica.
3. QUANDO a prioridade é definida, ENTÃO o painel DEVE ordenar/destacar conforme a prioridade (crítico em vermelho, no topo).
4. O administrador DEVE poder reclassificar manualmente, com registro em auditoria.

> Seção C — Painel, notificações, dados e qualidade

### Requisito 15 — Painel administrativo central (tempo real)

**História:** Como administrador, quero um painel central com todos os atendimentos em tempo real, para gerenciar tudo em um lugar.

**Critérios de aceitação:**
1. O painel DEVE permitir ver chats e tickets, responder manualmente, assumir atendimento da IA e encerrar chamados.
2. O painel DEVE permitir filtrar por Sistema, Empresa e Usuário, e ver anexos e histórico completo.
3. QUANDO um admin assume um atendimento, ENTÃO a plataforma DEVE pausar as respostas automáticas naquela conversa.
4. O painel DEVE atualizar novos chats/tickets/mensagens em tempo real (Supabase Realtime).
5. Itens críticos DEVEM aparecer destacados (vermelho) e no topo da lista.
6. Toda ação no painel DEVE respeitar o isolamento e ser registrada em auditoria.

### Requisito 16 — Retenção permanente de dados (nunca apagar)

**História:** Como dono, quero que nada seja apagado, para manter todo o histórico de atendimentos para sempre.

**Critérios de aceitação:**
1. A plataforma NUNCA DEVE apagar conversas, chats, tickets ou mensagens, inclusive os resolvidos/fechados.
2. QUANDO um chamado é resolvido/fechado, ENTÃO ele DEVE permanecer consultável no histórico.
3. SE for necessário "remover" algo da visão principal, ENTÃO a plataforma DEVE apenas arquivar/ocultar, mantendo o dado no banco.
4. O histórico completo DEVE ser pesquisável por Sistema, Empresa, Usuário, status e período.

### Requisito 17 — Central de notificações (somente no painel)

**História:** Como administrador, quero uma central de notificações no painel, para não perder chats novos, tickets críticos e escalonamentos.

**Critérios de aceitação:**
1. A plataforma DEVE gerar notificações para: novo chat, novo ticket, ticket crítico, escalonamento da IA, arquivo enviado e erro sistêmico.
2. As notificações DEVEM ser agrupadas por Sistema, Empresa, prioridade e status.
3. As notificações DEVEM ficar **apenas no painel** (sem e-mail e sem WhatsApp por enquanto).
4. Itens críticos DEVEM ser destacados em vermelho e priorizados no topo.
5. QUANDO uma notificação é lida/resolvida, ENTÃO a plataforma DEVE atualizar seu estado (sem apagar o registro).

### Requisito 18 — Autenticação e autorização (acesso restrito ao dono)

**História:** Como dono, quero que apenas eu (e admins autorizados) acesse o ERP e o painel de suporte, protegido por senha.

**Critérios de aceitação:**
1. O acesso ao ERP e ao painel (`/suporte`) DEVE exigir autenticação (e-mail + senha via Supabase Auth).
2. SOMENTE usuários com papel de administrador DEVEM acessar; qualquer outro acesso DEVE ser negado.
3. Todas as rotas/APIs administrativas DEVEM ser protegidas no servidor, não apenas no cliente.
4. QUANDO há tentativas de login malsucedidas repetidas, ENTÃO a plataforma DEVE aplicar rate limiting e registrar o evento.
5. QUANDO o admin faz logout ou a sessão expira, ENTÃO a plataforma DEVE invalidar o acesso.
6. A plataforma DEVE permitir cadastrar admins adicionais por convite, mantendo o dono como admin inicial.

### Requisito 19 — Anexos e uploads seguros

**História:** Como usuário final, quero enviar imagens e arquivos no suporte, para explicar melhor meu problema.

**Critérios de aceitação:**
1. A plataforma DEVE aceitar imagens, PDFs, documentos, prints e, opcionalmente, vídeos pequenos.
2. QUANDO um arquivo é enviado, ENTÃO DEVE validar extensão e tamanho e bloquear tipos perigosos (ex.: executáveis).
3. A plataforma DEVE definir limites máximos de upload por tipo de arquivo.
4. SE exceder limite ou tipo proibido, ENTÃO DEVE rejeitar com mensagem clara.
5. Arquivos DEVEM ficar no Supabase Storage isolados por tenant, com URL assinada e expirável.
6. ONDE aplicável (imagens), a plataforma PODE comprimir para reduzir custo/tempo (opcional).

### Requisito 20 — Auditoria e logs de segurança

**História:** Como administrador, quero auditoria completa, para investigar incidentes e comprovar o isolamento.

**Critérios de aceitação:**
1. A plataforma DEVE registrar em `audit_logs`: validação/rejeição de chave, acessos negados, escalonamentos, mudanças de estado de ticket, uploads e ações administrativas.
2. Cada registro DEVE conter `system_id`, `tenant_id`, `user_id` (quando aplicável), ação, timestamp e origem.
3. Os registros DEVEM ser somente-adição (imutáveis pela aplicação).
4. O administrador DEVE poder consultar e filtrar os logs no painel, respeitando o isolamento.

### Requisito 21 — Métricas e analytics

**História:** Como administrador, quero um dashboard de métricas, para acompanhar desempenho e qualidade.

**Critérios de aceitação:**
1. O dashboard DEVE exibir tickets por Sistema e por Empresa.
2. O dashboard DEVE exibir tempo médio de resposta da IA e tempo médio humano.
3. O dashboard DEVE exibir taxa de resolução automática e taxa de escalonamento.
4. O dashboard DEVE exibir índice de satisfação (quando coletado).
5. As métricas DEVEM respeitar o isolamento por tenant nos filtros.

### Requisito 22 — Modelo de dados

**História:** Como desenvolvedor, quero um modelo de dados bem estruturado, para suportar isolamento, auditoria, contexto de IA e escala.

**Critérios de aceitação:**
1. A plataforma DEVE possuir, no mínimo, as entidades: `systems`, `tenants`, `users`, `system_context`/`knowledge_docs`, `ai_provider_config`, `support_sessions`, `chats`, `tickets`, `messages`, `attachments`, `ai_context`, `notifications`, `audit_logs`.
2. Todas as tabelas multi-tenant DEVEM ter as chaves de escopo (`system_id` e, quando aplicável, `tenant_id`) e RLS habilitado.
3. `knowledge_docs` DEVE suportar coluna de embeddings (pgvector) para busca semântica.
4. O modelo DEVE definir relacionamentos, integridade referencial e índices para as consultas frequentes (por sistema, empresa, status, prioridade).
5. As migrações DEVEM ser versionadas em `supabase/migrations`.

### Requisito 23 — Segurança geral (rate limiting, abuso, tokens)

**História:** Como dono, quero proteções de segurança em toda a plataforma, para resistir a abuso e ataques.

**Critérios de aceitação:**
1. A plataforma DEVE aplicar rate limiting por `support_api_key` e por IP nos endpoints públicos do widget.
2. A plataforma DEVE validar e sanitizar toda entrada com Zod, no cliente e no servidor.
3. A plataforma DEVE usar HTTPS, CORS restrito por Sistema e cabeçalhos de segurança.
4. Segredos (chave de serviço do Supabase, chaves de IA) DEVEM ficar em variáveis de ambiente/armazenamento seguro, nunca no cliente.
5. SE for detectado abuso (volume anômalo), ENTÃO a plataforma DEVE limitar/bloquear temporariamente e registrar.
6. As respostas de erro NÃO DEVEM vazar detalhes internos (stack traces, chaves, IDs de outros tenants).

### Requisito 24 — Qualidade, testes e resiliência

**História:** Como dono, quero testes abrangentes e robustez, para atender milhares de empresas com segurança.

**Critérios de aceitação:**
1. A plataforma DEVE ter testes automatizados de **entrada e saída de dados** (payloads, contratos de API e respostas), cobrindo casos válidos e inválidos.
2. A plataforma DEVE ter testes de **isolamento multi-tenant**.
3. A plataforma DEVE ter testes de **segurança** (chave, autenticação, rate limiting, uploads perigosos).
4. A plataforma DEVE ter testes de **falha** (IA/dependências indisponíveis, timeouts) com degradação graciosa.
5. A plataforma DEVE ter testes de **carga** para os endpoints críticos.
6. A plataforma DEVE ter monitoramento (Sentry) e logs completos.
7. ANTES de qualquer deploy, a plataforma DEVE validar que: nenhum tenant acessa outro, nenhuma `support_api_key` interfere em outra e nenhuma atualização quebra integrações existentes.
8. O deploy DEVE permitir rollback seguro.

### Requisito 25 — Acesso e implantação

**História:** Como dono, quero acessar o ERP e o suporte de qualquer lugar e ter o widget disponível para os sistemas.

**Critérios de aceitação:**
1. O painel de suporte DEVE ser acessível em `/suporte` no domínio, de qualquer lugar, após autenticação.
2. O ERP DEVE ser acessível como área protegida (ex.: `/erp`), somente para administradores.
3. A aplicação DEVE ser implantável na Vercel a partir de `plataforma/`.
4. O widget DEVE ser servido como script embutível e versionado, para inclusão nos Sistemas externos.
5. A landing page atual (na raiz) NÃO DEVE ser afetada por esta plataforma.

---

## Fora de escopo (por enquanto)
- Pagamentos (Stripe).
- Notificações por e-mail (Resend) e por WhatsApp.
- Aplicativos móveis nativos (o widget é web/responsivo).
- Exclusão de dados (por decisão de produto, nada é apagado).
