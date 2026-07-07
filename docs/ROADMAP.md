# Ominy Ads Dashboard — Roadmap de Produto

Leia este arquivo ao iniciar trabalho em qualquer nova feature. Contém decisões de produto já tomadas, escopo das próximas implementações e contexto que não está no código.

---

## Visão do produto

Dashboard para **agências de marketing** com múltiplos clientes e contas de anúncio (Meta Ads e Google Ads). A agência vê todos os dados em um único painel com filtros granulares — não há páginas separadas por cliente.

---

## Features em andamento

### Google Ads — auto-enumeração de sub-contas via MCC
**Status:** em implementação

O MCC (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`) é a conta gerenciadora. Sub-contas são os clientes reais que rodam anúncios. O sync deve:
1. Consultar `FROM customer_client` no MCC para listar sub-contas ativas
2. Criar entradas em `ContaAds` automaticamente para sub-contas novas (cria `Cliente` com o nome da sub-conta se não existir)
3. Sincronizar métricas e saldos de cada sub-conta via acesso MCC (`login-customer-id` header)

O admin pode depois ir em Conexões e renomear/reassociar cada conta ao cliente correto.

---

## Backlog priorizado

### 1. Filtros no dashboard (próxima prioridade)
Todos os endpoints de métricas precisam aceitar query params de filtro:
- `clienteId` — filtrar por cliente específico (ou todos)
- `plataforma` — `META_ADS` | `GOOGLE_ADS` | `TODOS`
- `dataInicio` + `dataFim` — intervalo customizável (substitui os 3 botões fixos de período)

Endpoints a atualizar: `GET /metricas/overview`, `GET /metricas/grafico`, `GET /balances`

Frontend: substituir os botões "Hoje / 7 dias / 30 dias" por um date picker com dropdown de cliente e plataforma.

### 2. Relatórios por cliente (futuro)
Botão "Gerar relatório" na tela com filtros ativos. Gera PDF/Excel com:
- KPIs do período (gasto, conversões, CPL, CTR, ROAS)
- Gráfico de gasto diário
- Lista de campanhas com performance
- Análise textual do agente IA

Escopo: cliente + período + plataforma selecionados.

### 3. Métricas expandidas (futuro)
As métricas atuais (gasto, conversões, CPL, CTR, ROAS) são básicas. Novas métricas a adicionar nas próximas iterações:
- Frequência de exibição
- Alcance
- Custo por clique (CPC)
- Taxa de conversão (CVR)
- Valor de conversão total
- ROAS real (Meta retorna `purchase_roas` nas actions)
- Métricas específicas por objetivo de campanha

**Regra de implementação:** ao adicionar novas métricas, não fazer campos hard-coded no schema — avaliar se `SnapshotConta` e `SnapshotCampanha` precisam de novos campos ou se um modelo de métricas flexível (JSON/EAV) serve melhor para extensibilidade.

### 4. Associação de sub-contas Google a clientes (futuro)
Na UI de Conexões, mostrar sub-contas Google auto-descobertas sem cliente associado e permitir associação drag-and-drop ou via select.

---

## Decisões de arquitetura tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Google Ads sync | MCC auto-enumeração | Agência tem múltiplos clientes — cadastro manual não escala |
| Dashboard | Único painel com filtros | Visão consolidada + granularidade via filtros |
| Auth guard | middleware.ts + cookie | localStorage não acessível em middleware Next.js |
| Deploy | `bash deploy.sh` sempre | Garante --build-arg correto, source .env, --force nos containers |
| Migrations | `prisma db push` | Sem histórico de migrations, push é suficiente para este estágio |
| Scheduler | BullMQ + Redis | Substituiu n8n — sync interno ao backend, jobs a cada 6h |
