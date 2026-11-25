# PriceHook — Plano da v1

Monitor de preços e disponibilidade com alertas via Webhook do Discord.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Prisma + PostgreSQL, Cheerio, Cron Job via rota de API protegida.

---

## Schema do banco (Prisma)

### `Product`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | `String` (cuid) | PK |
| `url` | `String` | URL do produto (única) |
| `store` | `Store` (enum) | `AMAZON_BR` \| `KABUM` |
| `title` | `String?` | Preenchido no primeiro scrape bem-sucedido |
| `targetPrice` | `Decimal` | Preço-alvo do usuário |
| `webhookUrl` | `String` | Webhook do Discord |
| `lastPrice` | `Decimal?` | Último preço conhecido |
| `lastCheckedAt` | `DateTime?` | Última verificação (ok ou falha) |
| `lastAlertSentAt` | `DateTime?` | Evita alerta duplicado enquanto o preço permanece ≤ alvo |
| `lastError` | `String?` | Última falha (403/429/timeout/parse) |
| `isActive` | `Boolean` | Default `true` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

### `PriceHistory`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | `String` (cuid) | PK |
| `productId` | `String` | FK → `Product` |
| `price` | `Decimal` | Preço capturado |
| `available` | `Boolean` | Disponibilidade no momento do scrape |
| `scrapedAt` | `DateTime` | Default `now()` |

**Índices sugeridos:** `Product.url` (unique), `PriceHistory(productId, scrapedAt)`.

**Regra anti-duplicata de alerta:** disparar Discord somente quando `price <= targetPrice` **e** (`lastAlertSentAt` é `null` **ou** o preço subiu acima do alvo desde o último alerta e voltou a cair). Na v1: só alerta se `lastAlertSentAt` for `null` ou se o preço atual for **estritamente menor** que `lastPrice` no momento em que já estava ≤ alvo — implementação concreta na Etapa 3.

---

## Estrutura de pastas

```
price-hook/
├── PLAN.md
├── .cursor/rules/project.mdc
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # UI: listar / cadastrar produtos
│   │   ├── actions/                 # Server Actions (cadastro)
│   │   └── api/
│   │       └── cron/
│   │           └── check-prices/
│   │               └── route.ts     # Cron protegido por CRON_SECRET
│   ├── lib/
│   │   ├── db.ts                    # Prisma client
│   │   ├── env.ts                   # Validação Zod das env vars
│   │   ├── scrapers/
│   │   │   ├── types.ts             # ScraperStrategy, ScrapeResult
│   │   │   ├── registry.ts          # resolveScraper(store | url)
│   │   │   ├── amazon.ts
│   │   │   └── kabum.ts
│   │   ├── alerts/
│   │   │   └── discord.ts           # Envio de webhook
│   │   └── services/
│   │       └── price-checker.ts     # Orquestra scrape → history → alert
│   └── components/                  # UI (formulário, lista)
└── .env.example
```

Separação clara: **scrapers** (extração), **alerts** (Discord), **services** (orquestração), **app** (rotas + UI).

---

## Etapas de implementação

### Etapa 1 — Fundação do projeto

- Scaffold Next.js (App Router) + TypeScript + Tailwind.
- Prisma schema (`Product`, `PriceHistory`, enum `Store`) + `src/lib/db.ts`.
- `src/lib/env.ts` com Zod (`DATABASE_URL`, `CRON_SECRET`).
- `.env.example` sem segredos reais.
- Página mínima confirmando que o app sobe.

**Critério de aceite:** `prisma generate` ok; app inicia; env inválida falha cedo.

### Etapa 2 — Scrapers (Strategy Pattern)

- Interface `ScraperStrategy` + `ScrapeResult` (`title`, `price`, `available`).
- Implementações Amazon BR e Kabum com Cheerio.
- `registry.ts` para resolver scraper por URL/store.
- Erros tipados (bloqueio 403/429, timeout, parse) — sem derrubar o caller.

**Critério de aceite:** script/rota de teste isolada retorna preço de 1 URL Amazon e 1 Kabum; falha simulada não crasha o processo.

### Etapa 3 — Cron + histórico + Discord

- `POST /api/cron/check-prices` protegido por header/Bearer `CRON_SECRET`.
- `price-checker.ts`: para cada produto ativo, scrape → salva `PriceHistory` → atualiza `Product` → alerta se elegível.
- Falha por produto: grava `lastError` / `lastCheckedAt` e segue para o próximo.
- `discord.ts`: payload simples (título, preço, URL, alvo).

**Critério de aceite:** cron autenticado processa N produtos; um 403 em um item não impede os demais; alerta dispara uma vez por condição elegível.

### Etapa 4 — UI de cadastro e listagem

- Formulário: URL, preço-alvo, webhook Discord (Zod no server action).
- Detecção automática da loja pela URL; rejeita lojas não suportadas.
- Lista de produtos com último preço, status e última verificação.
- Feedback de erro de validação e scrape inicial opcional.

**Critério de aceite:** usuário cadastra produto válido; lista reflete dados; URL inválida/loja não suportada retorna erro claro.

---

## Fora do escopo da v1

- Auth de usuários / multi-tenant
- Mais lojas além de Amazon BR e Kabum
- Dashboard de gráficos de histórico
- Fila (Bull/Redis) — processamento síncrono no cron é suficiente
