import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './core/config.js'
import { authRoutes } from './routes/auth.js'
import { metricasRoutes } from './routes/metricas.js'
import { clientesRoutes } from './routes/clientes.js'
import { alertasRoutes } from './routes/alertas.js'
import { iaRoutes } from './routes/ia.js'
import { syncRoutes } from './routes/sync.js'
import { balancesRoutes } from './routes/balances.js'
import { iniciarScheduler } from './jobs/scheduler.js'
import { iniciarSyncWorker, registrarJobsRecorrentes } from './jobs/syncWorker.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(jwt, { secret: env.JWT_SECRET })

app.addHook('onRequest', async (request, reply) => {
  const publicRoutes = ['/auth/login', '/health']
  if (publicRoutes.includes(request.url)) return
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Não autorizado' })
  }
})

await app.register(authRoutes, { prefix: '/auth' })
await app.register(metricasRoutes, { prefix: '/metricas' })
await app.register(clientesRoutes, { prefix: '/clientes' })
await app.register(alertasRoutes, { prefix: '/alertas' })
await app.register(iaRoutes, { prefix: '/ia' })
await app.register(syncRoutes, { prefix: '/sync' })
await app.register(balancesRoutes, { prefix: '' })

app.get('/health', async () => ({ status: 'ok' }))

iniciarScheduler()
iniciarSyncWorker()
await registrarJobsRecorrentes()

const port = parseInt(env.PORT)
await app.listen({ port, host: '0.0.0.0' })
console.log(`[Backend] Servidor rodando na porta ${port}`)
