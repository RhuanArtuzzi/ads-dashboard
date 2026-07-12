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
    mutationFn: (data: { clienteId: string; accountId: string; accountName: string; accessToken?: string; plataforma?: string }) =>
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

export function useMetaConnections() {
  return useQuery({
    queryKey: ['meta-connections'],
    queryFn: () => api.get('/auth/meta/connections').then((r) => r.data),
  })
}

export function useDesconectarMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clienteId: string) => api.delete(`/auth/meta/connections/${clienteId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-connections'] })
      qc.invalidateQueries({ queryKey: ['contas'] })
    },
  })
}

export function useGoogleConfig() {
  return useQuery({
    queryKey: ['google-config'],
    queryFn: () => api.get('/config/google').then((r) => r.data),
  })
}

export function useSalvarGoogleConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { refreshToken: string; loginCustomerId: string }) =>
      api.put('/config/google', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-config'] }),
  })
}

export function useDesconectarGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/config/google').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-config'] }),
  })
}

export function useUsuariosCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['usuarios-cliente', clienteId],
    queryFn: () => api.get(`/clientes/usuarios?clienteId=${clienteId}`).then((r) => r.data),
    enabled: !!clienteId,
  })
}

export function useCriarUsuarioCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { clienteId: string; nome: string; email: string; senha: string; role?: 'CLIENTE' | 'CLIENTE_ADMIN' }) =>
      api.post('/clientes/usuarios', data).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['usuarios-cliente', vars.clienteId] }),
  })
}

export function useMyMetaConnection() {
  return useQuery({
    queryKey: ['my-meta-connection'],
    queryFn: () => api.get('/auth/meta/my-connection').then((r) => r.data),
  })
}

export function useDesconectarMyMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/auth/meta/my-connection').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-meta-connection'] })
      qc.invalidateQueries({ queryKey: ['contas'] })
    },
  })
}

export function useMetaOAuthUrl(clienteId?: string) {
  return useQuery({
    queryKey: ['meta-oauth-url', clienteId],
    queryFn: () => {
      const params = clienteId ? `?clienteId=${clienteId}` : ''
      return api.get(`/auth/meta/url${params}`).then((r) => r.data as { url: string })
    },
    enabled: false,
  })
}

export function useDeletarUsuarioCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, clienteId }: { id: string; clienteId: string }) =>
      api.delete(`/clientes/usuarios/${id}`).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['usuarios-cliente', vars.clienteId] }),
  })
}

export function useAtualizarUsuarioCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role, clienteId }: { id: string; role: 'CLIENTE' | 'CLIENTE_ADMIN'; clienteId: string }) =>
      api.put(`/clientes/usuarios/${id}`, { role }).then((r) => r.data),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['usuarios-cliente', vars.clienteId] }),
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

export function useSyncManualCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/sync/manual/minha-conta').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overview'] })
      qc.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })
}
