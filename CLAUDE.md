# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ominy Ads Dashboard** — dashboard de análise inteligente de campanhas Meta Ads para agências de marketing. Arquitetura separada: frontend Next.js + backend Fastify (Node.js), comunicando via REST API. Um agente LangChain.js (ReAct) age como gestor de tráfego experiente para análise das métricas.

**Linguagem:** TypeScript em todo o projeto (frontend e backend). Sem Python.

## Architecture

```
frontend/   → Next.js 14 (App Router) + TypeScript + Tailwind (tema Ominy)
backend/    → Fastify v5 + Node.js 20 + TypeScript + Prisma ORM + LangChain.js
postgres    → PostgreSQL 16 (histórico de snapshots de métricas)
redis       → Cache de métricas (TTL 1h) via ioredis
```

Tudo orquestrado via `docker-compose.yml` na raiz.

## Running the Project

```bash
# Subir todos os serviços
docker compose up -d

# Subir apenas o banco para desenvolvimento local
docker compose up -d postgres redis

# Backend em modo desenvolvimento (hot reload com tsx)
cd backend && npm run dev

# Frontend em modo desenvolvimento
cd frontend && npm run dev

# Aplicar migrations do banco
cd backend && npx prisma migrate dev

# Criar nova migration após alterar schema.prisma
cd backend && npx prisma migrate dev --name descricao_da_mudanca

# Gerar Prisma client após alterar schema
cd backend && npx prisma generate

# Seed de dados mockados para desenvolvimento
cd backend && npx prisma db seed
```

## Key Conventions

**Backend (Fastify):**
- Entry point: `backend/src/server.ts` — registra plugins e routes
- Routes ficam em `backend/src/routes/` — um arquivo por domínio, exportam `FastifyPluginAsync`
- Lógica de negócio fica em `backend/src/services/` — routes só delegam aos services
- Schema Prisma em `backend/prisma/schema.prisma` — fonte da verdade do banco
- Validação de request/response com Zod em `backend/src/schemas/`
- Configurações de contas Meta Ads em `backend/config/meta.yaml` (não versionado — use `meta.yaml.example` como referência)

**Agente LangChain.js:**
- Implementado em `backend/src/services/agenteIA.ts`
- Usa `@langchain/langgraph` com `createReactAgent`
- Ferramentas consultam o banco via Prisma client diretamente
- Model: `claude-sonnet-4-6`

**Frontend:**
- Chamadas à API sempre via `src/lib/api.ts` (instância Axios configurada com base URL do backend)
- Dados remotos gerenciados pelo React Query v5 em `src/lib/queries/`
- Nunca chamar a API do Meta diretamente no frontend — tudo passa pelo backend

**Design System Ominy:**
- Fundo: `#0A0A1A` | Surface/cards: `#0F0F2A` | Bordas: `#1A1A3A`
- Destaque primário: `#00FFFF` (ciano) — KPIs, elementos interativos, glow effects
- Destaque secundário: `#8A2BE2` (púrpura) — gradientes, gráficos, badges IA
- Tipografia: `font-heading` (Orbitron) para títulos, `font-body` (Roboto) para texto
- Dark mode sempre — sem temas claros

## Data Flow

1. Chaves de API Meta ficam em `backend/config/meta.yaml` (lidas com `js-yaml`)
2. `node-cron` sincroniza métricas a cada 6h via Meta Marketing API v20
3. Snapshots são salvos no PostgreSQL via Prisma upsert (idempotente por `[contaId, data]`)
4. Agente LangChain.js roda às 8h, consulta o banco e gera resumo em português
5. Frontend lê dados exclusivamente do banco via API Fastify (sem calls diretas à Meta API)
6. `POST /sync/manual` força re-sincronização imediata

## Environment Variables

Copiar `.env.example` para `.env`. Segredos da Meta API ficam em `backend/config/meta.yaml` (não em `.env`).

Variáveis obrigatórias: `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_API_URL`.
