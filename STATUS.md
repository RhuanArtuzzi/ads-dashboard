# STATUS — Ominy Ads Dashboard
**Última atualização:** 2026-06-24

---

## Migração de infraestrutura — CONCLUÍDA (2026-06-17 a 2026-06-24)

O servidor `desenv-01` foi deletado pela Contabo por inadimplência. Infraestrutura reconstruída do zero em um único servidor:

| Item | Antes | Agora |
|---|---|---|
| Servidor de app | desenv-01 (deletado) | hostname real `vmi3133382` (apelido informal "desenv-00") |
| Servidor de banco | worker-01 (separado) | mesmo servidor `vmi3133382` |
| IP | 37.60.251.34 | 5.189.151.101 |
| Domínio | artuzzyia.com.br | ominy.tec.br |
| Rede Docker | artuzzi-net-desenv | ominy-network |
| certresolver Traefik | letsencryptresolver | letsencrypt |
| PostgreSQL password | SFm7MQyeZklCcYbKR | Ominy@2026!Secure |
| Redis | redis_redis (perdido) | recriado via `redis-compose.yml` |

**Status: dashboard 100% funcional em produção** — `https://dashboard.ominy.tec.br` carregando KPIs, gráfico, saldos das contas e Gestor IA com dados do seed mockado.

Dados perdidos definitivamente (sem backup): n8n e todos os workflows, banco `ominy_ads` antigo (recriado do zero via seed — não havia backup), `meta.yaml` e `.env` do servidor antigo.

### Particularidades descobertas durante a migração (cuidado se repetir o processo)
- `postgres_postgres` foi inicializado com `POSTGRES_USER=ominy` como superuser de bootstrap — **não existe role `postgres`**. `init-db.sh` foi corrigido para conectar como `ominy` no banco padrão `ominy`.
- O hostname real do node Swarm é `vmi3133382`, não bate com o apelido "desenv-00" usado informalmente — `node.hostname` constraints usam o hostname real.
- Bash com `!` em senha (`Ominy@2026!Secure`) dispara history expansion dentro de aspas duplas — usar sempre aspas simples em comandos interativos.
- Traefik cacheia falha de ACME e não tenta de novo automaticamente mesmo após o DNS ficar correto — precisou de `docker service update --force traefik_traefik` para forçar nova tentativa.
- Imagem de produção do backend não tem `tsx` (dev dependency) — seed via `npx -y tsx prisma/seed.ts` dentro do container.

Subdomínio `dashboard.ominy.tec.br` ainda não foi adicionado no Cloudflare — adicionar manualmente.

Ver detalhes de workflows n8n pendentes em [N8N_WORKFLOWS_PLAN.md](N8N_WORKFLOWS_PLAN.md).

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
- `docker-compose.yml` — stack Docker Swarm com rede externa `ominy-network`, Traefik v2.11 (letsencrypt), placement constraint backend na desenv-00
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
- Banco criado no `postgres_postgres` existente no Swarm (desenv-00, após migração)
- Migrations via `prisma db push` (sem shadow database)
- Seed executado com dados mockados
- Serviços `ads-dashboard_backend` e `ads-dashboard_frontend` rodando `1/1`
- URLs ativas: `dashboard.ominy.tec.br` e `api-dashboard.ominy.tec.br`

---

## Estado atual ao pausar

Migração de infraestrutura concluída e validada visualmente em produção (2026-06-24): home carregando KPIs, gráfico de gasto diário, saldos das contas (dados mockados do seed) e Gestor IA.

**Decisão arquitetural pendente de implementação:** o n8n foi removido do escopo deste projeto (ver [[n8n-sync-architecture]] na memória). Todo sync de Meta Ads / Google Ads passa a ser feito no próprio backend, usando **BullMQ + Redis** para scheduling (não `node-cron` puro), com Google Ads usando uma única conta MCC da agência (refresh token único). Falhas de sync geram registro na tabela `Alerta` do Prisma; notificação externa é extensão futura. O `N8N_WORKFLOWS_PLAN.md` no repo está **obsoleto** — será substituído por um plano de implementação no backend.

---

## Próximo passo exato para retomar

Infra está pronta e estável. O próximo bloco de trabalho é a implementação do sync no backend (substituindo a dependência do n8n):

1. Adicionar BullMQ como dependência do backend (`npm install bullmq`)
2. Criar jobs de sync: saldo Meta (multi-conta, a partir de `ContaAds` no banco), métricas Meta (`insights` API), saldo + métricas Google Ads (OAuth via conta MCC)
3. Reaproveitar `services/metaAds.ts` e `services/sync.ts` existentes como base
4. Registrar os jobs recorrentes no lugar do scheduler `node-cron` atual em `backend/src/jobs/scheduler.ts`
5. Implementar alerta automático quando um job de sync falhar (token expirado, erro de API) — usar tabela `Alerta`

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
| Placement constraint `node.hostname == vmi3133382` | Hostname real do node Swarm (apelido "desenv-00" não corresponde ao `docker node ls`) — config bind mount só existe nesse servidor único |
| Reutilizar `postgres_postgres` e `redis_redis` | Serviços já existentes no Swarm — sem criar containers extras |
| `ad_account_balances` criada via SQL (fora do Prisma migrate) | Tabela legada do período n8n — Prisma acessa via `@@map`. Continuará sendo populada pelos novos jobs do backend |
| n8n removido do projeto (2026-06-17) | Workflows perdidos sem backup na exclusão do desenv-01; sync volta a viver em código versionado no backend (BullMQ + Redis) |

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
