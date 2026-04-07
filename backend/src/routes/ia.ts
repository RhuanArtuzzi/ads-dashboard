import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { gerarResumoDiario } from '../services/agenteIA.js'

export const iaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/resumo', async (_request, reply) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const resumo = await prisma.resumoIA.findUnique({ where: { data: hoje } })
    if (!resumo) return reply.code(404).send({ error: 'Nenhum resumo gerado hoje ainda' })
    return resumo
  })

  app.get('/historico', async () => {
    return prisma.resumoIA.findMany({
      orderBy: { data: 'desc' },
      take: 30,
    })
  })

  app.post('/gerar', async (_request, reply) => {
    try {
      const conteudo = await gerarResumoDiario()
      if (!conteudo) return reply.code(500).send({ error: 'Agente não retornou conteúdo' })

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const resumo = await prisma.resumoIA.upsert({
        where: { data: hoje },
        update: { conteudo },
        create: { data: hoje, conteudo },
      })

      return resumo
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Erro ao gerar resumo', details: msg })
    }
  })
}
