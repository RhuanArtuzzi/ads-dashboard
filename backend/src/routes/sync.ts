import type { FastifyPluginAsync } from 'fastify'
import { sincronizarTodas, sincronizarSaldos, sincronizarSaldosGoogle, sincronizarMetricasGoogle, sincronizarPorCliente } from '../services/sync.js'
import { prisma } from '../core/database.js'
import { getUserContext, isClienteAdmin } from '../core/tenant.js'

export const syncRoutes: FastifyPluginAsync = async (app) => {
  app.post('/manual', async (_request, reply) => {
    try {
      const resultado = await sincronizarTodas()
      return { ok: true, ...resultado }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao sincronizar', details: msg })
    }
  })

  app.post('/manual/saldos', async (_request, reply) => {
    try {
      const resultado = await sincronizarSaldos()
      return { ok: true, ...resultado }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao sincronizar saldos', details: msg })
    }
  })

  app.post('/manual/google/saldos', async (_request, reply) => {
    try {
      const resultado = await sincronizarSaldosGoogle()
      return { ok: true, ...resultado }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao sincronizar saldos Google Ads', details: msg })
    }
  })

  app.post('/manual/google/metricas', async (_request, reply) => {
    try {
      const resultado = await sincronizarMetricasGoogle()
      return { ok: true, ...resultado }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao sincronizar métricas Google Ads', details: msg })
    }
  })

  // POST /sync/manual/minha-conta — sincroniza apenas as contas do CLIENTE_ADMIN autenticado
  app.post('/manual/minha-conta', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isClienteAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })
    if (!ctx.clienteId) return reply.code(400).send({ error: 'clienteId não encontrado' })
    try {
      const resultado = await sincronizarPorCliente(ctx.clienteId)
      return { ok: true, ...resultado }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao sincronizar', details: msg })
    }
  })

  app.get('/status', async () => {
    const contas = await prisma.contaAds.findMany({
      where: { ativa: true },
      select: { id: true, accountName: true, plataforma: true, ultimoSync: true, ativa: true },
    })
    return contas
  })
}
