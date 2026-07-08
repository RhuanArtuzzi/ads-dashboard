'use client'
import { useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { GastoChart } from '@/components/dashboard/GastoChart'
import { AccountBalanceCard } from '@/components/dashboard/AccountBalanceCard'
import { ResumoAgente } from '@/components/ia/ResumoAgente'
import { FilterBar, type Filtros } from '@/components/dashboard/FilterBar'
import { Card } from '@/components/ui/card'
import { useOverview, useGrafico } from '@/lib/queries/metricas'
import { useBalances } from '@/lib/queries/useBalances'
import { useClientes } from '@/lib/queries/clientes'
import { api } from '@/lib/api'

const hoje = new Date().toISOString().split('T')[0]

const filtrosIniciais: Filtros = {
  clienteId: '',
  plataforma: '',
  periodo: '30d',
  dataInicio: hoje,
  dataFim: hoje,
}

function resolverDatasRelatorio(filtros: Filtros): { dataInicio: string; dataFim: string } {
  const hoje = new Date().toISOString().split('T')[0]
  if (filtros.periodo === 'custom') return { dataInicio: filtros.dataInicio, dataFim: filtros.dataFim }
  const dias = filtros.periodo === 'hoje' ? 0 : filtros.periodo === '7d' ? 7 : 30
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)
  return { dataInicio: inicio.toISOString().split('T')[0], dataFim: hoje }
}

export default function HomePage() {
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais)
  const [gerandoPDF, setGerandoPDF] = useState(false)

  async function handleGerarRelatorio() {
    if (!filtros.clienteId) return
    setGerandoPDF(true)
    try {
      const { dataInicio, dataFim } = resolverDatasRelatorio(filtros)
      const response = await api.post(
        '/relatorios/gerar',
        { clienteId: filtros.clienteId, dataInicio, dataFim },
        { responseType: 'blob' }
      )
      const disposition = response.headers['content-disposition'] ?? ''
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'relatorio.pdf'
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Erro ao gerar relatório', e)
    } finally {
      setGerandoPDF(false)
    }
  }

  const { data: clientes } = useClientes()
  const { data: overview, isLoading } = useOverview(filtros)
  const { data: grafico } = useGrafico(filtros)
  const { data: balances, isLoading: balancesLoading, isError: balancesError } = useBalances({
    clienteId: filtros.clienteId || undefined,
    plataforma: filtros.plataforma || undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ominy-text">Visao Geral</h1>
        {filtros.clienteId && (
          <button
            onClick={handleGerarRelatorio}
            disabled={gerandoPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ominy-cyan text-ominy-cyan font-body text-sm font-medium hover:bg-ominy-cyan hover:text-ominy-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gerandoPDF ? 'Gerando PDF...' : 'Gerar Relatorio PDF'}
          </button>
        )}
      </div>

      {/* Filtros */}
      <FilterBar
        filtros={filtros}
        clientes={clientes ?? []}
        onChange={setFiltros}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
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
              label="Valor Conversao"
              value={overview?.valorConversaoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
              prefixo="R$ "
            />
            <MetricCard
              label="ROAS Medio"
              value={overview?.roasMedio?.toFixed(2) ?? '—'}
              sufixo="x"
            />
            <MetricCard
              label="CPL Medio"
              value={overview?.cplMedio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
              prefixo="R$ "
            />
            <MetricCard
              label="CPC Medio"
              value={overview?.cpcMedio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '—'}
              prefixo="R$ "
            />
            <MetricCard
              label="CTR Medio"
              value={overview?.ctrMedio?.toFixed(2) ?? '—'}
              sufixo="%"
            />
            <MetricCard
              label="Alcance Total"
              value={overview?.alcanceTotal?.toLocaleString('pt-BR') ?? '—'}
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

      {/* Saldos */}
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-sm text-ominy-cyan uppercase tracking-widest">
          Saldos das Contas
        </h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-[120px] animate-pulse bg-ominy-border" />
            ))}
          </div>
        ) : balancesError ? (
          <p className="text-sm font-body text-ominy-muted">
            Nao foi possivel carregar os saldos.
          </p>
        ) : !balances || balances.length === 0 ? (
          <p className="text-sm font-body text-ominy-muted">
            Nenhuma conta sincronizada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((b) => (
              <AccountBalanceCard
                key={b.id}
                platform={b.platform}
                accountName={b.accountName}
                accountId={b.accountId}
                balance={b.balance}
                currency={b.currency}
                updatedAt={b.updatedAt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resumo IA */}
      <ResumoAgente />
    </div>
  )
}
