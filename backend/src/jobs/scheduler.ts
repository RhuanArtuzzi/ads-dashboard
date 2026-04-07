import cron from 'node-cron'
import { sincronizarTodas } from '../services/sync.js'
import { gerarResumoDiario } from '../services/agenteIA.js'
import { prisma } from '../core/database.js'

export function iniciarScheduler(): void {
  // Sync a cada 6h: 0h, 6h, 12h, 18h
  cron.schedule('0 0,6,12,18 * * *', async () => {
    console.log('[Scheduler] Iniciando sync de métricas...')
    try {
      const resultado = await sincronizarTodas()
      console.log(`[Scheduler] Sync concluído: ${resultado.sucesso} sucesso, ${resultado.erro} erros`)
    } catch (e) {
      console.error('[Scheduler] Erro no sync:', e)
    }
  })

  // Resumo IA às 8h diário
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Gerando resumo diário do agente...')
    try {
      const conteudo = await gerarResumoDiario()
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      await prisma.resumoIA.upsert({
        where: { data: hoje },
        update: { conteudo },
        create: { data: hoje, conteudo },
      })
      console.log('[Scheduler] Resumo IA gerado com sucesso')
    } catch (e) {
      console.error('[Scheduler] Erro ao gerar resumo IA:', e)
    }
  })

  console.log('[Scheduler] Jobs registrados: sync 6h, resumo IA 8h')
}
