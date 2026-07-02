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

## Como rodar a bateria automatizada
Na pasta `plataforma`:
- `pnpm test` — roda todos os testes (deve dar tudo verde)
- `pnpm --filter @synova/admin build` — confere o build de produção
