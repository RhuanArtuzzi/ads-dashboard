import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/clientes').then((r) => r.data),
  })
}

export function useContasConfig() {
  return useQuery({
    queryKey: ['contas-config'],
    queryFn: () => api.get('/clientes/config/contas').then((r) => r.data),
  })
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/sync/status').then((r) => r.data),
    refetchInterval: 30000,
  })
}

export function useCriarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nome: string; targetCpl?: number; targetRoas?: number }) =>
      api.post('/clientes', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useAtualizarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nome?: string; targetCpl?: number; targetRoas?: number }) =>
      api.put(`/clientes/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useDeletarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clientes/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useSyncManual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/sync/manual').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overview'] })
      qc.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })
}
