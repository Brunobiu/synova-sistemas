# Synova Sistemas

Plataforma da Synova Sistemas. O projeto é dividido em **três partes independentes**:

1. **Site institucional (landing page)** — o site público que fica em `seudominio.com.br`.
   Feito em HTML, CSS e JavaScript puros (template Tooplate 2144 customizado).
   **Não usa** a stack abaixo e permanece na **raiz do repositório, intocado.**
2. **ERP / CRM** — sistema de gestão interno (em construção).
3. **Suporte / Chat** — atendimento ao cliente (em construção).

As partes **2** e **3** ficam no monorepo dentro de `plataforma/` e usam a stack moderna descrita abaixo.

---

## Estrutura do repositório

```
.
├── index.html, home.html            # Landing page (vanilla, NÃO tocar)
├── tooplate-*.css / tooplate-*.js   # Estilos e scripts da landing
├── fotos/  images/                  # Assets da landing
├── README.md
└── plataforma/                      # Monorepo (pnpm + Turborepo)
    ├── apps/
    │   ├── erp/                      # ERP/CRM (Next.js)
    │   └── suporte/                 # Chat de suporte (Next.js)
    ├── packages/
    │   ├── database/                # Cliente Supabase + tipos compartilhados
    │   └── ui/                       # Componentes shadcn/ui compartilhados
    └── supabase/                     # Migrations e config do Supabase
```

---

## Stack (usada apenas dentro de `plataforma/`)

### Frontend
- **Next.js** — framework React (App Router)
- **React** — biblioteca de UI
- **TypeScript** — tipagem estática
- **Tailwind CSS** — estilização utilitária
- **shadcn/ui** — componentes de UI
- **Framer Motion** — animações

### Estado / Dados
- **TanStack Query** — data fetching e cache
- **Zustand** — estado global leve
- **React Hook Form** — formulários
- **Zod** — validação de schemas

### Backend / API
- **Next.js API Routes** — padrão do projeto
- **NestJS** — alternativa para serviços maiores/dedicados
- **tRPC** — opcional (tipagem ponta a ponta)

### Banco / Infra
- **Supabase** — PostgreSQL + Auth + Storage
- **Redis** — cache (opcional)

### Deploy
- **Vercel** — frontend + backend leve

### Extras
- **Resend** — envio de e-mails
- **Stripe** — pagamentos
- **Sentry** — monitoramento de erros

---

## Pré-requisitos
- Node.js >= 20 (ambiente atual: v22)
- pnpm (habilitado via `corepack`)
- Supabase CLI
- Contas: GitHub, Supabase, Vercel

## Como rodar (após o scaffold dos apps)
```bash
cd plataforma
pnpm install
pnpm dev
```

## Variáveis de ambiente
Use `plataforma/.env.example` como base e crie um `.env.local` em cada app.

## Deploy
- Cada app (`erp`, `suporte`) vira um projeto na Vercel apontando para o seu subdiretório dentro de `plataforma/`.
- A landing page continua servida como site estático.

---

## Status
- [x] Auditoria de ambiente e conexões
- [x] Estrutura base do monorepo
- [x] README com a stack completa
- [x] Supabase inicializado (config local + pacote @synova/database)
- [ ] Scaffold do app ERP/CRM
- [ ] Scaffold do app Suporte/Chat
- [ ] Conexão Supabase (chaves)
- [ ] Deploy Vercel
