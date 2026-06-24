# STATUS — Ominy Ads Dashboard
**Última atualização:** 2026-06-17

---

## Migração de infraestrutura (2026-06-17)

O servidor `desenv-01` foi deletado pela Contabo por inadimplência. Infraestrutura reconstruída do zero em um único servidor:

| Item | Antes | Agora |
|---|---|---|
| Servidor de app | desenv-01 (deletado) | desenv-00 |
| Servidor de banco | worker-01 (separado) | desenv-00 (mesmo servidor) |
| IP | 37.60.251.34 | 5.189.151.101 |
| Domínio | artuzzyia.com.br | ominy.tec.br |
| Rede Docker | artuzzi-net-desenv | ominy-network |
| certresolver Traefik | letsencryptresolver | letsencrypt |
| PostgreSQL password | SFm7MQyeZklCcYbKR | Ominy@2026!Secure |

Dados perdidos: n8n e todos os workflows, Traefik antigo, containers e imagens Docker, `meta.yaml` e `.env` do servidor. Banco de dados (`ominy_ads`) **não** foi perdido pois estava no worker-01 — precisa ser migrado/restaurado para o novo banco em desenv-00 se houver backup; caso contrário, recriar via seed.

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

Infraestrutura reconstruída do zero em desenv-00 após exclusão da desenv-01. Código e schema Prisma não mudaram — apenas configuração de deploy (ver seção "Migração de infraestrutura" acima).

---

## Próximo passo exato para retomar

**No servidor desenv-00:**

```bash
git clone https://github.com/RhuanArtuzzi/ads-dashboard.git ~/ads-dashboard
cd ~/ads-dashboard

> .env
echo 'POSTGRES_PASSWORD=Ominy@2026!Secure' >> .env
echo 'JWT_SECRET=...' >> .env   # gerar novo com openssl rand -hex 32
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env   # cole sua chave real aqui
echo 'NEXT_PUBLIC_API_URL=https://api-dashboard.ominy.tec.br' >> .env
echo 'IA_AUTO=false' >> .env
```

Depois verificar com `cat .env` e rodar:

```bash
POSTGRES_PASSWORD=Ominy@2026!Secure bash init-db.sh
bash deploy.sh
```

Adicionar no Cloudflare os registros DNS (`A`, DNS only) apontando para `5.189.151.101`:
- `dashboard.ominy.tec.br`
- `api-dashboard.ominy.tec.br`

Após o deploy, confirmar que a seção "Saldos das Contas" aparece na home de `dashboard.ominy.tec.br`. Nota: o saldo vai aparecer vazio até o workflow n8n ser recriado (ver [N8N_WORKFLOWS_PLAN.md](N8N_WORKFLOWS_PLAN.md)).

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
