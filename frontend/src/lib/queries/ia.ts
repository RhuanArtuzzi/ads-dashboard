import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

export function useResumoHoje() {
  return useQuery({
    queryKey: ['resumo-hoje'],
    queryFn: () => api.get('/ia/resumo').then((r) => r.data).catch(() => null),
    staleTime: 1000 * 60 * 30,
  })
}

export function useHistoricoIA() {
  return useQuery({
    queryKey: ['historico-ia'],
    queryFn: () => api.get('/ia/historico').then((r) => r.data),
  })
}

export function useGerarResumo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/ia/gerar').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumo-hoje'] })
      qc.invalidateQueries({ queryKey: ['historico-ia'] })
    },
  })
}
