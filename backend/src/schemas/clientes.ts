import { z } from 'zod'

export const clienteCreateSchema = z.object({
  nome: z.string().min(1),
  targetCpl: z.number().positive().optional(),
  targetRoas: z.number().positive().optional(),
})

export const clienteUpdateSchema = clienteCreateSchema.partial()

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
