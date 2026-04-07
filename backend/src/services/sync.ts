import { prisma } from '../core/database.js'
import {
  carregarConfigMeta,
  buscarInsights,
  buscarCampanhas,
  extrairConversoes,
} from './metaAds.js'
import { verificarAlertas } from './alertas.js'

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
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Buscar insights do dia
  const insights = await buscarInsights(accountId, accessToken, apiVersion, 'today')
  const campanhasApi = await buscarCampanhas(accountId, accessToken, apiVersion)

  let gastoTotal = 0
  let impressoesTotal = 0
  let cliquesTotal = 0
  let conversoesTotal = 0

  for (const insight of insights) {
    const gasto = parseFloat(insight.spend ?? '0')
    const impressoes = parseInt(insight.impressions ?? '0')
    const cliques = parseInt(insight.clicks ?? '0')
    const conversoes = extrairConversoes(insight.actions)
    const ctr = parseFloat(insight.ctr ?? '0')
    const cpl = conversoes > 0 ? gasto / conversoes : null
    const roas = null // Meta API não retorna ROAS diretamente no MVP

    gastoTotal += gasto
    impressoesTotal += impressoes
    cliquesTotal += cliques
    conversoesTotal += conversoes

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
      where: { campanhaId_data: { campanhaId: campanha.id, data: hoje } },
      update: { gasto, impressoes, cliques, conversoes, cpl, roas, ctr },
      create: { campanhaId: campanha.id, data: hoje, gasto, impressoes, cliques, conversoes, cpl, roas, ctr },
    })
  }

  const cplConta = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
  const ctrConta = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null

  // Upsert snapshot conta
  await prisma.snapshotConta.upsert({
    where: { contaId_data: { contaId, data: hoje } },
    update: {
      gasto: gastoTotal,
      impressoes: impressoesTotal,
      cliques: cliquesTotal,
      conversoes: conversoesTotal,
      cpl: cplConta,
      ctr: ctrConta,
    },
    create: {
      contaId,
      data: hoje,
      gasto: gastoTotal,
      impressoes: impressoesTotal,
      cliques: cliquesTotal,
      conversoes: conversoesTotal,
      cpl: cplConta,
      ctr: ctrConta,
    },
  })

  await prisma.contaAds.update({ where: { id: contaId }, data: { ultimoSync: new Date() } })
  await verificarAlertas(contaId)
}

export async function sincronizarTodas(): Promise<{ sucesso: number; erro: number; erros: string[] }> {
  const config = carregarConfigMeta()
  const contas = await prisma.contaAds.findMany({ where: { ativa: true } })

  let sucesso = 0
  let erro = 0
  const erros: string[] = []

  await Promise.allSettled(
    contas.map(async (conta) => {
      const contaConfig = config.contas.find((c) => c.account_id === conta.accountId)
      if (!contaConfig) {
        erros.push(`Conta ${conta.accountId} sem configuração no meta.yaml`)
        erro++
        return
      }
      try {
        await sincronizarConta(conta.id, conta.accountId, contaConfig.access_token, config.meta_api_version)
        sucesso++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push(`Erro em ${conta.accountName}: ${msg}`)
        erro++
      }
    })
  )

  return { sucesso, erro, erros }
}
