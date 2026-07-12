import type { FastifyPluginAsync } from 'fastify'
import axios from 'axios'
import { prisma } from '../core/database.js'
import { env } from '../core/config.js'
import { getUserContext, isAdmin, isClienteAdmin } from '../core/tenant.js'

const META_API_VERSION = 'v20.0'
const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

export const authMetaRoutes: FastifyPluginAsync = async (app) => {
  // GET /auth/meta/url?clienteId=xxx — gera URL OAuth
  // Admin: passa clienteId via query param
  // CLIENTE_ADMIN: usa o próprio clienteId automaticamente
  app.get('/url', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isAdmin(ctx) && !isClienteAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })
    if (!env.FACEBOOK_APP_ID) return reply.code(500).send({ error: 'FACEBOOK_APP_ID não configurado no servidor' })

    let clienteId: string | undefined
    if (isAdmin(ctx)) {
      clienteId = (request.query as { clienteId?: string }).clienteId
      if (!clienteId) return reply.code(400).send({ error: 'clienteId obrigatório' })
    } else {
      clienteId = ctx.clienteId ?? undefined
      if (!clienteId) return reply.code(400).send({ error: 'clienteId não encontrado no token' })
    }

    const redirectUri = env.FACEBOOK_REDIRECT_URI ?? 'https://api-dashboard.ominy.tec.br/auth/meta/callback'

    const url =
      `https://www.facebook.com/${META_API_VERSION}/dialog/oauth` +
      `?client_id=${env.FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${clienteId}` +
      `&scope=ads_read`

    return { url }
  })

  // GET /auth/meta/callback — callback público (Meta redireciona aqui)
  app.get('/callback', async (request, reply) => {
    const { code, state: clienteId, error: oauthError } = request.query as {
      code?: string
      state?: string
      error?: string
    }

    const frontendUrl = env.FRONTEND_URL ?? 'https://dashboard.ominy.tec.br'
    const redirectUri = env.FACEBOOK_REDIRECT_URI ?? 'https://api-dashboard.ominy.tec.br/auth/meta/callback'

    if (oauthError || !code || !clienteId) {
      return reply.redirect(`${frontendUrl}/configuracoes/conexoes?meta=erro`)
    }

    try {
      // 1. Trocar code por short-lived token
      const shortRes = await axios.get(`${GRAPH}/oauth/access_token`, {
        params: { client_id: env.FACEBOOK_APP_ID, redirect_uri: redirectUri, client_secret: env.FACEBOOK_APP_SECRET, code },
      })
      const shortToken = shortRes.data.access_token as string

      // 2. Trocar por long-lived token (~60 dias)
      const longRes = await axios.get(`${GRAPH}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortToken,
        },
      })
      const longToken = longRes.data.access_token as string
      const expiresIn = (longRes.data.expires_in as number) ?? 5184000
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

      // 3. Buscar metaUserId
      const meRes = await axios.get(`${GRAPH}/me`, {
        params: { fields: 'id,name', access_token: longToken },
      })
      const metaUserId = meRes.data.id as string

      // 4. Salvar MetaConnection
      await prisma.metaConnection.upsert({
        where: { clienteId },
        update: { accessToken: longToken, tokenExpiresAt, metaUserId },
        create: { clienteId, accessToken: longToken, tokenExpiresAt, metaUserId },
      })

      // 5. Descobrir e criar ContaAds (sem accessToken — usa MetaConnection no sync)
      const accountsRes = await axios.get(`${GRAPH}/me/adaccounts`, {
        params: { fields: 'id,name,account_status', access_token: longToken, limit: 100 },
      })
      const accounts = (accountsRes.data.data ?? []) as Array<{
        id: string
        name: string
        account_status: number
      }>

      for (const account of accounts) {
        const existing = await prisma.contaAds.findFirst({
          where: { accountId: account.id, plataforma: 'META_ADS' },
        })
        if (!existing) {
          await prisma.contaAds.create({
            data: {
              clienteId,
              plataforma: 'META_ADS',
              accountId: account.id,
              accountName: account.name,
              ativa: account.account_status === 1,
            },
          })
        }
      }

      // Detecta se veio do CLIENTE_ADMIN (redireciona para minha-conta) ou admin (conexoes)
      const usuario = await prisma.usuario.findFirst({
        where: { clienteId, role: 'CLIENTE_ADMIN' },
      })
      const returnPath = usuario
        ? '/configuracoes/minha-conta?meta=sucesso'
        : '/configuracoes/conexoes?meta=sucesso'

      return reply.redirect(`${frontendUrl}${returnPath}`)
    } catch (e) {
      console.error('[Meta OAuth] Erro no callback:', e)
      return reply.redirect(`${frontendUrl}/configuracoes/conexoes?meta=erro`)
    }
  })

  // GET /auth/meta/connections — lista conexões OAuth (admin only)
  app.get('/connections', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })

    return prisma.metaConnection.findMany({
      select: { clienteId: true, metaUserId: true, tokenExpiresAt: true, updatedAt: true },
    })
  })

  // DELETE /auth/meta/connections/:clienteId — desconectar (admin only)
  app.delete('/connections/:clienteId', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })
    const { clienteId } = request.params as { clienteId: string }
    await prisma.metaConnection.delete({ where: { clienteId } }).catch(() => null)
    return { ok: true }
  })

  // GET /auth/meta/my-connection — retorna conexão do próprio CLIENTE_ADMIN
  app.get('/my-connection', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isClienteAdmin(ctx) && !isAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })
    if (!ctx.clienteId) return reply.code(400).send({ error: 'clienteId não encontrado' })

    const conn = await prisma.metaConnection.findUnique({
      where: { clienteId: ctx.clienteId },
      select: { clienteId: true, metaUserId: true, tokenExpiresAt: true, updatedAt: true },
    })
    return conn ?? null
  })

  // DELETE /auth/meta/my-connection — desconectar própria conta (CLIENTE_ADMIN)
  app.delete('/my-connection', async (request, reply) => {
    const ctx = getUserContext(request)
    if (!isClienteAdmin(ctx) && !isAdmin(ctx)) return reply.code(403).send({ error: 'Acesso negado' })
    if (!ctx.clienteId) return reply.code(400).send({ error: 'clienteId não encontrado' })

    await prisma.metaConnection.delete({ where: { clienteId: ctx.clienteId } }).catch(() => null)
    return { ok: true }
  })
}
