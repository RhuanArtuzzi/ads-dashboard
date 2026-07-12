import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { redis } from '../core/redis.js'
import { getUserContext, forceClienteId } from '../core/tenant.js'

function diasAtras(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function resolverPeriodo(q: {
  periodo?: string
  dataInicio?: string
  dataFim?: string
}): { dataInicio: Date; dataFim?: Date; cacheavel: boolean } {
  if (q.dataInicio && q.dataFim) {
    const dataInicio = new Date(q.dataInicio)
    const dataFim = new Date(q.dataFim)
    dataFim.setHours(23, 59, 59, 999)
    return { dataInicio, dataFim, cacheavel: false }
  }
  const dias = q.periodo === 'hoje' ? 0 : q.periodo === '7d' ? 7 : 30
  return { dataInicio: diasAtras(dias), cacheavel: true }
}

export const metricasRoutes: FastifyPluginAsync = async (app) => {
  // GET /metricas/overview
  app.get('/overview', async (request) => {
    const q = request.query as {
      periodo?: string
      clienteId?: string
      plataforma?: string
      dataInicio?: string
      dataFim?: string
    }

    const periodo = q.periodo ?? '30d'
    const ctx = getUserContext(request)
    const clienteId = forceClienteId(ctx, q.clienteId)
    const plataforma = q.plataforma || null
    const { dataInicio, dataFim, cacheavel } = resolverPeriodo(q)

    const cacheKey = cacheavel
      ? `overview:${periodo}:${clienteId ?? 'all'}:${plataforma ?? 'TODOS'}`
      : null

    if (cacheKey) {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    }

    const snapshots = await prisma.snapshotConta.findMany({
      where: {
        data: {
          gte: dataInicio,
          ...(dataFim ? { lte: dataFim } : {}),
        },
        conta: {
          ...(clienteId ? { clienteId } : {}),
          ...(plataforma ? { plataforma: plataforma as any } : {}),
        },
      },
    })

    const gastoTotal = snapshots.reduce((s, n) => s + n.gasto, 0)
    const conversoesTotal = snapshots.reduce((s, n) => s + n.conversoes, 0)
    const impressoesTotal = snapshots.reduce((s, n) => s + n.impressoes, 0)
    const cliquesTotal = snapshots.reduce((s, n) => s + n.cliques, 0)
    const alcanceTotal = snapshots.reduce((s, n) => s + (n.alcance ?? 0), 0)
    const valorConversaoTotal = snapshots.reduce((s, n) => s + (n.valorConversao ?? 0), 0)
    const cplMedio = conversoesTotal > 0 ? gastoTotal / conversoesTotal : null
    const ctrMedio = impressoesTotal > 0 ? (cliquesTotal / impressoesTotal) * 100 : null
    const cpcMedio = cliquesTotal > 0 ? gastoTotal / cliquesTotal : null
    const roasMedio = valorConversaoTotal > 0 && gastoTotal > 0 ? valorConversaoTotal / gastoTotal : null

    const resultado = {
      gastoTotal: parseFloat(gastoTotal.toFixed(2)),
      conversoesTotal,
      impressoesTotal,
      cliquesTotal,
      alcanceTotal,
      valorConversaoTotal: parseFloat(valorConversaoTotal.toFixed(2)),
      cplMedio: cplMedio ? parseFloat(cplMedio.toFixed(2)) : null,
      ctrMedio: ctrMedio ? parseFloat(ctrMedio.toFixed(2)) : null,
      cpcMedio: cpcMedio ? parseFloat(cpcMedio.toFixed(2)) : null,
      roasMedio: roasMedio ? parseFloat(roasMedio.toFixed(2)) : null,
    }

    if (cacheKey) await redis.setex(cacheKey, 3600, JSON.stringify(resultado))
    return resultado
  })

  // GET /metricas/grafico
  app.get('/grafico', async (request) => {
    const q = request.query as {
      periodo?: string
      clienteId?: string
      plataforma?: string
      dataInicio?: string
      dataFim?: string
    }

    const ctx = getUserContext(request)
    const clienteId = forceClienteId(ctx, q.clienteId)
    const plataforma = q.plataforma || null
    const { dataInicio, dataFim } = resolverPeriodo(q)

    const snapshots = await prisma.snapshotConta.findMany({
      where: {
        data: {
          gte: dataInicio,
          ...(dataFim ? { lte: dataFim } : {}),
        },
        conta: {
          ...(clienteId ? { clienteId } : {}),
          ...(plataforma ? { plataforma: plataforma as any } : {}),
        },
      },
      orderBy: { data: 'asc' },
    })

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
  app.get('/clientes', async (request) => {
    const ctx = getUserContext(request)
    const where = ctx.role === 'CLIENTE' && ctx.clienteId ? { id: ctx.clienteId } : {}
    const clientes = await prisma.cliente.findMany({
      where,
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

  // GET /metricas/clientes/:id
  app.get('/clientes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const ctx = getUserContext(request)
    if (ctx.role === 'CLIENTE' && ctx.clienteId !== id) {
      return reply.code(403).send({ error: 'Acesso negado' })
    }
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

  // GET /metricas/campanhas/:id
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
