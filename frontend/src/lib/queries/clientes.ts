import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/clientes').then((r) => r.data),
  })
}

export function useContas() {
  return useQuery({
    queryKey: ['contas'],
    queryFn: () => api.get('/clientes/contas').then((r) => r.data),
  })
}

export function useContasConfig() {
  return useQuery({
    queryKey: ['contas-config'],
    queryFn: () => api.get('/clientes/config/contas').then((r) => r.data),
  })
}

export function useCriarConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { clienteId: string; accountId: string; accountName: string; accessToken: string }) =>
      api.post('/clientes/contas', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas'] })
      qc.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })
}

export function useAtualizarConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; accountName?: string; accessToken?: string; ativa?: boolean }) =>
      api.put(`/clientes/contas/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas'] }),
  })
}

export function useDeletarConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clientes/contas/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contas'] }),
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
