import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { clienteCreateSchema, clienteUpdateSchema } from '../schemas/clientes.js'
import { carregarConfigMeta } from '../services/metaAds.js'

export const clientesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    return prisma.cliente.findMany({ orderBy: { nome: 'asc' } })
  })

  app.post('/', async (request, reply) => {
    const body = clienteCreateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    return prisma.cliente.create({ data: body.data })
  })

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = clienteUpdateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    const cliente = await prisma.cliente.update({ where: { id }, data: body.data }).catch(() => null)
    if (!cliente) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return cliente
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const cliente = await prisma.cliente.delete({ where: { id } }).catch(() => null)
    if (!cliente) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return { ok: true }
  })

  // GET /config/contas — lista contas do meta.yaml + status no banco
  app.get('/config/contas', async () => {
    try {
      const config = carregarConfigMeta()
      const contas = await prisma.contaAds.findMany({ where: { ativa: true } })
      return config.contas.map((c) => {
        const contaBanco = contas.find((b) => b.accountId === c.account_id)
        return {
          nome: c.nome,
          accountId: c.account_id,
          clienteId: c.cliente_id,
          ativa: !!contaBanco,
          ultimoSync: contaBanco?.ultimoSync ?? null,
        }
      })
    } catch {
      return []
    }
  })
}
