'use client'
import { useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { GastoChart } from '@/components/dashboard/GastoChart'
import { ResumoAgente } from '@/components/ia/ResumoAgente'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOverview, useGrafico } from '@/lib/queries/metricas'

const periodos = [
  { label: 'Hoje', value: 'hoje' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
]

export default function HomePage() {
  const [periodo, setPeriodo] = useState('30d')
  const { data: overview, isLoading } = useOverview(periodo)
  const { data: grafico } = useGrafico(periodo)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ominy-text">Visao Geral</h1>
        <div className="flex gap-2">
          {periodos.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={periodo === p.value ? 'primary' : 'outline'}
              onClick={() => setPeriodo(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-ominy-border" />
          ))
        ) : (
          <>
            <MetricCard
              label="Gasto Total"
              value={overview?.gastoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
              prefixo="R$ "
              destaque
            />
            <MetricCard label="Conversoes" value={overview?.conversoesTotal ?? '—'} />
            <MetricCard
              label="CPL Medio"
              value={overview?.cplMedio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
              prefixo="R$ "
            />
            <MetricCard
              label="CTR Medio"
              value={overview?.ctrMedio?.toFixed(2) ?? '—'}
              sufixo="%"
            />
          </>
        )}
      </div>

      {/* Chart */}
      <Card>
        <h2 className="font-heading text-sm text-ominy-muted uppercase tracking-widest mb-4">
          Gasto Diario
        </h2>
        {grafico && grafico.length > 0 ? (
          <GastoChart data={grafico} />
        ) : (
          <div className="h-[220px] flex items-center justify-center text-ominy-muted text-sm">
            Sem dados para o periodo selecionado
          </div>
        )}
      </Card>

      {/* Resumo IA */}
      <ResumoAgente />
    </div>
  )
}
