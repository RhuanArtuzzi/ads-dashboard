import { Worker } from 'bullmq'
import { queueConnection, syncQueue } from '../core/queue.js'
import { sincronizarTodas, sincronizarSaldos, sincronizarSaldosGoogle, sincronizarMetricasGoogle } from '../services/sync.js'

export function iniciarSyncWorker() {
  const worker = new Worker(
    'ads-sync',
    async (job) => {
      if (job.name === 'meta-metrics') {
        const resultado = await sincronizarTodas()
        console.log(`[SyncWorker] meta-metrics: ${resultado.sucesso} sucesso, ${resultado.erro} erros`)
        if (resultado.erro > 0) throw new Error(resultado.erros.join('; '))
      } else if (job.name === 'meta-balance') {
        const resultado = await sincronizarSaldos()
        console.log(`[SyncWorker] meta-balance: ${resultado.sucesso} sucesso, ${resultado.erro} erros`)
        if (resultado.erro > 0) throw new Error(resultado.erros.join('; '))
      } else if (job.name === 'google-balance') {
        const resultado = await sincronizarSaldosGoogle()
        console.log(`[SyncWorker] google-balance: ${resultado.sucesso} sucesso, ${resultado.erro} erros`)
        if (resultado.erro > 0) throw new Error(resultado.erros.join('; '))
      } else if (job.name === 'google-metrics') {
        const resultado = await sincronizarMetricasGoogle()
        console.log(`[SyncWorker] google-metrics: ${resultado.sucesso} sucesso, ${resultado.erro} erros`)
        if (resultado.erro > 0) throw new Error(resultado.erros.join('; '))
      }
    },
    { connection: queueConnection }
  )

  worker.on('failed', (job, err) => {
    console.error(`[SyncWorker] Job "${job?.name}" falhou:`, err.message)
  })

  return worker
}

export async function registrarJobsRecorrentes(): Promise<void> {
  await syncQueue.upsertJobScheduler('meta-metrics-6h', { pattern: '0 0,6,12,18 * * *' }, { name: 'meta-metrics' })
  await syncQueue.upsertJobScheduler('meta-balance-6h', { pattern: '0 0,6,12,18 * * *' }, { name: 'meta-balance' })
  await syncQueue.upsertJobScheduler('google-balance-6h', { pattern: '0 0,6,12,18 * * *' }, { name: 'google-balance' })
  await syncQueue.upsertJobScheduler('google-metrics-6h', { pattern: '0 0,6,12,18 * * *' }, { name: 'google-metrics' })
  console.log('[SyncWorker] Jobs recorrentes registrados: meta-metrics, meta-balance, google-balance, google-metrics (todos 6h)')
}
