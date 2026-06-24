import { Queue } from 'bullmq'
import { env } from './config.js'

const parsed = new URL(env.REDIS_URL)

// BullMQ exige conexao dedicada com maxRetriesPerRequest: null - nao reusa core/redis.ts
export const queueConnection = {
  host: parsed.hostname,
  port: parsed.port ? parseInt(parsed.port) : 6379,
  password: parsed.password || undefined,
  maxRetriesPerRequest: null,
}

export const syncQueue = new Queue('ads-sync', { connection: queueConnection })
