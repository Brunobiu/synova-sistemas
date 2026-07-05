# Pauta de testes — Plataforma Synova

Guia pra você validar na mão o que já foi construído. Marque os itens conforme for testando.
O que é "só backend" (sem tela ainda) está coberto por testes automatizados (`pnpm test`) e fica
totalmente testável na mão quando o widget e as APIs entrarem (Blocos 9 e 11).

## Pré-requisitos
- [ ] Servidor de desenvolvimento rodando: na pasta `plataforma/apps/admin`, rode `pnpm dev` e abra http://localhost:3000
- [ ] Fazer login em `/login` com o e-mail admin (`brunobiuu@proton.me`) e cair no `/erp`

---

## Bloco 4 — Hub de projetos (`/erp`)
- [ ] A lista mostra os sistemas em cards (imagem, nome, status, Próprio/Cliente)
- [ ] Busca por nome filtra os cards e a busca continua na aba certa
- [ ] Abas "Ativos" e "Arquivados" separam corretamente
- [ ] "Novo sistema": criar gera a chave `pk_...` e mostra o segredo `sk_...` **uma vez** na tela
- [ ] Arquivar um sistema tira ele dos Ativos e ele aparece em Arquivados; Restaurar volta

## Bloco 5 — Detalhe do sistema (`/erp/systems/[id]`)
- [ ] Abrir um sistema pelo card
- [ ] Seção **Cliente**: salvar nome e telefone e recarregar mostra o que foi salvo
- [ ] Seção **Contexto do sistema**: salvar contexto + anotações e persistir após recarregar
- [ ] Seção **Usuários**: adicionar um usuário (ex.: identificador "9", nome, e-mail) aparece na lista
- [ ] Remover um usuário funciona

## Bloco 6 — Base de conhecimento + IA + Widget
### Base de conhecimento (na página do sistema)
- [ ] Adicionar documento (escolher Tipo e Escopo "Todo o sistema" vs "Só do cliente")
- [ ] O documento aparece na lista com as etiquetas de Tipo e Escopo
- [ ] "Editar" carrega o documento no formulário e salva as alterações
- [ ] "Remover" apaga o documento

### Configuração de IA (`/erp/ia`, link "IA" no topo)
- [ ] Salvar uma chave de um provedor (OpenAI, Anthropic ou Google) — o cartão passa a "Configurado"
- [ ] Recarregar a página: a chave **não** volta preenchida (fica mascarada) — é o esperado (segurança)
- [ ] "Testar conexão" com uma chave válida retorna "Conexão OK"; com chave errada, retorna erro
- [ ] "Ativar" marca o provedor como Ativo e desmarca os outros
- [ ] "Remover" limpa a configuração do provedor
- Observação: a busca semântica (embeddings) só liga no Bloco 8; aqui só guardamos os documentos e as chaves.

### Integração do widget (na página do sistema)
- [ ] A chave pública aparece com botão "Copiar"
- [ ] O "snippet de instalação" aparece e pode ser copiado (troque `SEU_DOMINIO` depois do deploy)
- [ ] Domínios permitidos: colocar um por linha (ex.: `https://app.cliente.com`) e salvar
- [ ] Salvar um domínio inválido (ex.: `cliente.com` sem `https://`) mostra erro
- [ ] "Rotacionar segredo": pede confirmação e mostra o novo segredo **uma vez**

## Bloco 7 — Segurança de borda do widget (backend)
Coberto por testes automatizados (rode `pnpm test` na pasta `plataforma`). Fica testável na mão
quando o widget e as APIs entrarem (Blocos 9 e 11). O que os testes garantem:
- [ ] Token assinado inválido/adulterado/expirado é rejeitado
- [ ] Segredo anterior continua válido por um tempo após a rotação (não quebra instalações)
- [ ] Origem fora da allowlist é bloqueada (CORS)
- [ ] Rate limit devolve 429 quando estoura o limite
- [ ] Mensagens de erro não vazam detalhes internos

---

## Blocos 8 a 10 — Motor de IA, API do widget e anexos (backend)
Cobertos por testes automatizados (`pnpm test`). Ficam totalmente testáveis na mão pelo widget (abaixo):
- [ ] Motor de IA: resposta estruturada, contexto com precedência empresa>sistema, escalonamento
- [ ] API do widget: sessão (handshake), mensagem (RAG + resposta/escala), ticket, histórico
- [ ] Anexos: tipos permitidos, bloqueio de perigosos, limite de tamanho, URL assinada

## Bloco 11 — Widget embutível (dá pra testar o chat de ponta a ponta)
Pré-requisitos:
- [ ] Ter um sistema criado no ERP com a chave pública (`pk_...`) à mão
- [ ] Adicionar `http://localhost:3000` aos **domínios permitidos** do sistema (aba Integração)
- [ ] (Opcional, para IA responder) Configurar e ativar uma chave de IA em `/erp/ia`

Passos:
- [ ] Com o `pnpm dev` rodando, abrir `http://localhost:3000/widget/demo.html`
- [ ] Editar o `data-synova-key` do demo com a sua chave `pk_...` (o arquivo fica em `apps/admin/public/widget/demo.html`)
- [ ] Clicar no botão flutuante (canto inferior direito) e enviar uma mensagem
- [ ] Com IA ativa: recebe resposta automática; pergunta "crítica" (ex.: "o sistema caiu") deve escalar e abrir chamado
- [ ] Sem IA ativa: encaminha para humano e abre chamado (degradação graciosa)
- [ ] Testar "Abrir chamado" e o envio de um anexo (imagem/PDF)
- [ ] As conversas/tickets ficam no banco (aparecerão no painel de suporte — Bloco 12)

Observação: o `embed.js` é gerado do app `apps/widget`. Para regenerar após mudanças: `pnpm --filter @synova/widget build`.

## Bloco 12 — Painel de suporte (`/suporte`)
Aqui você vê e responde o que o widget cria. Link "Suporte" no topo do ERP.
- [ ] Depois de conversar pelo widget, abrir `/suporte`: a conversa/ticket aparece
- [ ] Tickets críticos aparecem em vermelho no topo; filtrar por sistema/status; buscar por assunto
- [ ] Abrir uma conversa: ver histórico (cliente/IA), anexos com link, e o ticket vinculado
- [ ] "Assumir da IA" pausa a auto-resposta; responder como atendente aparece no chat
- [ ] "Devolver para a IA" reativa; "Encerrar" e "Arquivar" (a conversa some da lista, sem apagar)
- [ ] Reclassificar a prioridade do ticket e "Resolver" (fica auditado)
- [ ] A lista/conversa atualiza sozinha a cada poucos segundos (near-real-time por polling)

Dica: para o ciclo completo, deixe o widget aberto numa aba e o `/suporte` em outra.

## Blocos 14 e 15 — Métricas, auditoria, CI e resiliência
- [ ] `/suporte/metricas`: tickets por sistema/prioridade/status, taxa de escalonamento e de resolução automática
- [ ] Ações sensíveis geram log de auditoria (escalonamento, ticket, rotação de chave, acesso negado)
- [ ] CI (GitHub Actions) roda testes + builds a cada push/PR (`.github/workflows/ci.yml`)
- [ ] Resiliência: com IA fora/erro/timeout, o atendimento encaminha para humano sem quebrar

## Pré-deploy (quando for publicar na Vercel)
- Configurar as variáveis do `apps/admin/.env.example` no projeto da Vercel
- (Opcional) `SENTRY_DSN` para captura de erros
- Teste de carga manual: `BASE=... KEY=pk_... ORIGIN=... node scripts/load-test.mjs`

## Como rodar a bateria automatizada
Na pasta `plataforma`:
- `pnpm test` — roda todos os testes (deve dar tudo verde)
- `pnpm --filter @synova/admin build` — confere o build de produção
- `pnpm build` — builda tudo (widget + admin) via turbo
