import type { FastifyPluginAsync } from 'fastify'
import { gerarRelatorio } from '../services/relatorio.js'
import { getUserContext, forceClienteId } from '../core/tenant.js'

export const relatoriosRoutes: FastifyPluginAsync = async (app) => {
  app.post('/gerar', async (request, reply) => {
    const body = request.body as { clienteId?: string; dataInicio?: string; dataFim?: string }
    const ctx = getUserContext(request)
    const clienteId = forceClienteId(ctx, body.clienteId)

    if (!clienteId || !body.dataInicio || !body.dataFim) {
      return reply.code(400).send({ error: 'clienteId, dataInicio e dataFim são obrigatórios' })
    }

    const inicio = new Date(body.dataInicio)
    const fim = new Date(body.dataFim)
    fim.setHours(23, 59, 59, 999)

    const { buffer, nomeCliente } = await gerarRelatorio(clienteId, inicio, fim)
    const slug = nomeCliente.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const filename = `relatorio-${slug}-${body.dataInicio}-a-${body.dataFim}.pdf`

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer)
  })
}
