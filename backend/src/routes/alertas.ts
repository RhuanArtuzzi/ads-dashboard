import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'

export const alertasRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const query = request.query as { clienteId?: string; lido?: string }
    return prisma.alerta.findMany({
      where: {
        ...(query.clienteId ? { clienteId: query.clienteId } : {}),
        ...(query.lido !== undefined ? { lido: query.lido === 'true' } : { lido: false }),
      },
      include: { cliente: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    })
  })

  app.patch('/:id/lido', async (request, reply) => {
    const { id } = request.params as { id: string }
    const alerta = await prisma.alerta.update({
      where: { id },
      data: { lido: true },
    }).catch(() => null)
    if (!alerta) return reply.code(404).send({ error: 'Alerta não encontrado' })
    return alerta
  })
}
