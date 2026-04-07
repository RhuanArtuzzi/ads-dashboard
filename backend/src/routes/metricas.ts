import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { redis } from '../core/redis.js'

function diasAtras(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

export const metricasRoutes: FastifyPluginAsync = async (app) => {
  // GET /metricas/overview — cards da home
  app.get('/overview', async (request) => {
    const q = request.query as { periodo?: string }
    const periodo = q.periodo ?? '30d'
    const cacheKey = `overview:${periodo}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const dias = periodo === 'hoje' ? 0 : periodo === '7d' ? 7 : 30
    const dataInicio = diasAtras(dias)

    const snapshots = await prisma.snapshotConta.findMany({
      where: { data: { gte: dataInicio } },
    })

    const gastoTotal = snapshots.reduce((s, n) => s + n.gasto, 0)
    const conversoesTotal = snapshots.reduce((s, n) => s + n.conversoes, 0)
    const impressoesTotal = snapshots.reduce((s, n) => s + n.impressoes, 0)
    const cliquesTotal = snapshots.reduce((s, n) => s + n.cliques, 0)
    const cplMedio = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
    const ctrMedio = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null

    const resultado = {
      gastoTotal: parseFloat(gastoTotal.toFixed(2)),
      conversoesTotal,
      impressoesTotal,
      cliquesTotal,
      cplMedio: cplMedio ? parseFloat(cplMedio.toFixed(2)) : null,
      ctrMedio: ctrMedio ? parseFloat(ctrMedio.toFixed(2)) : null,
    }

    await redis.setex(cacheKey, 3600, JSON.stringify(resultado))
    return resultado
  })

  // GET /metricas/grafico — dados para gráfico de linha
  app.get('/grafico', async (request) => {
    const q = request.query as { periodo?: string }
    const dias = q.periodo === '7d' ? 7 : 30
    const dataInicio = diasAtras(dias)

    const snapshots = await prisma.snapshotConta.findMany({
      where: { data: { gte: dataInicio } },
      orderBy: { data: 'asc' },
    })

    // Agrupar por data
    const porData: Record<string, { gasto: number; conversoes: number }> = {}
    for (const s of snapshots) {
      const key = s.data.toISOString().split('T')[0]
      if (!porData[key]) porData[key] = { gasto: 0, conversoes: 0 }
      porData[key].gasto += s.gasto
      porData[key].conversoes += s.conversoes
    }

    return Object.entries(porData).map(([data, vals]) => ({
      data,
      gasto: parseFloat(vals.gasto.toFixed(2)),
      conversoes: vals.conversoes,
    }))
  })

  // GET /metricas/clientes — lista clientes com resumo
  app.get('/clientes', async () => {
    const clientes = await prisma.cliente.findMany({
      include: {
        contas: {
          include: {
            snapshots: { orderBy: { data: 'desc' }, take: 1 },
          },
        },
        alertas: { where: { lido: false } },
      },
    })

    return clientes.map((c) => {
      const snapshots = c.contas.flatMap((conta) => conta.snapshots)
      const gastoTotal = snapshots.reduce((s, n) => s + n.gasto, 0)
      const conversoesTotal = snapshots.reduce((s, n) => s + n.conversoes, 0)
      const cpl = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
      return {
        id: c.id,
        nome: c.nome,
        targetCpl: c.targetCpl,
        targetRoas: c.targetRoas,
        gastoHoje: parseFloat(gastoTotal.toFixed(2)),
        conversoesHoje: conversoesTotal,
        cplHoje: cpl ? parseFloat(cpl.toFixed(2)) : null,
        alertasAtivos: c.alertas.length,
      }
    })
  })

  // GET /metricas/clientes/:id — detalhe do cliente
  app.get('/clientes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        contas: {
          include: {
            campanhas: {
              include: { snapshots: { orderBy: { data: 'desc' }, take: 1 } },
            },
            snapshots: { orderBy: { data: 'desc' }, take: 30 },
          },
        },
        alertas: { where: { lido: false }, orderBy: { criadoEm: 'desc' } },
      },
    })
    if (!cliente) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return cliente
  })

  // GET /metricas/campanhas/:id — drill-down de campanha
  app.get('/campanhas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const campanha = await prisma.campanha.findUnique({
      where: { id },
      include: {
        conta: { include: { cliente: { select: { nome: true } } } },
        snapshots: { orderBy: { data: 'desc' }, take: 30 },
      },
    })
    if (!campanha) return reply.code(404).send({ error: 'Campanha não encontrada' })
    return campanha
  })
}
