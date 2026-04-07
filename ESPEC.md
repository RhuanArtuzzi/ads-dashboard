# ESPEC TÉCNICA — Ominy Ads Dashboard

---

## 1. Stack Técnica

### Frontend
| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | SSR/SSG, roteamento, otimizações de imagem |
| Estilo | Tailwind CSS + shadcn/ui (tema customizado Ominy) | Componentes acessíveis, dark mode nativo |
| Tipografia | Orbitron (headings) + Roboto (corpo) via next/font | Identidade Ominy |
| Gráficos | Recharts + custom colors Ominy | Leve, composto, integra bem com React |
| Animações | Framer Motion | Transições e micro-interações premium |
| HTTP Client | Axios + React Query (TanStack Query v5) | Cache, revalidação, loading states |
| Ícones | Lucide React | Consistente com shadcn/ui |

### Backend
| Camada | Tecnologia | Justificativa |
|---|---|---|
| Runtime | Node.js 20 LTS + TypeScript | Ecossistema unificado com o frontend |
| Framework | Fastify v5 | Async nativo, schema validation, OpenAPI automático, alta performance |
| ORM | Prisma 5 | Migrations versionadas, type-safety total, client gerado |
| Validação | Zod | Schemas tipados para requests/responses, integra com Fastify |
| Banco | PostgreSQL 16 | Histórico de métricas, queries analíticas eficientes |
| Cache | Redis 7 + ioredis | Cache de métricas com TTL 1h |
| Agendamento | node-cron | Sync a cada 6h + resumo IA às 8h |
| IA / Agent | LangChain.js + Claude claude-sonnet-4-6 | Agente ReAct com ferramentas para análise de métricas |
| Meta Ads | Axios + Meta Marketing API v20 | API key via config file, sem OAuth no MVP |
| Auth | jsonwebtoken + bcryptjs | Tokens stateless JWT |
| Config YAML | js-yaml | Leitura do config/meta.yaml |

### Infraestrutura
| Serviço | Tecnologia |
|---|---|
| Containers | Docker + Docker Compose |
| Reverse proxy | Nginx (serve frontend build + proxy para backend) |
| Variáveis secretas | `.env` (não versionado) + `config/` (versionado, sem segredos) |

---

## 2. Estrutura de Pastas

```
ads-dashboard/
├── docker-compose.yml
├── .env.example
│
├── frontend/                          # Next.js 14
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── tailwind.config.ts             # Tema Ominy (cores + fontes)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx           # Home — visão geral
│   │   │   │   ├── clientes/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── meta/page.tsx      # Drill-down Meta Ads
│   │   │   │   ├── alertas/page.tsx
│   │   │   │   ├── ia/page.tsx        # Histórico de análises do agente
│   │   │   │   └── configuracoes/
│   │   │   │       ├── conexoes/page.tsx
│   │   │   │       └── clientes/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui (customizados com tema Ominy)
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCard.tsx     # Card com glow ciano
│   │   │   │   ├── GastoChart.tsx     # Recharts com gradiente ciano/púrpura
│   │   │   │   ├── CampanhaTable.tsx
│   │   │   │   └── AlertaBadge.tsx
│   │   │   └── ia/
│   │   │       └── ResumoAgente.tsx   # Exibe análise do agente LangChain
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios instance apontando para backend
│   │   │   └── queries/               # React Query hooks por domínio
│   │   └── styles/
│   │       └── globals.css            # Variáveis CSS Ominy
│
├── backend/                           # Fastify + Node.js + TypeScript
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma              # Models + migrations
│   │   └── seed.ts                    # Dados mockados para dev
│   ├── config/
│   │   ├── meta.yaml.example          # Template de config (versionado)
│   │   └── meta.yaml                  # Config real (ignorado pelo git)
│   └── src/
│       ├── server.ts                  # Entry point — Fastify app + plugins
│       ├── core/
│       │   ├── config.ts              # Lê .env com zod + variáveis tipadas
│       │   ├── database.ts            # Prisma client singleton
│       │   ├── redis.ts               # ioredis client singleton
│       │   └── security.ts            # JWT sign/verify helpers
│       ├── routes/                    # Fastify route plugins
│       │   ├── auth.ts
│       │   ├── metricas.ts
│       │   ├── clientes.ts
│       │   ├── alertas.ts
│       │   ├── ia.ts
│       │   └── sync.ts
│       ├── services/
│       │   ├── metaAds.ts             # Integração Meta Marketing API
│       │   ├── sync.ts                # Pipeline de sincronização
│       │   ├── alertas.ts             # Lógica de alertas
│       │   └── agenteIA.ts            # LangChain.js ReAct agent
│       ├── schemas/                   # Zod schemas (request/response)
│       │   ├── auth.ts
│       │   ├── metricas.ts
│       │   └── clientes.ts
│       └── jobs/
│           └── scheduler.ts           # node-cron (sync 6h + IA 8h)
```

---

## 3. Schema Prisma

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Usuario {
  id         String      @id @default(cuid())
  nome       String
  email      String      @unique
  senhaHash  String?
  role       Role        @default(VIEWER)
  criadoEm  DateTime    @default(now())
}

enum Role {
  ADMIN
  VIEWER
}

model Cliente {
  id         String      @id @default(cuid())
  nome       String
  targetCpl  Float?
  targetRoas Float?
  criadoEm  DateTime    @default(now())
  contas     ContaAds[]
  alertas    Alerta[]
}

model ContaAds {
  id          String      @id @default(cuid())
  clienteId   String
  cliente     Cliente     @relation(fields: [clienteId], references: [id])
  plataforma  Plataforma
  accountId   String
  accountName String
  ativa       Boolean     @default(true)
  ultimoSync  DateTime?
  campanhas   Campanha[]
  snapshots   SnapshotConta[]
}

enum Plataforma {
  META_ADS
}

model Campanha {
  id                    String           @id @default(cuid())
  contaId               String
  conta                 ContaAds         @relation(fields: [contaId], references: [id])
  campanhaIdPlataforma  String
  nome                  String
  status                StatusCampanha
  orcamentoDiario       Float?
  atualizadoEm         DateTime         @default(now())
  snapshots             SnapshotCampanha[]
}

enum StatusCampanha {
  ATIVA
  PAUSADA
  REMOVIDA
  EM_REVISAO
}

model SnapshotConta {
  id          String    @id @default(cuid())
  contaId     String
  conta       ContaAds  @relation(fields: [contaId], references: [id])
  data        DateTime  @db.Date
  gasto       Float
  impressoes  Int
  cliques     Int
  conversoes  Int
  cpl         Float?
  roas        Float?
  ctr         Float?
  criadoEm   DateTime  @default(now())

  @@unique([contaId, data])
}

model SnapshotCampanha {
  id          String    @id @default(cuid())
  campanhaId  String
  campanha    Campanha  @relation(fields: [campanhaId], references: [id])
  data        DateTime  @db.Date
  gasto       Float
  impressoes  Int
  cliques     Int
  conversoes  Int
  cpl         Float?
  roas        Float?
  ctr         Float?
  criadoEm   DateTime  @default(now())

  @@unique([campanhaId, data])
}

model Alerta {
  id        String     @id @default(cuid())
  clienteId String
  cliente   Cliente    @relation(fields: [clienteId], references: [id])
  tipo      TipoAlerta
  mensagem  String
  lido      Boolean    @default(false)
  criadoEm DateTime   @default(now())
}

enum TipoAlerta {
  CPL_ALTO
  ORCAMENTO_ESGOTANDO
  SEM_ENTREGA
  ROAS_BAIXO
  QUEDA_CTR
}

model ResumoIA {
  id       String   @id @default(cuid())
  data     DateTime @unique @db.Date
  conteudo String
  criadoEm DateTime @default(now())
}
```

---

## 4. Configuração Meta Ads (Config File)

```yaml
# backend/config/meta.yaml
contas:
  - nome: "Cliente A"
    account_id: "act_123456789"
    access_token: "EAAxxxx..."   # Token de longa duração (60 dias)
    cliente_id: "cuid-do-cliente-no-banco"

  - nome: "Cliente B"
    account_id: "act_987654321"
    access_token: "EAAyyyy..."
    cliente_id: "cuid-do-cliente-no-banco"

meta_api_version: "v20.0"
```

```typescript
// src/services/metaAds.ts
import axios from 'axios'

export async function buscarInsights(
  accountId: string,
  accessToken: string,
  datePreset = 'last_7d'
) {
  const { data } = await axios.get(
    `https://graph.facebook.com/v20.0/act_${accountId}/insights`,
    {
      params: {
        fields: 'spend,impressions,clicks,actions,ctr,campaign_name,campaign_id',
        date_preset: datePreset,
        level: 'campaign',
        access_token: accessToken,
      },
    }
  )
  return data
}
```

---

## 5. Agente LangChain.js (ReAct)

```typescript
// src/services/agenteIA.ts
import { ChatAnthropic } from '@langchain/anthropic'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { prisma } from '../core/database'

const llm = new ChatAnthropic({
  model: 'claude-sonnet-4-6',
  temperature: 0.3,
})

const buscarMetricasHoje = tool(
  async ({ clienteId }) => {
    const hoje = new Date()
    const snapshots = await prisma.snapshotConta.findMany({
      where: { conta: { clienteId }, data: hoje },
      include: { conta: true },
    })
    return JSON.stringify(snapshots)
  },
  {
    name: 'buscar_metricas_hoje',
    description: 'Busca as métricas de hoje para um cliente específico.',
    schema: z.object({ clienteId: z.string() }),
  }
)

const buscarHistorico7Dias = tool(
  async ({ clienteId }) => {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const snapshots = await prisma.snapshotConta.findMany({
      where: { conta: { clienteId }, data: { gte: seteDiasAtras } },
      orderBy: { data: 'asc' },
    })
    return JSON.stringify(snapshots)
  },
  {
    name: 'buscar_historico_7_dias',
    description: 'Busca o histórico dos últimos 7 dias para comparação de tendências.',
    schema: z.object({ clienteId: z.string() }),
  }
)

const listarCampanhasAtivas = tool(
  async () => {
    const campanhas = await prisma.campanha.findMany({
      where: { status: 'ATIVA' },
      include: { snapshots: { orderBy: { data: 'desc' }, take: 1 } },
    })
    return JSON.stringify(campanhas)
  },
  {
    name: 'listar_campanhas_ativas',
    description: 'Lista todas as campanhas ativas com suas métricas mais recentes.',
    schema: z.object({}),
  }
)

const buscarTargetsCliente = tool(
  async ({ clienteId }) => {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    return JSON.stringify({ targetCpl: cliente?.targetCpl, targetRoas: cliente?.targetRoas })
  },
  {
    name: 'buscar_targets_cliente',
    description: 'Retorna os targets de CPL e ROAS configurados para o cliente.',
    schema: z.object({ clienteId: z.string() }),
  }
)

const tools = [buscarMetricasHoje, buscarHistorico7Dias, listarCampanhasAtivas, buscarTargetsCliente]

const SYSTEM_PROMPT = `Você é um gestor de tráfego experiente com 10 anos de experiência em Meta Ads.
Analise os dados de performance das campanhas e gere insights práticos e acionáveis.
Seja direto, cite nomes reais de campanhas e números concretos.
Use português brasileiro. Máximo 300 palavras. Sem emojis.

Estruture sua análise em:
1. Destaques positivos (máx 3)
2. Atenção necessária (campanhas com problemas)
3. Sugestões do gestor (máx 3 ações práticas)`

export async function gerarResumodiario(): Promise<string> {
  const agent = createReactAgent({ llm, tools })
  const result = await agent.invoke({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analise a performance de todas as campanhas de hoje (${new Date().toLocaleDateString('pt-BR')}) e gere o resumo diário.`,
      },
    ],
  })
  const lastMessage = result.messages.at(-1)
  return typeof lastMessage?.content === 'string' ? lastMessage.content : ''
}
```

---

## 6. Pipeline de Sync

```typescript
// src/services/sync.ts
import { buscarInsights } from './metaAds'
import { verificarAlertas } from './alertas'
import { carregarConfigMeta } from '../core/config'
import { prisma } from '../core/database'

async function sincronizarConta(conta: ContaAds & { config: ContaConfig }) {
  const insights = await buscarInsights(conta.accountId, conta.config.accessToken)

  for (const campanha of insights.data) {
    // Upsert campanha
    await prisma.campanha.upsert({
      where: { campanhaIdPlataforma_contaId: { campanhaIdPlataforma: campanha.campaign_id, contaId: conta.id } },
      update: { nome: campanha.campaign_name, status: mapStatus(campanha.status) },
      create: { contaId: conta.id, campanhaIdPlataforma: campanha.campaign_id, nome: campanha.campaign_name, status: mapStatus(campanha.status) },
    })

    // Upsert snapshot da campanha
    const hoje = new Date()
    await prisma.snapshotCampanha.upsert({
      where: { campanhaId_data: { campanhaId: campanha.campaign_id, data: hoje } },
      update: mapMetricas(campanha),
      create: { campanhaId: campanha.campaign_id, data: hoje, ...mapMetricas(campanha) },
    })
  }

  await verificarAlertas(conta, insights)
  await prisma.contaAds.update({ where: { id: conta.id }, data: { ultimoSync: new Date() } })
}

export async function sincronizarTodas() {
  const config = carregarConfigMeta()      // lê backend/config/meta.yaml com js-yaml
  const contas = await prisma.contaAds.findMany({ where: { ativa: true } })
  await Promise.allSettled(
    contas.map(c => sincronizarConta({ ...c, config: config[c.accountId] }))
  )
}
```

---

## 7. Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ominy_ads
      POSTGRES_USER: ominy
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://ominy:${POSTGRES_PASSWORD}@postgres:5432/ominy_ads
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - ./backend/config:/app/config   # monta config/meta.yaml
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

---

## 8. API Endpoints (Fastify)

```
POST   /auth/login                    → JWT token
GET    /auth/me                       → usuário atual

GET    /metricas/overview             → cards da home (gasto, leads, CPL, ROAS)
GET    /metricas/grafico              → dados para gráfico de linha (?periodo=30d)
GET    /metricas/clientes             → lista clientes com resumo
GET    /metricas/clientes/:id         → detalhe do cliente + campanhas
GET    /metricas/campanhas/:id        → drill-down de uma campanha

GET    /alertas                       → alertas ativos
PATCH  /alertas/:id/lido              → marcar como lido

GET    /ia/resumo                     → resumo do dia (do banco)
POST   /ia/gerar                      → força geração do resumo agora

POST   /sync/manual                   → força sync de todas as contas
GET    /sync/status                   → status e último sync por conta

GET    /config/contas                 → lista contas configuradas + status
GET    /clientes                      → lista clientes
POST   /clientes                      → criar cliente
PUT    /clientes/:id                  → atualizar cliente
DELETE /clientes/:id                  → remover cliente
```

---

## 9. Design System Ominy (Tailwind)

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        ominy: {
          bg:      '#0A0A1A',   // fundo principal
          surface: '#0F0F2A',   // cards, modais
          border:  '#1A1A3A',   // bordas sutis
          cyan:    '#00FFFF',   // destaque primário
          purple:  '#8A2BE2',   // destaque secundário
          text:    '#FFFFFF',
          muted:   '#6B7280',
        },
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body:    ['Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'ominy-gradient': 'linear-gradient(135deg, #00FFFF, #8A2BE2)',
      },
    },
  },
}
```

---

## 10. Variáveis de Ambiente

```env
# .env (não versionado)
POSTGRES_PASSWORD=senha_segura
JWT_SECRET=string_aleatoria_32chars
ANTHROPIC_API_KEY=sk-ant-...

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> Segredos de API do Meta ficam em `backend/config/meta.yaml` (ignorado pelo git).
> O arquivo `backend/config/meta.yaml.example` é versionado como template.

---

## 11. Dependências Principais do Backend (`package.json`)

```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/cors": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "@langchain/core": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "langchain": "^0.3.0",
    "axios": "^1.7.0",
    "ioredis": "^5.4.0",
    "node-cron": "^3.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.5.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/js-yaml": "^4.0.9"
  }
}
```

---

## 12. Ordem de Implementação

| Etapa | Conteúdo |
|---|---|
| 1 | Docker Compose + PostgreSQL + Redis rodando |
| 2 | Backend: Fastify base + Prisma schema + migrations |
| 3 | Backend: auth JWT + endpoints base + seed de dados |
| 4 | Backend: integração Meta Ads API (config file) + pipeline de sync |
| 5 | Backend: lógica de alertas automáticos |
| 6 | Backend: agente LangChain.js + endpoint de resumo IA |
| 7 | Backend: node-cron (sync 6h + IA 8h) |
| 8 | Frontend: setup Next.js + tema Ominy (Tailwind + shadcn customizado) |
| 9 | Frontend: home dashboard — cards + gráfico + seletor de período |
| 10 | Frontend: página por cliente + tabela de campanhas |
| 11 | Frontend: painel de alertas + resumo do agente IA |
| 12 | Frontend: configurações (contas, clientes, usuários) |

---

## 13. Estimativa de Custo Mensal

| Serviço | Custo |
|---|---|
| Meta Marketing API | Gratuita |
| Claude (resumo diário ~1.5k tokens) | ~$0.005/dia ≈ $0.15/mês |
| Redis (self-hosted no Docker) | $0 |
| PostgreSQL (self-hosted no Docker) | $0 |
| **Total mensal** | **< $1** |
