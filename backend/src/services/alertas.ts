import { prisma } from '../core/database.js'

export async function verificarAlertas(contaId: string): Promise<void> {
  const conta = await prisma.contaAds.findUnique({
    where: { id: contaId },
    include: {
      cliente: true,
      campanhas: {
        where: { status: 'ATIVA' },
        include: {
          snapshots: { orderBy: { data: 'desc' }, take: 7 },
        },
      },
      snapshots: { orderBy: { data: 'desc' }, take: 1 },
    },
  })

  if (!conta) return

  const clienteId = conta.clienteId
  const snapshotHoje = conta.snapshots[0]
  const agora = new Date()

  // CPL_ALTO: CPL atual > 150% do target
  if (snapshotHoje && conta.cliente.targetCpl && snapshotHoje.cpl) {
    const limite = conta.cliente.targetCpl * 1.5
    if (snapshotHoje.cpl > limite) {
      await criarAlertaSeNaoExiste(clienteId, 'CPL_ALTO',
        `CPL R$${snapshotHoje.cpl.toFixed(2)} na conta "${conta.accountName}" — acima de R$${limite.toFixed(2)} (meta: R$${conta.cliente.targetCpl})`)
    }
  }

  // ORCAMENTO_ESGOTANDO: < 20% às 12h+ (baseado em gasto/orçamento total)
  if (agora.getHours() >= 12) {
    for (const campanha of conta.campanhas) {
      if (!campanha.orcamentoDiario) continue
      const snapCamp = campanha.snapshots[0]
      if (!snapCamp) continue
      const percentoGasto = snapCamp.gasto / campanha.orcamentoDiario
      if (percentoGasto >= 0.8) {
        await criarAlertaSeNaoExiste(clienteId, 'ORCAMENTO_ESGOTANDO',
          `Campanha "${campanha.nome}" com ${Math.round(percentoGasto * 100)}% do orçamento diário gasto`)
      }
    }
  }

  // SEM_ENTREGA: campanha ativa com 0 impressões hoje
  if (snapshotHoje) {
    for (const campanha of conta.campanhas) {
      const snapCamp = campanha.snapshots[0]
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      if (!snapCamp) continue
      const dataSnap = new Date(snapCamp.data)
      dataSnap.setHours(0, 0, 0, 0)
      if (dataSnap.getTime() === hoje.getTime() && snapCamp.impressoes === 0) {
        await criarAlertaSeNaoExiste(clienteId, 'SEM_ENTREGA',
          `Campanha "${campanha.nome}" sem impressões hoje — verificar entrega`)
      }
    }
  }

  // ROAS_BAIXO: ROAS abaixo do alvo por 3 dias consecutivos
  if (conta.cliente.targetRoas) {
    const ultimos3 = conta.snapshots.slice(0, 3)
    if (ultimos3.length === 3 && ultimos3.every((s) => s.roas !== null && s.roas! < conta.cliente.targetRoas!)) {
      await criarAlertaSeNaoExiste(clienteId, 'ROAS_BAIXO',
        `ROAS abaixo de ${conta.cliente.targetRoas}x por 3 dias consecutivos na conta "${conta.accountName}"`)
    }
  }

  // QUEDA_CTR: CTR caiu > 30% vs semana anterior
  const snapshots7d = await prisma.snapshotConta.findMany({
    where: { contaId, data: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    orderBy: { data: 'desc' },
  })
  if (snapshots7d.length >= 14) {
    const ctrRecente = media(snapshots7d.slice(0, 7).map((s) => s.ctr ?? 0))
    const ctrAnterior = media(snapshots7d.slice(7, 14).map((s) => s.ctr ?? 0))
    if (ctrAnterior > 0 && (ctrAnterior - ctrRecente) / ctrAnterior > 0.3) {
      await criarAlertaSeNaoExiste(clienteId, 'QUEDA_CTR',
        `CTR caiu ${Math.round(((ctrAnterior - ctrRecente) / ctrAnterior) * 100)}% vs semana anterior na conta "${conta.accountName}"`)
    }
  }
}

async function criarAlertaSeNaoExiste(
  clienteId: string,
  tipo: 'CPL_ALTO' | 'ORCAMENTO_ESGOTANDO' | 'SEM_ENTREGA' | 'ROAS_BAIXO' | 'QUEDA_CTR',
  mensagem: string
): Promise<void> {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  const existente = await prisma.alerta.findFirst({
    where: { clienteId, tipo, lido: false, criadoEm: { gte: hoje, lt: amanha } },
  })

  if (!existente) {
    await prisma.alerta.create({ data: { clienteId, tipo, mensagem } })
  }
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0
  return valores.reduce((a, b) => a + b, 0) / valores.length
}
