import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

export function useOverview(periodo = '30d') {
  return useQuery({
    queryKey: ['overview', periodo],
    queryFn: () => api.get(`/metricas/overview?periodo=${periodo}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGrafico(periodo = '30d') {
  return useQuery({
    queryKey: ['grafico', periodo],
    queryFn: () => api.get(`/metricas/grafico?periodo=${periodo}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientesResumo() {
  return useQuery({
    queryKey: ['clientes-resumo'],
    queryFn: () => api.get('/metricas/clientes').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useClienteDetalhe(id: string) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: () => api.get(`/metricas/clientes/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCampanhaDetalhe(id: string) {
  return useQuery({
    queryKey: ['campanha', id],
    queryFn: () => api.get(`/metricas/campanhas/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
