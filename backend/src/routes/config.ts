import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'

export const configRoutes: FastifyPluginAsync = async (app) => {
  app.get('/google', async () => {
    const config = await prisma.googleAdsConfig.findFirst()
    if (!config) return null
    return {
      loginCustomerId: config.loginCustomerId,
      refreshTokenPreview: config.refreshToken.slice(0, 10) + '••••••••',
      updatedAt: config.updatedAt,
    }
  })

  app.put('/google', async (request, reply) => {
    const { refreshToken, loginCustomerId } = request.body as {
      refreshToken?: string
      loginCustomerId?: string
    }
    if (!refreshToken || !loginCustomerId) {
      return reply.code(400).send({ error: 'refreshToken e loginCustomerId são obrigatórios' })
    }
    const existing = await prisma.googleAdsConfig.findFirst()
    if (existing) {
      return prisma.googleAdsConfig.update({ where: { id: existing.id }, data: { refreshToken, loginCustomerId } })
    }
    return prisma.googleAdsConfig.create({ data: { refreshToken, loginCustomerId } })
  })
}
