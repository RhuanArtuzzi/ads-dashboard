import { prisma } from '../core/database.js'
import {
  carregarConfigMeta,
  buscarInsights,
  buscarInsightsPeriodo,
  buscarCampanhas,
  buscarSaldoConta,
  extrairConversoes,
  extrairValorConversao,
} from './metaAds.js'
import { buscarSaldoGoogleAds, buscarMetricasGoogleAds, listarSubContasGoogle } from './googleAds.js'
import { verificarAlertas, alertarFalhaSync } from './alertas.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function configMetaDisponivel(): boolean {
  try {
    const configPath = path.resolve(__dirname, '../../config/meta.yaml')
    return fs.existsSync(configPath)
  } catch {
    return false
  }
}

function mapearStatus(status: string): 'ATIVA' | 'PAUSADA' | 'REMOVIDA' | 'EM_REVISAO' {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'ATIVA'
    case 'PAUSED': return 'PAUSADA'
    case 'DELETED':
    case 'ARCHIVED': return 'REMOVIDA'
    default: return 'EM_REVISAO'
  }
}

async function sincronizarConta(contaId: string, accountId: string, accessToken: string, apiVersion: string) {
  // Buscar insights do dia
  const insights = await buscarInsights(accountId, accessToken, apiVersion, 'today')
  const campanhasApi = await buscarCampanhas(accountId, accessToken, apiVersion)

  // Usar date_start da Meta (timezone da conta) em vez de new Date() UTC
  // Evita salvar snapshot no dia errado quando sync roda entre 0h e 3h UTC (= 21h-0h BRT)
  let dataSync: Date
  if (insights.length > 0 && insights[0].date_start) {
    const [y, m, d] = insights[0].date_start.split('-').map(Number)
    dataSync = new Date(y, m - 1, d)
    dataSync.setHours(0, 0, 0, 0)
  } else {
    // Sem campanhas rodando hoje — usar BRT (UTC-3) como fallback
    const agoraBRT = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const [y, m, d] = agoraBRT.toISOString().split('T')[0].split('-').map(Number)
    dataSync = new Date(y, m - 1, d)
    dataSync.setHours(0, 0, 0, 0)
  }

  let gastoTotal = 0
  let impressoesTotal = 0
  let cliquesTotal = 0
  let conversoesTotal = 0
  let alcanceTotal = 0
  let valorConversaoTotal = 0

  for (const insight of insights) {
    const gasto = parseFloat(insight.spend ?? '0')
    const impressoes = parseInt(insight.impressions ?? '0')
    const cliques = parseInt(insight.clicks ?? '0')
    const alcance = parseInt(insight.reach ?? '0')
    const conversoes = extrairConversoes(insight.actions)
    const valorConversao = extrairValorConversao(insight.action_values)
    const ctr = parseFloat(insight.ctr ?? '0')
    const cpl = conversoes > 0 ? gasto / conversoes : null
    const roas = valorConversao > 0 && gasto > 0 ? parseFloat((valorConversao / gasto).toFixed(2)) : null

    gastoTotal += gasto
    impressoesTotal += impressoes
    cliquesTotal += cliques
    conversoesTotal += conversoes
    alcanceTotal += alcance
    valorConversaoTotal += valorConversao

    // Upsert campanha
    const campanhaInfo = campanhasApi.find((c) => c.id === insight.campaign_id)
    const campanha = await prisma.campanha.upsert({
      where: { campanhaIdPlataforma_contaId: { campanhaIdPlataforma: insight.campaign_id, contaId } },
      update: {
        nome: insight.campaign_name,
        status: mapearStatus(campanhaInfo?.status ?? 'ACTIVE'),
        orcamentoDiario: campanhaInfo?.daily_budget ? parseFloat(campanhaInfo.daily_budget) / 100 : undefined,
        atualizadoEm: new Date(),
      },
      create: {
        contaId,
        campanhaIdPlataforma: insight.campaign_id,
        nome: insight.campaign_name,
        status: mapearStatus(campanhaInfo?.status ?? 'ACTIVE'),
        orcamentoDiario: campanhaInfo?.daily_budget ? parseFloat(campanhaInfo.daily_budget) / 100 : undefined,
      },
    })

    // Upsert snapshot campanha
    await prisma.snapshotCampanha.upsert({
      where: { campanhaId_data: { campanhaId: campanha.id, data: dataSync } },
      update: { gasto, impressoes, cliques, conversoes, cpl, roas, ctr, alcance, valorConversao },
      create: { campanhaId: campanha.id, data: dataSync, gasto, impressoes, cliques, conversoes, cpl, roas, ctr, alcance, valorConversao },
    })
  }

  const cplConta = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
  const ctrConta = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null
  const roasConta = valorConversaoTotal > 0 && gastoTotal > 0 ? parseFloat((valorConversaoTotal / gastoTotal).toFixed(2)) : null

  // Upsert snapshot conta
  await prisma.snapshotConta.upsert({
    where: { contaId_data: { contaId, data: dataSync } },
    update: {
      gasto: gastoTotal,
      impressoes: impressoesTotal,
      cliques: cliquesTotal,
      conversoes: conversoesTotal,
      cpl: cplConta,
      ctr: ctrConta,
      roas: roasConta,
      alcance: alcanceTotal,
      valorConversao: valorConversaoTotal,
    },
    create: {
      contaId,
      data: dataSync,
      gasto: gastoTotal,
      impressoes: impressoesTotal,
      cliques: cliquesTotal,
      conversoes: conversoesTotal,
      cpl: cplConta,
      ctr: ctrConta,
      roas: roasConta,
      alcance: alcanceTotal,
      valorConversao: valorConversaoTotal,
    },
  })

  await prisma.contaAds.update({ where: { id: contaId }, data: { ultimoSync: new Date() } })
  await verificarAlertas(contaId)
}

async function backfillConta(contaId: string, accountId: string, accessToken: string, apiVersion: string, dias: number) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const since = new Date(hoje)
  since.setDate(since.getDate() - dias + 1)

  const sinceStr = since.toISOString().split('T')[0]
  const hojStr = hoje.toISOString().split('T')[0]

  const insights = await buscarInsightsPeriodo(accountId, accessToken, apiVersion, sinceStr, hojStr)
  const campanhasApi = await buscarCampanhas(accountId, accessToken, apiVersion)

  const porData: Record<string, typeof insights> = {}
  for (const insight of insights) {
    const d = insight.date_start
    if (!porData[d]) porData[d] = []
    porData[d].push(insight)
  }

  for (const [dataStr, dayInsights] of Object.entries(porData)) {
    const [y, m, d] = dataStr.split('-').map(Number)
    const data = new Date(y, m - 1, d)
    data.setHours(0, 0, 0, 0)

    let gastoTotal = 0, impressoesTotal = 0, cliquesTotal = 0, conversoesTotal = 0, alcanceTotal = 0, valorConversaoTotal = 0

    for (const insight of dayInsights) {
      const gasto = parseFloat(insight.spend ?? '0')
      const impressoes = parseInt(insight.impressions ?? '0')
      const cliques = parseInt(insight.clicks ?? '0')
      const alcance = parseInt(insight.reach ?? '0')
      const conversoes = extrairConversoes(insight.actions)
      const valorConversao = extrairValorConversao(insight.action_values)
      const ctr = parseFloat(insight.ctr ?? '0')
      const cpl = conversoes > 0 ? gasto / conversoes : null
      const roas = valorConversao > 0 && gasto > 0 ? parseFloat((valorConversao / gasto).toFixed(2)) : null

      gastoTotal += gasto
      impressoesTotal += impressoes
      cliquesTotal += cliques
      conversoesTotal += conversoes
      alcanceTotal += alcance
      valorConversaoTotal += valorConversao

      const campanhaInfo = campanhasApi.find((c) => c.id === insight.campaign_id)
      const campanha = await prisma.campanha.upsert({
        where: { campanhaIdPlataforma_contaId: { campanhaIdPlataforma: insight.campaign_id, contaId } },
        update: { nome: insight.campaign_name, status: mapearStatus(campanhaInfo?.status ?? 'ACTIVE'), atualizadoEm: new Date() },
        create: { contaId, campanhaIdPlataforma: insight.campaign_id, nome: insight.campaign_name, status: mapearStatus(campanhaInfo?.status ?? 'ACTIVE') },
      })

      await prisma.snapshotCampanha.upsert({
        where: { campanhaId_data: { campanhaId: campanha.id, data } },
        update: { gasto, impressoes, cliques, conversoes, cpl, roas, ctr, alcance, valorConversao },
        create: { campanhaId: campanha.id, data, gasto, impressoes, cliques, conversoes, cpl, roas, ctr, alcance, valorConversao },
      })
    }

    const cplConta = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
    const ctrConta = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null
    const roasConta = valorConversaoTotal > 0 && gastoTotal > 0 ? parseFloat((valorConversaoTotal / gastoTotal).toFixed(2)) : null

    await prisma.snapshotConta.upsert({
      where: { contaId_data: { contaId, data } },
      update: { gasto: gastoTotal, impressoes: impressoesTotal, cliques: cliquesTotal, conversoes: conversoesTotal, cpl: cplConta, ctr: ctrConta, roas: roasConta, alcance: alcanceTotal, valorConversao: valorConversaoTotal },
      create: { contaId, data, gasto: gastoTotal, impressoes: impressoesTotal, cliques: cliquesTotal, conversoes: conversoesTotal, cpl: cplConta, ctr: ctrConta, roas: roasConta, alcance: alcanceTotal, valorConversao: valorConversaoTotal },
    })
  }
}

async function resolverToken(conta: { accessToken: string | null; accountId: string; clienteId: string }, configYaml: any) {
  let token = conta.accessToken ?? null
  if (!token && configYaml) {
    token = configYaml.contas.find((c: any) => c.account_id === conta.accountId)?.access_token ?? null
  }
  if (!token) {
    const metaConn = await prisma.metaConnection.findUnique({ where: { clienteId: conta.clienteId } })
    token = metaConn?.accessToken ?? null
  }
  return token
}

export async function backfillHistorico(clienteId?: string, dias = 30): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  const contas = await prisma.contaAds.findMany({
    where: { ativa: true, plataforma: 'META_ADS', ...(clienteId ? { clienteId } : {}) },
  })
  const apiVersion = 'v22.0'

  let configYaml: Awaited<ReturnType<typeof carregarConfigMeta>> | null = null
  if (configMetaDisponivel()) {
    try { configYaml = carregarConfigMeta() } catch { /* ignora */ }
  }

  let sucesso = 0, erro = 0
  const erros: string[] = []

  for (const conta of contas) {
    const token = await resolverToken(conta, configYaml)
    if (!token) {
      erros.push(`Conta "${conta.accountName}" sem access token configurado`)
      erro++
      continue
    }
    try {
      await backfillConta(conta.id, conta.accountId, token, apiVersion, dias)
      sucesso++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      erros.push(`Erro em ${conta.accountName}: ${msg}`)
      erro++
    }
  }

  return { sucesso, erro, erros }
}

export async function sincronizarPorCliente(clienteId: string): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  const contas = await prisma.contaAds.findMany({ where: { ativa: true, plataforma: 'META_ADS', clienteId } })
  const apiVersion = 'v22.0'

  let configYaml: Awaited<ReturnType<typeof carregarConfigMeta>> | null = null
  if (configMetaDisponivel()) {
    try { configYaml = carregarConfigMeta() } catch { /* ignora */ }
  }

  let sucesso = 0
  let erro = 0
  const erros: string[] = []

  await Promise.allSettled(
    contas.map(async (conta) => {
      let token = conta.accessToken ?? null
      if (!token && configYaml) {
        token = configYaml.contas.find((c) => c.account_id === conta.accountId)?.access_token ?? null
      }
      if (!token) {
        const metaConn = await prisma.metaConnection.findUnique({ where: { clienteId: conta.clienteId } })
        token = metaConn?.accessToken ?? null
      }
      if (!token) {
        erros.push(`Conta "${conta.accountName}" sem access token configurado`)
        erro++
        return
      }
      try {
        await sincronizarConta(conta.id, conta.accountId, token, apiVersion)
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro em ${conta.accountName}: ${msg}`)
        await alertarFalhaSync(conta.clienteId, `Falha ao sincronizar métricas da conta "${conta.accountName}": ${msg}`)
        erro++
      }
    })
  )

  return { sucesso, erro, erros }
}

export async function sincronizarTodas(): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  const contas = await prisma.contaAds.findMany({ where: { ativa: true, plataforma: 'META_ADS' } })
  const apiVersion = 'v22.0'

  // Carrega YAML como fallback (opcional)
  let configYaml: Awaited<ReturnType<typeof carregarConfigMeta>> | null = null
  if (configMetaDisponivel()) {
    try { configYaml = carregarConfigMeta() } catch { /* ignora */ }
  }

  let sucesso = 0
  let erro = 0
  const erros: string[] = []

  await Promise.allSettled(
    contas.map(async (conta) => {
      // Token: prioridade banco → fallback YAML → fallback MetaConnection OAuth
      let token = conta.accessToken ?? null
      if (!token && configYaml) {
        token = configYaml.contas.find((c) => c.account_id === conta.accountId)?.access_token ?? null
      }
      if (!token) {
        const metaConn = await prisma.metaConnection.findUnique({ where: { clienteId: conta.clienteId } })
        token = metaConn?.accessToken ?? null
      }
      if (!token) {
        erros.push(`Conta "${conta.accountName}" sem access token configurado`)
        erro++
        return
      }
      try {
        await sincronizarConta(conta.id, conta.accountId, token, apiVersion)
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro em ${conta.accountName}: ${msg}`)
        await alertarFalhaSync(conta.clienteId, `Falha ao sincronizar métricas da conta "${conta.accountName}": ${msg}`)
        erro++
      }
    })
  )

  return { sucesso, erro, erros }
}

export async function sincronizarSaldos(): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  const contas = await prisma.contaAds.findMany({ where: { ativa: true, plataforma: 'META_ADS' } })
  const apiVersion = 'v22.0'

  let configYaml: Awaited<ReturnType<typeof carregarConfigMeta>> | null = null
  if (configMetaDisponivel()) {
    try { configYaml = carregarConfigMeta() } catch { /* ignora */ }
  }

  let sucesso = 0
  let erro = 0
  const erros: string[] = []

  await Promise.allSettled(
    contas.map(async (conta) => {
      let token = conta.accessToken ?? null
      if (!token && configYaml) {
        token = configYaml.contas.find((c) => c.account_id === conta.accountId)?.access_token ?? null
      }
      if (!token) {
        const metaConn = await prisma.metaConnection.findUnique({ where: { clienteId: conta.clienteId } })
        token = metaConn?.accessToken ?? null
      }
      if (!token) {
        erros.push(`Conta "${conta.accountName}" sem access token configurado`)
        erro++
        return
      }
      try {
        const { name, balance, currency } = await buscarSaldoConta(conta.accountId, token, apiVersion)
        await prisma.adAccountBalance.upsert({
          where: { platform_accountId: { platform: 'META_ADS', accountId: conta.accountId } },
          update: { accountName: name, balance, currency, updatedAt: new Date() },
          create: { platform: 'META_ADS', accountId: conta.accountId, accountName: name, balance, currency },
        })
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro ao buscar saldo de ${conta.accountName}: ${msg}`)
        await alertarFalhaSync(conta.clienteId, `Falha ao sincronizar saldo da conta "${conta.accountName}": ${msg}`)
        erro++
      }
    })
  )

  return { sucesso, erro, erros }
}

async function descobrirEUpsertSubContasGoogle(): Promise<void> {
  const subContas = await listarSubContasGoogle()
  for (const sub of subContas) {
    const existing = await prisma.contaAds.findFirst({
      where: { accountId: sub.customerId, plataforma: 'GOOGLE_ADS' },
    })
    if (existing) continue
    let cliente = await prisma.cliente.findFirst({ where: { nome: sub.name } })
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { nome: sub.name } })
    }
    await prisma.contaAds.create({
      data: { clienteId: cliente.id, plataforma: 'GOOGLE_ADS', accountId: sub.customerId, accountName: sub.name },
    })
  }
}

export async function sincronizarSaldosGoogle(): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  await descobrirEUpsertSubContasGoogle()
  const contas = await prisma.contaAds.findMany({ where: { ativa: true, plataforma: 'GOOGLE_ADS' } })
  let sucesso = 0, erro = 0
  const erros: string[] = []

  await Promise.allSettled(
    contas.map(async (conta) => {
      try {
        const { balance, currency } = await buscarSaldoGoogleAds(conta.accountId)
        await prisma.adAccountBalance.upsert({
          where: { platform_accountId: { platform: 'GOOGLE_ADS', accountId: conta.accountId } },
          update: { accountName: conta.accountName, balance, currency, updatedAt: new Date() },
          create: { platform: 'GOOGLE_ADS', accountId: conta.accountId, accountName: conta.accountName, balance, currency },
        })
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro ao buscar saldo Google Ads de ${conta.accountName}: ${msg}`)
        await alertarFalhaSync(conta.clienteId, `Falha ao sincronizar saldo Google Ads da conta "${conta.accountName}": ${msg}`)
        erro++
      }
    })
  )
  return { sucesso, erro, erros }
}

export async function sincronizarMetricasGoogle(): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  await descobrirEUpsertSubContasGoogle()
  const contas = await prisma.contaAds.findMany({ where: { ativa: true, plataforma: 'GOOGLE_ADS' } })
  let sucesso = 0, erro = 0
  const erros: string[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  await Promise.allSettled(
    contas.map(async (conta) => {
      try {
        const metricas = await buscarMetricasGoogleAds(conta.accountId)
        let gastoTotal = 0, impressoesTotal = 0, cliquesTotal = 0, conversoesTotal = 0, valorConversaoTotal = 0
        for (const m of metricas) {
          const campanha = await prisma.campanha.upsert({
            where: { campanhaIdPlataforma_contaId: { campanhaIdPlataforma: m.campaignId, contaId: conta.id } },
            update: { nome: m.campaignName, atualizadoEm: new Date() },
            create: { contaId: conta.id, campanhaIdPlataforma: m.campaignId, nome: m.campaignName, status: 'ATIVA' },
          })
          const cpl = m.conversoes > 0 ? m.gasto / m.conversoes : null
          await prisma.snapshotCampanha.upsert({
            where: { campanhaId_data: { campanhaId: campanha.id, data: hoje } },
            update: { gasto: m.gasto, impressoes: m.impressoes, cliques: m.cliques, conversoes: m.conversoes, cpl, roas: m.roas, ctr: m.ctr, valorConversao: m.valorConversao },
            create: { campanhaId: campanha.id, data: hoje, gasto: m.gasto, impressoes: m.impressoes, cliques: m.cliques, conversoes: m.conversoes, cpl, roas: m.roas, ctr: m.ctr, valorConversao: m.valorConversao },
          })
          gastoTotal += m.gasto
          impressoesTotal += m.impressoes
          cliquesTotal += m.cliques
          conversoesTotal += m.conversoes
          valorConversaoTotal += m.valorConversao
        }
        // Cria SnapshotConta agregando campanhas (necessário para overview no dashboard)
        const cplConta = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
        const ctrConta = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null
        const roasConta = valorConversaoTotal > 0 && gastoTotal > 0 ? parseFloat((valorConversaoTotal / gastoTotal).toFixed(2)) : null
        await prisma.snapshotConta.upsert({
          where: { contaId_data: { contaId: conta.id, data: hoje } },
          update: { gasto: gastoTotal, impressoes: impressoesTotal, cliques: cliquesTotal, conversoes: conversoesTotal, cpl: cplConta, ctr: ctrConta, roas: roasConta, valorConversao: valorConversaoTotal },
          create: { contaId: conta.id, data: hoje, gasto: gastoTotal, impressoes: impressoesTotal, cliques: cliquesTotal, conversoes: conversoesTotal, cpl: cplConta, ctr: ctrConta, roas: roasConta, valorConversao: valorConversaoTotal },
        })
        await prisma.contaAds.update({ where: { id: conta.id }, data: { ultimoSync: new Date() } })
        await verificarAlertas(conta.id)
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro ao buscar métricas Google Ads de ${conta.accountName}: ${msg}`)
        await alertarFalhaSync(conta.clienteId, `Falha ao sincronizar métricas Google Ads da conta "${conta.accountName}": ${msg}`)
        erro++
      }
    })
  )
  return { sucesso, erro, erros }
}
