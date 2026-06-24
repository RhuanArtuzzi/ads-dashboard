import cron from 'node-cron'
import { gerarResumoDiario } from '../services/agenteIA.js'
import { prisma } from '../core/database.js'

export function iniciarScheduler(): void {
  // Sync de Meta Ads (metricas + saldo) roda via BullMQ - ver jobs/syncWorker.ts

  // Resumo IA às 8h diário (desativado por padrão — defina IA_AUTO=true no .env para ativar)
  if (process.env.IA_AUTO === 'true') {
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
    console.log('[Scheduler] Resumo IA automático ATIVADO (8h diário)')
  } else {
    console.log('[Scheduler] Resumo IA automático DESATIVADO (use IA_AUTO=true para ativar)')
  }

  console.log('[Scheduler] Job registrado: resumo IA 8h')
}
