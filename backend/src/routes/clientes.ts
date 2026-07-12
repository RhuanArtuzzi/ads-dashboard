import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { clienteCreateSchema, clienteUpdateSchema, contaCreateSchema, contaUpdateSchema, usuarioClienteCreateSchema } from '../schemas/clientes.js'
import { getUserContext, isAdmin } from '../core/tenant.js'
import { hashPassword } from '../core/security.js'

export const clientesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const ctx = getUserContext(request)
    if (ctx.role === 'CLIENTE') {
      if (!ctx.clienteId) return []
      const c = await prisma.cliente.findUnique({ where: { id: ctx.clienteId } })
      return c ? [c] : []
    }
    return prisma.cliente.findMany({ orderBy: { nome: 'asc' } })
  })

  app.post('/', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const body = clienteCreateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    return prisma.cliente.create({ data: body.data })
  })

  app.put('/:id', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { id } = request.params as { id: string }
    const body = clienteUpdateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    const cliente = await prisma.cliente.update({ where: { id }, data: body.data }).catch(() => null)
    if (!cliente) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return cliente
  })

  app.delete('/:id', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { id } = request.params as { id: string }
    const cliente = await prisma.cliente.delete({ where: { id } }).catch(() => null)
    if (!cliente) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return { ok: true }
  })

  // GET /contas — lista contas (filtrado por clienteId se for role CLIENTE)
  app.get('/contas', async (request) => {
    const ctx = getUserContext(request)
    const where = ctx.role === 'CLIENTE' && ctx.clienteId ? { clienteId: ctx.clienteId } : {}
    return prisma.contaAds.findMany({
      where,
      include: { cliente: { select: { nome: true } } },
      orderBy: { accountName: 'asc' },
    })
  })

  // POST /contas — criar conta (admin only)
  app.post('/contas', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const body = contaCreateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    return prisma.contaAds.create({ data: body.data })
  })

  // PUT /contas/:id — atualizar conta (admin only)
  app.put('/contas/:id', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { id } = request.params as { id: string }
    const body = contaUpdateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    const conta = await prisma.contaAds.update({ where: { id }, data: body.data }).catch(() => null)
    if (!conta) return reply.code(404).send({ error: 'Conta não encontrada' })
    return conta
  })

  // DELETE /contas/:id — remover conta e dados relacionados (admin only)
  app.delete('/contas/:id', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { id } = request.params as { id: string }
    const conta = await prisma.contaAds.findUnique({ where: { id } })
    if (!conta) return reply.code(404).send({ error: 'Conta não encontrada' })
    const campanhas = await prisma.campanha.findMany({ where: { contaId: id }, select: { id: true } })
    const campanhaIds = campanhas.map((c) => c.id)
    if (campanhaIds.length > 0) {
      await prisma.snapshotCampanha.deleteMany({ where: { campanhaId: { in: campanhaIds } } })
    }
    await prisma.campanha.deleteMany({ where: { contaId: id } })
    await prisma.snapshotConta.deleteMany({ where: { contaId: id } })
    await prisma.contaAds.delete({ where: { id } })
    return { ok: true }
  })

  // GET /config/contas — mantido para compatibilidade (admin only)
  app.get('/config/contas', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    return prisma.contaAds.findMany({
      include: { cliente: { select: { nome: true } } },
      orderBy: { accountName: 'asc' },
    })
  })

  // GET /usuarios — lista usuários cliente (admin only)
  app.get('/usuarios', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { clienteId } = request.query as { clienteId?: string }
    return prisma.usuario.findMany({
      where: {
        role: 'CLIENTE',
        ...(clienteId ? { clienteId } : {}),
      },
      select: { id: true, nome: true, email: true, clienteId: true, criadoEm: true },
      orderBy: { criadoEm: 'asc' },
    })
  })

  // POST /usuarios — criar usuário cliente (admin only)
  app.post('/usuarios', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const body = usuarioClienteCreateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })

    const existente = await prisma.usuario.findUnique({ where: { email: body.data.email } })
    if (existente) return reply.code(409).send({ error: 'Email já cadastrado' })

    const senhaHash = await hashPassword(body.data.senha)
    const usuario = await prisma.usuario.create({
      data: { nome: body.data.nome, email: body.data.email, senhaHash, role: 'CLIENTE', clienteId: body.data.clienteId },
      select: { id: true, nome: true, email: true, clienteId: true, criadoEm: true },
    })
    return reply.code(201).send(usuario)
  })

  // DELETE /usuarios/:id — remover usuário cliente (admin only)
  app.delete('/usuarios/:id', async (request, reply) => {
    if (!isAdmin(getUserContext(request))) return reply.code(403).send({ error: 'Acesso negado' })
    const { id } = request.params as { id: string }
    const usuario = await prisma.usuario.delete({ where: { id } }).catch(() => null)
    if (!usuario) return reply.code(404).send({ error: 'Usuário não encontrado' })
    return { ok: true }
  })
}
