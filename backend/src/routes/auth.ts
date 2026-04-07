import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../core/database.js'
import { comparePassword, signToken } from '../core/security.js'
import { loginSchema } from '../schemas/auth.js'

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'Dados inválidos', details: body.error.flatten() })
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: body.data.email } })
    if (!usuario || !usuario.senhaHash) {
      return reply.code(401).send({ error: 'Email ou senha inválidos' })
    }

    const senhaValida = await comparePassword(body.data.senha, usuario.senhaHash)
    if (!senhaValida) {
      return reply.code(401).send({ error: 'Email ou senha inválidos' })
    }

    const token = signToken({ id: usuario.id, email: usuario.email, role: usuario.role })
    return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role } }
  })

  app.get('/me', async (request, reply) => {
    const payload = request.user as { id: string }
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, nome: true, email: true, role: true, criadoEm: true },
    })
    if (!usuario) return reply.code(404).send({ error: 'Usuário não encontrado' })
    return usuario
  })
}
