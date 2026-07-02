import { z } from 'zod'

export const clienteCreateSchema = z.object({
  nome: z.string().min(1),
  targetCpl: z.number().positive().optional(),
  targetRoas: z.number().positive().optional(),
})

export const clienteUpdateSchema = clienteCreateSchema.partial()

export const contaCreateSchema = z.object({
  clienteId: z.string().min(1),
  accountId: z.string().min(1),
  accountName: z.string().min(1),
  accessToken: z.string().min(10).optional(),
  plataforma: z.enum(['META_ADS', 'GOOGLE_ADS']).default('META_ADS'),
}).refine(
  (data) => data.plataforma === 'GOOGLE_ADS' || (data.accessToken && data.accessToken.length >= 10),
  { message: 'Access token obrigatório para Meta Ads', path: ['accessToken'] }
)

export const contaUpdateSchema = z.object({
  accountName: z.string().min(1).optional(),
  accessToken: z.string().min(10).optional(),
  ativa: z.boolean().optional(),
})

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>
export type ContaCreateInput = z.infer<typeof contaCreateSchema>
export type ContaUpdateInput = z.infer<typeof contaUpdateSchema>
