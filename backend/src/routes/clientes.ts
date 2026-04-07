import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { clienteCreateSchema, clienteUpdateSchema, contaCreateSchema, contaUpdateSchema } from '../schemas/clientes.js'
import { carregarConfigMeta } from '../services/metaAds.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

  // GET /contas — lista todas as contas do banco
  app.get('/contas', async () => {
    return prisma.contaAds.findMany({
      include: { cliente: { select: { nome: true } } },
      orderBy: { accountName: 'asc' },
    })
  })

  // POST /contas — criar conta com token
  app.post('/contas', async (request, reply) => {
    const body = contaCreateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    return prisma.contaAds.create({ data: body.data })
  })

  // PUT /contas/:id — atualizar conta
  app.put('/contas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = contaUpdateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    const conta = await prisma.contaAds.update({ where: { id }, data: body.data }).catch(() => null)
    if (!conta) return reply.code(404).send({ error: 'Conta não encontrada' })
    return conta
  })

  // DELETE /contas/:id — remover conta
  app.delete('/contas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const conta = await prisma.contaAds.delete({ where: { id } }).catch(() => null)
    if (!conta) return reply.code(404).send({ error: 'Conta não encontrada' })
    return { ok: true }
  })

  // GET /config/contas — mantido para compatibilidade
  app.get('/config/contas', async () => {
    return prisma.contaAds.findMany({
      include: { cliente: { select: { nome: true } } },
      orderBy: { accountName: 'asc' },
    })
  })
}
