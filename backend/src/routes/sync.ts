import type { FastifyPluginAsync } from 'fastify'
import { sincronizarTodas } from '../services/sync.js'
import { prisma } from '../core/database.js'

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

  app.get('/status', async () => {
    const contas = await prisma.contaAds.findMany({
      where: { ativa: true },
      select: { id: true, accountName: true, plataforma: true, ultimoSync: true, ativa: true },
    })
    return contas
  })
}
