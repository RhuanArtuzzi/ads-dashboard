# Plano de Workflows n8n — Ominy Ads Dashboard

## Estado atual

| Dado | Workflow | Status |
|---|---|---|
| Saldo conta Meta | Meta Ads - Sync Balances | ✅ Funcionando (conta única hardcoded) |
| Saldo Google Ads | — | ❌ Pendente |
| Métricas por campanha Meta | — | ❌ Pendente |
| Métricas por campanha Google Ads | — | ❌ Pendente |

---

## 1. Modificar: Meta Ads — Sync Balances (multi-conta)

**Problema:** Conta `act_143086142456612` está hardcoded no workflow. Novos clientes não são sincronizados automaticamente.

**Solução:** Buscar lista de contas do banco antes de iterar.

**Estrutura do workflow:**
```
Schedule (6h)
→ Postgres (SELECT account_id, access_token FROM "ContatAds" WHERE plataforma = 'META_ADS')
→ SplitInBatches (uma chamada por conta)
→ HTTP Request GET /v25.0/act_{accountId}?fields=id,name,balance,currency&access_token={token}
→ Set (balance / 100, platform = 'meta')
→ Postgres Upsert (ON CONFLICT platform, account_id DO UPDATE)
```

**Nota:** A tabela `ContaAds` tem o `accountId` mas NÃO tem o `accessToken` — o token está no `meta.yaml` no servidor. Opções:
- a) Adicionar campo `accessToken` na tabela `ContaAds` (preferível a longo prazo)
- b) Manter token no n8n por conta como credencial separada

---

## 2. Criar: Meta Ads — Sync Métricas por Campanha

**Objetivo:** Popular `snapshot_campanhas` com dados reais da Meta API (substituindo cron do backend).

**Chamada da API:**
```
GET /v25.0/act_{id}/insights
  ?fields=spend,impressions,clicks,ctr,actions,campaign_id,campaign_name
  &date_preset=yesterday
  &level=campaign
  &access_token={token}
```

**Mapeamento de campos:**
- `spend` → `gasto` (já em reais)
- `impressions` → `impressoes`
- `clicks` → `cliques`
- `ctr` → `ctr` (ex: `"2.34"` → float)
- `actions` → filtrar `action_type == "lead"` → `conversoes`
- CPL = `gasto / conversoes` (calculado no Function node)
- ROAS → **não disponível para lead gen** (sem pixel de compra/Purchase event)

**Estrutura do workflow:**
```
Schedule (6h)
→ Postgres (SELECT contas Meta ativas com tokens)
→ SplitInBatches
→ HTTP Request GET Meta Insights API
→ Function (mapeia campos, calcula CPL)
→ Postgres Upsert em snapshot_campanhas (ON CONFLICT campanha_id_plataforma, data)
```

**Após validar:** Desabilitar `sincronizarTodas()` em `backend/src/jobs/scheduler.ts`.

---

## 3. Criar: Google Ads — OAuth2 + Saldo + Métricas

**Requisitos prévios:**
- Google Cloud Console: criar projeto, habilitar Google Ads API v18
- Credenciais OAuth2: `client_id`, `client_secret`, `refresh_token`
- No n8n: criar credencial tipo "OAuth2 API" com esses valores
- Customer ID da conta Google Ads do cliente

### 3a. Workflow: Google Ads — Sync Saldo/Budget

```
Schedule (6h)
→ HTTP Request (OAuth2 credential)
  POST https://googleads.googleapis.com/v18/customers/{customer_id}/googleAds:search
  Body:
    { "query": "SELECT campaign.id, campaign.name, campaign_budget.amount_micros
                FROM campaign_budget WHERE campaign_budget.status = 'ENABLED'" }
→ Function (amount_micros / 1_000_000 = valor em BRL)
→ Postgres Upsert em ad_account_balances (platform='google_ads')
```

**Headers obrigatórios:**
```
Authorization: Bearer {access_token}
developer-token: {developer_token_google_ads}
login-customer-id: {manager_customer_id}  (se MCC)
```

### 3b. Workflow: Google Ads — Sync Métricas por Campanha

```
Schedule (6h)
→ HTTP Request (OAuth2)
  POST https://googleads.googleapis.com/v18/customers/{customer_id}/googleAds:search
  Body GAQL:
    SELECT campaign.id, campaign.name,
           metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.conversions, metrics.all_conversions_value,
           segments.date
    FROM campaign
    WHERE segments.date DURING YESTERDAY
→ Function:
    gasto = cost_micros / 1_000_000
    ctr = metrics.ctr * 100  (Google retorna como decimal 0-1)
    cpl = gasto / conversions (se conversions > 0)
    roas = all_conversions_value / gasto (se disponível)
→ Postgres Upsert em snapshot_campanhas
```

---

## 4. ROAS para Lead Gen — implementação futura

Meta API retorna `purchase_roas` apenas com pixel de compra configurado. Para campanhas de lead gen:

**Solução:** Adicionar campo `receitaPorLead Float?` no model `Cliente` (Prisma).

Migration necessária:
```sql
ALTER TABLE "Cliente" ADD COLUMN "receita_por_lead" DECIMAL(10,2);
```

Cálculo no backend: `ROAS = (conversoes * receitaPorLead) / gasto`

---

## 5. Onboarding de novo cliente — fluxo e gaps

**Fluxo atual (funciona):**
1. Clientes cfg → criar cliente (nome, target CPL, target ROAS)
2. Conexões → adicionar conta Meta (account ID + access token longa duração)
3. n8n inclui automaticamente no próximo sync (após item 1 acima ser implementado)

**Gaps atuais:**
- Token Meta precisa ser gerado manualmente no Meta Business Manager (sem ajuda na UI)
- Sem validação do token ao salvar (erro só aparece no próximo sync)
- n8n workflow hardcoded para conta única → resolver no item 1
- Google Ads precisará de OAuth separado (fluxo diferente — usuário autoriza via browser)
- Sem instrução na UI de como obter o token

**Credenciais necessárias para Google Ads:**
- `developer_token` (do Google Ads Manager Account)
- `client_id` + `client_secret` (do Google Cloud Console)
- `refresh_token` por cliente (via OAuth playground ou fluxo customizado)
- `customer_id` por conta (ID numérico da conta Google Ads)
