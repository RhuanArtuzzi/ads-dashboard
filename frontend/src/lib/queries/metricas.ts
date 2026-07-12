import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { Filtros } from '@/components/dashboard/FilterBar'

function buildParams(filtros: Partial<Filtros>): string {
  const p = new URLSearchParams()
  if (filtros.periodo && filtros.periodo !== 'custom') p.set('periodo', filtros.periodo)
  if (filtros.clienteId) p.set('clienteId', filtros.clienteId)
  if (filtros.plataforma) p.set('plataforma', filtros.plataforma)
  if (filtros.contaId) p.set('contaId', filtros.contaId)
  if (filtros.periodo === 'custom' && filtros.dataInicio) p.set('dataInicio', filtros.dataInicio)
  if (filtros.periodo === 'custom' && filtros.dataFim) p.set('dataFim', filtros.dataFim)
  return p.toString()
}

export function useOverview(filtros: Partial<Filtros> = {}) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ['overview', filtros],
    queryFn: () => api.get(`/metricas/overview?${params}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGrafico(filtros: Partial<Filtros> = {}) {
  const params = buildParams(filtros)
  return useQuery({
    queryKey: ['grafico', filtros],
    queryFn: () => api.get(`/metricas/grafico?${params}`).then((r) => r.data),
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
