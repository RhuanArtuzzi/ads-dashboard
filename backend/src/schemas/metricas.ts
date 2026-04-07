import { z } from 'zod'

export const periodoSchema = z.object({
  periodo: z.enum(['hoje', '7d', '30d']).default('30d'),
})

export type PeriodoQuery = z.infer<typeof periodoSchema>
