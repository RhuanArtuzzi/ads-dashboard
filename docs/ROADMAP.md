# Ominy Ads Dashboard — Roadmap de Produto

Leia este arquivo ao iniciar trabalho em qualquer nova feature. Contém decisões de produto já tomadas, escopo das próximas implementações e contexto que não está no código.

> **Filosofia:** dividir para conquistar. Uma fase por vez. Cada parte do sistema deve conversar com a outra. Nunca iniciar uma fase sem a anterior estar estável em produção.

---

## Visão do produto

Dashboard para **agências de marketing** com múltiplos clientes e contas de anúncio (Meta Ads e Google Ads). A agência vê todos os dados em um único painel com filtros granulares — não há páginas separadas por cliente.

---

## Estado atual (2026-07-14)

### Concluído e em produção
- [x] Multi-tenant: ADMIN, CLIENTE_ADMIN, CLIENTE com isolamento por JWT
- [x] Meta Ads sync diário via node-cron (a cada 6h) + backfill histórico 30d
- [x] Filtros: cliente, plataforma, período, conta (sub-conta)
- [x] Redis cache com invalidação automática após sync/backfill
- [x] KPIs em ordem de funil: Investimento → Alcance → Engajamento → Conversão
- [x] Relatório PDF por cliente/período via agente IA
- [x] CLIENTE_ADMIN: nav reduzida, dashboard isolado, backfill próprio

---

## FASE 0 — Correção de dados (PRIORIDADE MÁXIMA)

> Sem dados corretos, nenhuma feature nova tem valor.

### 0a. Bug de timezone no sync diário — CORRIGIDO (2026-07-14)
- `sincronizarConta` usava `new Date()` UTC para salvar a data do snapshot
- Meta API retorna `date_start` no timezone da conta (Brasil = UTC-3)
- Quando o cron rodava entre 0h e 3h UTC (= 21h-0h BRT), salvava o snapshot no dia errado
- **Fix:** usar `insights[0].date_start` para determinar `dataSync`; fallback BRT (UTC-3) se sem insights

### 0b. Saldo respeitando filtro de conta — CORRIGIDO (2026-07-14)
- Cards de saldo ignoravam `contaId` selecionado, mostravam todas as contas do cliente
- **Fix:** `/balances` aceita `contaId` query param; frontend passa `filtros.contaId`

### 0c. Investigar discrepância de valores vs Meta Ads Manager
- Usuário tem prints de referência (2026-07-14):
  - ALLSIX PARTICIPACOES: 30d = R$ 4.155,83 | 14d = R$ 1.865,92 | 7d ≈ R$ 1.049,82 | saldo = R$ 2.595,46
  - Belmonte Piracicaba: campanha ativa 30d = R$ 3.427,93 | 7d = R$ 804,15
- **Após deploy:** rodar sync manual (`POST /sync/manual`) e comparar valores dashboard vs gerenciador
- Se ainda houver discrepância, investigar: tipos de conversão não mapeados em `extrairConversoes`

---

## FASE 1 — Google Ads (fazer antes de features avançadas)

> O restante do sistema deve ser construído pensando em Meta + Google juntos.

### 1a. Validar sync Google Ads MCC
- Backend já tem: `sincronizarSaldosGoogle`, `sincronizarMetricasGoogle`, `descobrirEUpsertSubContasGoogle`
- Conexoes page já tem UI para configurar Refresh Token + MCC Customer ID
- **Ação:** testar `POST /sync/manual/google/saldos` e `POST /sync/manual/google/metricas` via admin
- Verificar que `snapshotConta` criados pelo sync Google têm `plataforma: 'GOOGLE_ADS'` correto

### 1b. Backfill histórico Google Ads 30d
- Implementar `backfillHistoricoGoogle(clienteId?, dias)` análogo ao `backfillHistorico` Meta
- Google Ads API usa GAQL com filtro de data (`segments.date BETWEEN 'since' AND 'until'`)
- Rotas: `POST /sync/backfill/google` (admin) e `POST /sync/backfill/google/minha-conta` (CLIENTE_ADMIN)

### 1c. Dashboard filtra corretamente por `plataforma: GOOGLE_ADS`
- Filtro de plataforma no `/metricas/overview` já usa `conta.plataforma` — validar com dados reais

---

## FASE 2 — Filtros avançados

### 2a. Drill-down conta → campanha
- Quando conta selecionada: mostrar dropdown de campanhas dessa conta
- KPIs e gráfico mostram métricas das campanhas selecionadas (query muda de `snapshotConta` para `snapshotCampanha`)
- Backend: `/metricas/overview` e `/metricas/grafico` aceitam `campanhaId` como filtro

### 2b. Períodos adicionais
- Adicionar: "Ontem", "Últimos 14 dias"
- Filtro de período custom (calendário) — já existe, validar UX

### 2c. Saldos respeitam todos os filtros
- Depende de 0b estar estável em produção ✓

---

## FASE 3 — Métricas modulares por conta

### 3a. Schema (DB)
- Tabela `ContaMetricaConfig`: `contaId`, `metricaKey`, `visivel`, `ordem`
- Migration Prisma para adicionar a tabela
- Métricas disponíveis definidas em array no código (não hard-coded no schema)

### 3b. UI de configuração
- Em minha-conta/conexoes: checklist + ordem arrastável (drag-and-drop) por conta
- CLIENTE_ADMIN configura suas contas; ADMIN configura qualquer conta

### 3c. Dashboard renderiza métricas configuradas
- KPI cards renderizados dinamicamente com base na configuração por conta
- Múltiplas contas selecionadas: união das métricas configuradas

---

## FASE 4 — Relatórios configuráveis

### 4a. Prompt por conta (DB)
- Campo `promptRelatorio: String?` em `ContaAds` (ou nova tabela)
- Prompt padrão global; CLIENTE_ADMIN pode editar o prompt da sua conta

### 4b. UI de edição de prompt
- Textarea na configuração da conta com placeholder do prompt padrão
- Botão "Restaurar padrão"

### 4c. Geração usa prompt da conta
- Ao gerar PDF, buscar prompt configurado para a conta/cliente selecionado
- Contexto (métricas, filtros, período) permanece igual — só o prompt muda

---

## Decisões de arquitetura tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Google Ads sync | MCC auto-enumeração | Agência tem múltiplos clientes — cadastro manual não escala |
| Dashboard | Único painel com filtros | Visão consolidada + granularidade via filtros |
| Auth guard | middleware.ts + cookie | localStorage não acessível em middleware Next.js |
| Deploy | `bash deploy.sh` sempre | Garante --build-arg correto, source .env, --force nos containers |
| Sync timezone | Meta `date_start` field | Evita divergência entre UTC do servidor e BRT das contas Meta |
