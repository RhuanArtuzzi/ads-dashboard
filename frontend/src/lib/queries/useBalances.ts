import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

interface Balance {
  id: number
  platform: string
  accountId: string
  accountName: string | null
  balance: number
  currency: string
  updatedAt: string
}

interface BalanceFiltros {
  clienteId?: string
  plataforma?: string
}

async function fetchBalances(filtros: BalanceFiltros): Promise<Balance[]> {
  const p = new URLSearchParams()
  if (filtros.clienteId) p.set('clienteId', filtros.clienteId)
  if (filtros.plataforma) p.set('plataforma', filtros.plataforma)
  const { data } = await api.get<{ data: Balance[] }>(`/balances?${p.toString()}`)
  return data.data
}

export function useBalances(filtros: BalanceFiltros = {}) {
  return useQuery({
    queryKey: ['balances', filtros],
    queryFn: () => fetchBalances(filtros),
    staleTime: 1000 * 60 * 10,
  })
}
