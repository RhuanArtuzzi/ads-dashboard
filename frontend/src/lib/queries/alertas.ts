import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

export function useAlertas(clienteId?: string) {
  return useQuery({
    queryKey: ['alertas', clienteId],
    queryFn: () =>
      api.get('/alertas', { params: clienteId ? { clienteId } : {} }).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useMarcarLido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/alertas/${id}/lido`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alertas'] }),
  })
}
