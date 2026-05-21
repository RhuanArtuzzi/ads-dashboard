import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'

export const balancesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/balances', async () => {
    const balances = await prisma.adAccountBalance.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return {
      data: balances.map((b) => ({
        id: b.id,
        platform: b.platform,
        accountId: b.accountId,
        accountName: b.accountName,
        balance: b.balance ? Number(b.balance) : 0,
        currency: b.currency ?? 'BRL',
        updatedAt: b.updatedAt.toISOString(),
      })),
    }
  })
}
