# Synova Sistemas

Plataforma da Synova Sistemas: um **monorepo** com o site institucional, o ERP/CRM interno e o
suporte inteligente (chat com IA), servidos por um único app Next.js na Vercel + Supabase na nuvem.

## Partes do projeto

1. **Site institucional (landing page)** — site público em HTML/CSS/JS (template Tooplate 2144
   customizado). Fica em `plataforma/apps/admin/public/` e é servido pelo próprio app Next (a rota
   `/` reescreve para `home.html`). É a área do front-end.
2. **ERP / CRM** (`/erp`) — cockpit interno: cadastro de sistemas/clientes, contexto, base de
   conhecimento, configuração de IA, integração do widget e gestão de admins.
3. **Suporte / Chat** (`/meu-atendimento` + widget) — painel de conversas/tickets/notificações/
   métricas + widget embutível com IA.

---

## Estrutura do repositório

```
.
├── README.md
├── ABOUT THIS TEMPLATE.txt
├── .github/                            # CI (testes + builds)
├── .kiro/                              # specs, steering e hooks do Kiro
└── plataforma/                         # Monorepo (pnpm + Turborepo)
    ├── apps/
    │   ├── admin/                      # Next.js 16 (App Router)
    │   │   ├── app/
    │   │   │   ├── (auth)/login/       # login do admin
    │   │   │   ├── erp/                # ERP/CRM
    │   │   │   ├── meu-atendimento/    # painel de suporte
    │   │   │   └── api/widget/         # APIs públicas do widget
    │   │   ├── public/                 # landing estática (área do front-end)
    │   │   └── proxy.ts                # guard de auth (/erp, /meu-atendimento, /api/admin)
    │   └── widget/                     # widget embutível (Vite → embed.js, Shadow DOM)
    ├── packages/
    │   ├── ai/                         # provedores (OpenAI/Anthropic/Google) + RAG + classificação
    │   ├── database/                   # cliente Supabase + tipos + acesso escopado
    │   ├── shared/                     # schemas Zod, enums, HMAC/JWT, CORS, rate limit
    │   └── ui/                         # componentes shadcn/ui compartilhados
    └── supabase/                       # migrations + RLS
```

---

## Stack

- **App:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion.
- **Estado / dados:** TanStack Query, Zustand, React Hook Form, Zod.
- **Widget:** TypeScript + Vite (bundle IIFE em Shadow DOM), sem dependências pesadas.
- **Backend:** Route Handlers e Server Actions do Next.
- **Banco / infra:** Supabase (PostgreSQL + Auth + Storage + pgvector), na nuvem.
- **IA:** provedor plugável (OpenAI / Anthropic / Google). Ativo hoje: **Google Gemini**
  (`gemini-2.5-flash` no chat, `gemini-embedding-001` a 1536 dims nos embeddings).
- **Deploy:** Vercel — o app Next serve a landing em `/`, o cockpit e as APIs do widget no mesmo domínio.
- **Testes:** Vitest (unit / integração) + CI no GitHub Actions.

### Planejado / opcional (ainda não integrado)
Resend (convite de admin por e-mail), Sentry (`SENTRY_DSN` — já há hook de observabilidade
drop-in), Redis/Upstash (rate limit compartilhado) e Stripe (cobrança, caso vire SaaS self-service).

---

## Pré-requisitos
- Node.js >= 20
- pnpm (via `corepack`)
- Conta Supabase (o schema já está aplicado na nuvem)

## Como rodar
```bash
cd plataforma
pnpm install
pnpm dev        # sobe o app admin
pnpm test       # roda a suíte (Vitest)
```

## Variáveis de ambiente
Crie `plataforma/apps/admin/.env.local` (base em `plataforma/.env.example`). Mínimo:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `APP_ENCRYPTION_KEY` (criptografia das chaves de IA)
- chave do provedor de IA (ex.: Google) quando for usar a IA

## Deploy
- Projeto na Vercel com **Root Directory = `plataforma/apps/admin`** e framework **Next.js**;
  deploy automático a cada push na `main`.
- O widget é gerado por `pnpm --filter @synova/widget build` e versionado em
  `apps/admin/public/widget/embed.js`.

---

## Status
- [x] Monorepo, banco + RLS, autenticação do admin
- [x] ERP/CRM (sistemas, contexto, base de conhecimento, IA, integração)
- [x] IA + RAG (motor de contexto, classificação, degradação graciosa)
- [x] Widget embutível (chat, tickets em modal, thread, anexos, histórico)
- [x] Painel de suporte (conversas, tickets, notificações, métricas)
- [x] Papéis Dono/Atendente + auditoria
- [x] Deploy na Vercel + Supabase na nuvem
