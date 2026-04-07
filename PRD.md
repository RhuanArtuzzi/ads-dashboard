# PRD — Ominy Ads Dashboard
**Versão:** 2.0 | **Status:** MVP | **Marca:** Ominy | **Nicho:** Agências de Marketing

---

## 1. Visão Geral

### Problema
Gestores de tráfego perdem tempo alternando entre o Meta Ads Manager e planilhas para ter uma visão consolidada de performance. Não existe uma tela única que mostre o que importa, com análise inteligente em linguagem humana.

### Solução
Dashboard web com estética Ominy que consolida métricas de Meta Ads em uma única tela — por cliente, por período, com comparativos e análise inteligente gerada por um agente LangChain que atua como um gestor de tráfego experiente.

A chave de API do Meta é configurada via arquivos de configuração no backend (sem OAuth obrigatório no MVP). A arquitetura é separada em frontend (Next.js) e backend (FastAPI + Python), comunicando-se via REST API interna.

### Identidade Visual
O dashboard adota a identidade Ominy:
- **Tipografia:** Orbitron (títulos/headings) + Roboto (corpo/tabelas)
- **Cores base:** `#0A0A1A` (fundo), `#FFFFFF` (texto principal)
- **Destaque primário:** `#00FFFF` (Ciano Elétrico — interativos, KPIs, destaques)
- **Destaque secundário:** `#8A2BE2` (Púrpura Neural — gradientes, gráficos, IA)
- **Estética:** Dark mode, tech, elegante — sem brancos dominantes

### Usuários do MVP
- Você (admin principal)
- Equipe da agência (contas configuradas no backend)

---

## 2. Métricas Prioritárias

| Métrica | Meta Ads |
|---|---|
| **CPL** (Custo por Lead) | ✅ |
| **ROAS** (Retorno sobre investimento) | ✅ |
| **CTR** (Taxa de cliques) | ✅ |
| **Impressões** | ✅ |
| **Cliques** | ✅ |
| **Conversões** | ✅ |
| **Gasto total** | ✅ |
| **Orçamento diário restante** | ✅ |

---

## 3. Funcionalidades do MVP

### 3.1 Visão Geral (Home)
- [ ] Cards consolidados: gasto total, leads totais, CPL médio, ROAS médio
- [ ] Gráfico de linha: gasto por dia (últimos 30 dias)
- [ ] Comparativo de período: este período vs período anterior
- [ ] Seletor de período (hoje / 7 dias / 30 dias / personalizado)
- [ ] Painel de resumo do agente IA do dia

### 3.2 Por Cliente
- [ ] Lista de clientes com resumo (gasto, leads, CPL, ROAS, badge de alerta)
- [ ] Página do cliente: todas as campanhas ativas
- [ ] Status da campanha (ativa / pausada / em revisão)
- [ ] Alertas: campanha sem entrega, orçamento esgotando, CPL acima do target

### 3.3 Por Plataforma (Meta Ads)
- [ ] Campanhas e conjuntos de anúncios
- [ ] Drill-down: clicar em campanha → métricas detalhadas
- [ ] Status e orçamento por campanha

### 3.4 Análise Inteligente com Agente LangChain
- [ ] Agente Python simples (LangChain + ReAct) que age como gestor de tráfego experiente
- [ ] Análise diária automática: identifica campanhas com performance ruim/boa
- [ ] Linguagem natural em português: "Campanha X com CPL 3x acima da média — considere pausar"
- [ ] Ferramentas do agente: buscar métricas do banco, comparar com targets, calcular variações
- [ ] Resumo semanal escrito com contexto acumulado

### 3.5 Configuração de Contas (Config Files)
- [ ] Chave de API Meta configurada em `backend/config/meta.yaml`
- [ ] Suporte a múltiplas contas no mesmo arquivo de config
- [ ] Endpoint de status: valida se as chaves estão funcionando
- [ ] Visualização no dashboard: status de cada conta + última sincronização

### 3.6 Configurações (UI)
- [ ] Gerenciar clientes (nome, contas vinculadas, targets de CPL/ROAS)
- [ ] Definir targets por cliente (ex: CPL alvo = R$50)
- [ ] Gerenciar usuários (MVP: admin + leitura)
- [ ] Visualizar e testar conexões de API

---

## 4. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│         Next.js 14 + TypeScript + Ominy UI          │
│    (Orbitron + Roboto | #0A0A1A | #00FFFF | #8A2BE2) │
└──────────────────────┬──────────────────────────────┘
                       │ REST API calls
                       ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│              FastAPI (Python 3.12)                   │
│         SQLAlchemy ORM + PostgreSQL                  │
│                                                      │
│  ┌─────────────────┐    ┌──────────────────────┐    │
│  │  Meta Ads API   │    │   LangChain Agent     │    │
│  │  (API Key via   │    │   (gestor de tráfego  │    │
│  │  config/meta.   │    │    experiente)        │    │
│  │  yaml)          │    │                       │    │
│  └─────────────────┘    └──────────────────────┘    │
│                                                      │
│  ┌─────────────────┐    ┌──────────────────────┐    │
│  │   APScheduler   │    │       Redis           │    │
│  │  (cron: sync 6h │    │  (cache de métricas   │    │
│  │   resumo IA 8h) │    │   TTL 1h)             │    │
│  └─────────────────┘    └──────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL                          │
│         (histórico de snapshots + dados)            │
└─────────────────────────────────────────────────────┘

Tudo rodando em Docker Compose (3 containers: frontend, backend, postgres + redis)
```

---

## 5. Fluxo de Dados

```
Config file (meta.yaml) → Meta Marketing API (v20) → backend coleta métricas
                                                              ↓
APScheduler (cron 6h) → busca métricas de todas as contas configuradas
                      → salva snapshot no PostgreSQL (upsert — idempotente)
                      → calcula CPL, ROAS, variações
                      → verifica alertas automáticos
                      ↓
APScheduler (cron 8h) → LangChain Agent analisa métricas do dia
                      → gera resumo como gestor de tráfego experiente
                      → salva no banco

Dashboard (Next.js) → chama API backend → lê do banco (sem chamar Meta API em tempo real)
                    → botão "Atualizar agora" → força sync manual via POST /api/sync
```

---

## 6. Alertas Automáticos

| Alerta | Condição |
|---|---|
| CPL alto | CPL atual > 150% do target definido |
| Orçamento esgotando | < 20% do orçamento diário restante às 12h |
| Campanha sem entrega | 0 impressões nas últimas 6h com campanha ativa |
| ROAS abaixo do alvo | ROAS < target por 3 dias consecutivos |
| Queda de performance | CTR caiu > 30% vs semana anterior |

---

## 7. Agente LangChain (Análise Inteligente)

O agente usa o padrão **ReAct (Reasoning + Acting)** com ferramentas que consultam o banco de dados para gerar análises contextualizadas:

```
RESUMO DE PERFORMANCE — [data]

Destaques positivos:
- Campanha "Produto X - Remarketing" com ROAS de 4.2x (meta: 3x)
- CPL da conta Y caiu 18% vs semana passada

Atenção necessária:
- Campanha "Leads Frios" com 0 conversões em 3 dias (gasto: R$450)
- Orçamento da campanha "Meta - Fundo" esgotará hoje às ~16h

Sugestões do gestor:
- Considere pausar "Leads Frios" ou trocar o criativo — padrão de baixa entrega
- Aumente orçamento diário em +30% para não perder tráfego à tarde
```

---

## 8. Fora do Escopo (MVP)

- Google Ads (v2)
- Editor de campanhas (só leitura no MVP)
- Relatórios automáticos em PDF
- App mobile
- Integração com CRM
- Multitenancy completo (SaaS público)
- OAuth para Meta (MVP usa API key via config)

---

## 9. Roadmap

| Fase | Conteúdo |
|---|---|
| **MVP** | Meta Ads, métricas principais, alertas, agente LangChain, identidade Ominy |
| **v2** | Google Ads, OAuth, relatório PDF para clientes |
| **v3** | SaaS multitenancy — cada agência tem seu workspace |
| **v4** | Editor de campanhas leve (pausar/ativar/ajustar orçamento) |
