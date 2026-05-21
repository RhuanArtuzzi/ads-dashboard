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

async function fetchBalances(): Promise<Balance[]> {
  const { data } = await api.get<{ data: Balance[] }>('/balances')
  return data.data
}

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: fetchBalances,
    staleTime: 1000 * 60 * 10,
  })
}
