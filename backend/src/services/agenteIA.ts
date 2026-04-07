import { ChatAnthropic } from '@langchain/anthropic'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { prisma } from '../core/database.js'

const llm = new ChatAnthropic({
  model: 'claude-sonnet-4-6',
  temperature: 0.3,
})

const buscarMetricasHoje = tool(
  async ({ clienteId }: { clienteId: string }) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)
    const snapshots = await prisma.snapshotConta.findMany({
      where: { conta: { clienteId }, data: { gte: hoje, lt: amanha } },
      include: { conta: { select: { accountName: true } } },
    })
    return JSON.stringify(snapshots)
  },
  {
    name: 'buscar_metricas_hoje',
    description: 'Busca as metricas de hoje para um cliente especifico pelo clienteId.',
    schema: z.object({ clienteId: z.string().describe('ID do cliente no banco') }),
  }
)

const buscarHistorico7Dias = tool(
  async ({ clienteId }: { clienteId: string }) => {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const snapshots = await prisma.snapshotConta.findMany({
      where: { conta: { clienteId }, data: { gte: seteDiasAtras } },
      orderBy: { data: 'asc' },
      include: { conta: { select: { accountName: true } } },
    })
    return JSON.stringify(snapshots)
  },
  {
    name: 'buscar_historico_7_dias',
    description: 'Busca o historico dos ultimos 7 dias para comparacao de tendencias.',
    schema: z.object({ clienteId: z.string() }),
  }
)

const listarCampanhasAtivas = tool(
  async () => {
    const campanhas = await prisma.campanha.findMany({
      where: { status: 'ATIVA' },
      include: {
        conta: { select: { accountName: true, cliente: { select: { nome: true } } } },
        snapshots: { orderBy: { data: 'desc' }, take: 1 },
      },
    })
    return JSON.stringify(campanhas)
  },
  {
    name: 'listar_campanhas_ativas',
    description: 'Lista todas as campanhas ativas com suas metricas mais recentes.',
    schema: z.object({}),
  }
)

const buscarTargetsCliente = tool(
  async ({ clienteId }: { clienteId: string }) => {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { nome: true, targetCpl: true, targetRoas: true },
    })
    return JSON.stringify(cliente)
  },
  {
    name: 'buscar_targets_cliente',
    description: 'Retorna os targets de CPL e ROAS configurados para o cliente.',
    schema: z.object({ clienteId: z.string() }),
  }
)

const listarTodosClientes = tool(
  async () => {
    const clientes = await prisma.cliente.findMany({
      select: { id: true, nome: true, targetCpl: true, targetRoas: true },
    })
    return JSON.stringify(clientes)
  },
  {
    name: 'listar_todos_clientes',
    description: 'Lista todos os clientes cadastrados com seus IDs e targets.',
    schema: z.object({}),
  }
)

const tools = [
  buscarMetricasHoje,
  buscarHistorico7Dias,
  listarCampanhasAtivas,
  buscarTargetsCliente,
  listarTodosClientes,
]

const SYSTEM_PROMPT = `Voce e um gestor de trafego experiente com 10 anos de experiencia em Meta Ads.
Analise os dados de performance das campanhas e gere insights praticos e acionaveis.
Seja direto, cite nomes reais de campanhas e numeros concretos.
Use portugues brasileiro. Maximo 300 palavras. Sem emojis.

Estruture sua analise em:
1. Destaques positivos (max 3)
2. Atencao necessaria (campanhas com problemas)
3. Sugestoes do gestor (max 3 acoes praticas)`

export async function gerarResumoDiario(): Promise<string> {
  const agent = createReactAgent({ llm, tools })
  const dataHoje = new Date().toLocaleDateString('pt-BR')

  const result = await agent.invoke({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analise a performance de todas as campanhas de hoje (${dataHoje}) e gere o resumo diario. Comece listando todos os clientes, depois busque as metricas de cada um.`,
      },
    ],
  })

  const lastMessage = result.messages.at(-1)
  return typeof lastMessage?.content === 'string' ? lastMessage.content : ''
}
