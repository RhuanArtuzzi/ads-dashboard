# PROMPT MASTER — Dashboard Unificado Google Ads + Meta Ads
## Cole este prompt inteiro no Claude Code (Antigravity)

---

Você é um arquiteto sênior de software fullstack. Vamos construir um
dashboard unificado de Google Ads e Meta Ads para agências de marketing.
Leia todo o contexto antes de escrever qualquer código. Confirme o
entendimento e comece pela Etapa 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CONTEXTO DO PRODUTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dashboard web para gestores de tráfego que consolida Google Ads e Meta Ads
numa tela só. Problema atual: alternar entre plataformas + planilhas para
ver performance de múltiplos clientes.

MVP para uso próprio + pequena equipe (contas fixas conectadas pelo admin).
Arquitetura preparada para evoluir para SaaS multiagência.

MÉTRICAS PRIORITÁRIAS:
- CPL (Custo por Lead) — mais importante
- ROAS (Retorno sobre investimento)
- CTR + Impressões
- Gasto total + orçamento diário restante

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STACK TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts para gráficos
- PostgreSQL + Prisma ORM
- NextAuth.js (Google OAuth + credentials)
- google-ads-api (npm) para Google Ads
- Meta Marketing API v20 (REST via axios)
- node-cron para sync a cada 6h e resumo IA às 8h
- Redis Upstash para cache (1h TTL)
- Anthropic Claude API para análise e resumo diário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## SCHEMA DO BANCO (Prisma)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tabelas necessárias:
- Usuario (id, nome, email, senhaHash, role[ADMIN/VIEWER])
- Cliente (id, nome, targetCpl, targetRoas)
- ContaAds (id, clienteId, plataforma[GOOGLE_ADS/META_ADS],
    accountId, accountName, conexaoId, ativa, ultimoSync)
- ConexaoAds (id, usuarioId, plataforma, accessToken, refreshToken, expiresAt)
- Campanha (id, contaId, campanhaId[id na plataforma], nome,
    status[ATIVA/PAUSADA/REMOVIDA/EM_REVISAO], orcamentoDiario)
- SnapshotConta (id, contaId, data, gasto, impressoes, cliques,
    conversoes, cpl, roas, ctr) — @@unique([contaId, data])
- SnapshotCampanha (id, campanhaId, data, gasto, impressoes,
    cliques, conversoes, cpl, roas, ctr) — @@unique([campanhaId, data])
- Alerta (id, clienteId, tipo, mensagem, lido)
- ResumoIA (id, data, conteudo) — @@unique([data])

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FLUXO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Admin conecta contas via OAuth (Google + Meta)
2. Cron job a cada 6h busca métricas de todas as contas
3. Salva snapshot diário no banco (upsert — idempotente)
4. Verifica alertas automaticamente após cada sync
5. Dashboard lê do banco (rápido, sem chamar API em tempo real)
6. Botão "Atualizar agora" força sync manual
7. Cron todo dia às 8h: Claude analisa e gera resumo escrito

GOOGLE ADS — query GAQL:
"SELECT campaign.id, campaign.name, campaign.status,
metrics.cost_micros, metrics.impressions, metrics.clicks,
metrics.conversions, metrics.ctr
FROM campaign WHERE segments.date DURING LAST_7_DAYS"

META ADS — endpoint:
GET /act_{accountId}/insights
?fields=spend,impressions,clicks,actions,ctr
&date_preset=last_7d

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ALERTAS AUTOMÁTICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verificar após cada sync:
- CPL_ALTO: CPL atual > 150% do targetCpl do cliente
- ORCAMENTO_ESGOTANDO: < 20% do orçamento diário às 12h
- SEM_ENTREGA: 0 impressões nas últimas 6h com campanha ativa
- ROAS_BAIXO: ROAS < targetRoas por 3 dias consecutivos
- QUEDA_CTR: CTR caiu > 30% vs semana anterior

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PROMPT QUE O BACKEND USA COM CLAUDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Você é um analista de performance de mídia paga.
Analise os dados do dia {{DATA}} e gere um resumo diário em português.

Dados: {{JSON_METRICAS}}
Targets: {{JSON_TARGETS}}

Gere um resumo com:
1. Destaques positivos (máx 3)
2. Alertas com problema
3. Sugestões práticas (máx 3)

Linguagem simples, cite nomes reais de campanhas e números.
Máximo 300 palavras. Use emojis para leitura rápida."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## O QUE PRECISA EXISTIR NO MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Home (visão geral):
- Cards: gasto total, leads totais, CPL médio, ROAS médio
- Gráfico de linha: gasto por dia Google vs Meta (últimos 30 dias)
- Comparativo: este período vs período anterior
- Seletor de período (hoje / 7d / 30d / personalizado)
- Alertas ativos + resumo IA do dia

Por Cliente:
- Lista com resumo (gasto, leads, CPL, ROAS, badge de alerta)
- Página do cliente: todas campanhas ativas (Google + Meta juntas)
- Status da campanha + drill-down de métricas

Por Plataforma:
- Aba Google Ads: campanhas e grupos de anúncios
- Aba Meta Ads: campanhas e conjuntos de anúncios

Configurações:
- Conectar conta Google Ads (OAuth)
- Conectar conta Meta Ads (OAuth)
- Gerenciar clientes e targets
- Gerenciar usuários

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VARIÁVEIS DE AMBIENTE NECESSÁRIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN,
META_APP_ID, META_APP_SECRET,
ANTHROPIC_API_KEY,
UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ORDEM DE CONSTRUÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Etapa 1: Schema Prisma + seed com dados mockados para desenvolvimento
Etapa 2: Estrutura Next.js + NextAuth (Google OAuth + credentials)
Etapa 3: OAuth Google Ads — conectar conta + salvar tokens
Etapa 4: OAuth Meta Ads — conectar conta + salvar tokens
Etapa 5: Pipeline de sync — buscar métricas Google + Meta + salvar snapshots
Etapa 6: Cron jobs (sync 6h + resumo IA 8h) + lógica de alertas
Etapa 7: Home dashboard — cards + gráfico + seletor de período
Etapa 8: Página por cliente + tabela de campanhas
Etapa 9: Drill-down Google e Meta (abas separadas)
Etapa 10: Resumo IA (Claude) + tela de alertas
Etapa 11: Tela de configurações (conexões + clientes + usuários)

IMPORTANTE: nas Etapas 7-11, se os tokens OAuth ainda não estiverem
configurados, use os dados do seed (mockados) para desenvolver e testar
a UI. O banco já terá dados realistas para trabalhar.

Confirme o entendimento. Comece pela Etapa 1.
Uma etapa por vez. Aguarde minha confirmação antes de avançar.
