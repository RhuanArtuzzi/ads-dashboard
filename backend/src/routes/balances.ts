import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'

export const balancesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/balances', async (request) => {
    const { clienteId, plataforma, contaId } = request.query as { clienteId?: string; plataforma?: string; contaId?: string }

    let accountIds: string[] | undefined

    if (contaId) {
      // Filtro por conta específica: busca o accountId externo dessa conta
      const conta = await prisma.contaAds.findUnique({ where: { id: contaId }, select: { accountId: true } })
      accountIds = conta ? [conta.accountId] : []
      if (accountIds.length === 0) return { data: [] }
    } else if (clienteId) {
      const contas = await prisma.contaAds.findMany({
        where: {
          clienteId,
          ativa: true,
          ...(plataforma ? { plataforma: plataforma as any } : {}),
        },
        select: { accountId: true },
      })
      accountIds = contas.map((c) => c.accountId)
      if (accountIds.length === 0) return { data: [] }
    }

    const balances = await prisma.adAccountBalance.findMany({
      where: {
        ...(accountIds ? { accountId: { in: accountIds } } : {}),
        ...(!accountIds && plataforma ? { platform: plataforma } : {}),
      },
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
