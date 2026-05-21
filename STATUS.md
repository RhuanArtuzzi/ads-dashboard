# STATUS — Ominy Ads Dashboard
**Última atualização:** 2026-05-21

---

## Concluído hoje (2026-05-21)

### Saldos das Contas (nova feature)
- Tabela `ad_account_balances` criada via PgAdmin (fora do Prisma migrate) — populada por workflow n8n a cada 6h via Graph API Meta
- Model `AdAccountBalance` adicionado ao `schema.prisma` com `@@map("ad_account_balances")` — compatível com tabela existente
- Rota `GET /balances` criada em `backend/src/routes/balances.ts` e registrada no `server.ts`
- Hook `useBalances` criado em `frontend/src/lib/queries/useBalances.ts` (React Query, staleTime 10min)
- Componente `AccountBalanceCard` criado com badge de plataforma ciano, saldo formatado em moeda local, badge de alerta âmbar quando saldo ≤ 0, glow hover ciano, timestamp relativo
- Seção "Saldos das Contas" adicionada na home com grid responsivo (1/2/3 cols), skeleton loading, estados de erro e vazio

---

## Histórico

### Infraestrutura
- `docker-compose.yml` — stack Docker Swarm com rede externa `artuzzi-net-desenv`, Traefik v2 (letsencryptresolver), placement constraint backend na desenv-01
- `deploy.sh` — build das imagens + `docker stack deploy` com carregamento automático do `.env`
- `init-db.sh` — criação do banco `ominy_ads` no postgres compartilhado do Swarm

### Backend (Fastify v5 + Node.js 20 + TypeScript)
- Todos os arquivos de estrutura: `server.ts`, `core/` (config, database, redis, security)
- Schema Prisma completo com 8 modelos + `binaryTargets = linux-musl-openssl-3.0.x`
- Auth JWT: `routes/auth.ts`, `schemas/auth.ts`, `core/security.ts`
- Seed com 2 clientes, 4 campanhas e 30 dias de snapshots mockados
- Integração Meta Ads: `services/metaAds.ts`, `services/sync.ts`
- Alertas automáticos (5 tipos): `services/alertas.ts`, `routes/alertas.ts`
- Agente LangChain.js ReAct (5 tools): `services/agenteIA.ts`, `routes/ia.ts`
- Scheduler node-cron: sync 6h automático + IA às 8h controlada por `IA_AUTO=true`
- Todas as rotas: metricas, clientes, contas, alertas, ia, sync

### Frontend (Next.js 14 + Tailwind tema Ominy)
- Setup completo: `next.config.mjs`, `tailwind.config.ts`, `globals.css`, fontes Orbitron/Roboto
- Componentes UI próprios (sem Radix): Button, Card, Badge, Input
- Componentes dashboard: MetricCard, GastoChart (Recharts), CampanhaTable, AlertaBadge
- Componente IA: ResumoAgente com botão "Gerar agora"
- Todas as páginas: Home, Clientes, Clientes/[id], Meta Ads, Alertas, IA, Login
- Configurações: Clientes (CRUD), Conexoes Meta Ads (CRUD com token)
- Queries React Query v5 para todos os domínios

### Deploy em produção
- Banco criado no `postgres_postgres` existente no Swarm (worker-01)
- Migrations via `prisma db push` (sem shadow database)
- Seed executado com dados mockados
- Serviços `ads-dashboard_backend` e `ads-dashboard_frontend` rodando `1/1`
- URLs ativas: `dashboard.artuzzyia.com.br` e `api-dashboard.artuzzyia.com.br`

---

## Estado atual ao pausar

Tudo implementado, aguardando deploy:
- Login OK (`admin@ominy.com.br` / `admin123`)
- Dashboard exibindo dados do seed (R$17.425 em 30 dias)
- Backend respondendo requisições
- Análise IA automática **desativada** (botão manual disponível na UI)
- Gerenciamento de contas Meta Ads pela UI implementado e deployado
- Seção "Saldos das Contas" implementada — aguarda rebuild da imagem + `prisma generate` no container

---

## Próximo passo exato para retomar

1. Fazer push e rebuild da imagem do backend (para o `prisma generate` rodar com o novo model)
2. Verificar se o n8n está populando `ad_account_balances` corretamente
3. Acessar `dashboard.artuzzyia.com.br` e confirmar que a seção "Saldos das Contas" aparece na home
4. Se necessário, rodar `prisma db push` dentro do container do backend para sincronizar o model sem reset

---

## Decisões técnicas importantes

| Decisão | Motivo |
|---|---|
| `"type": "module"` no backend | TypeScript NodeNext requer ESM para top-level await e import.meta |
| `binaryTargets = linux-musl-openssl-3.0.x` no Prisma | Alpine Linux usa OpenSSL 3.x, não 1.1 |
| `prisma db push` em vez de `migrate dev` | Usuário ominy não tem permissão CREATEDB para shadow database |
| Access token no banco (ContaAds.accessToken) | Evita editar arquivo YAML no servidor — gerenciado pela UI |
| YAML como fallback opcional | Compatibilidade com configuração antiga, sem quebrar nada |
| `IA_AUTO=false` por padrão | Evitar gasto desnecessário de tokens Anthropic |
| Placement constraint `node.hostname == desenv-01` | Config bind mount só existe na desenv-01, não no worker-01 |
| Reutilizar `postgres_postgres` e `redis_redis` | Serviços já existentes no Swarm — sem criar containers extras |
| `ad_account_balances` criada via SQL (fora do Prisma migrate) | n8n faz upsert direto — Prisma acessa via `@@map` sem recriar a tabela |
| n8n responsável pelos saldos | Desacopla o fluxo de saldo do backend — sem dependência de novo cron |

---

## Problemas em aberto / Dívidas técnicas

- **Senha do admin hardcoded no seed** (`admin123`) — trocar antes de uso real
- **Sem endpoint de troca de senha** — precisa ser implementado
- **Seed de dados mockados ainda no banco** — limpar antes de ir para produção real (`prisma db push --force-reset` + novo seed vazio)
- **Tokens Meta expiram em 60 dias** — sem alerta de expiração implementado
- **Framer Motion instalado mas não usado** — animações ficaram para depois
- **`npm audit` aponta 8 vulnerabilidades** no backend (6 moderate, 1 high, 1 critical) — revisar com `npm audit fix`
- **Sem paginação** nas listagens de campanhas/alertas — pode ser problema com muitos dados
- **ROAS não calculado pelo sync** — Meta API não retorna ROAS diretamente; precisa calcular via receita configurada por cliente
