'use client'
import { Card } from '@/components/ui/card'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  variacao?: number | null
  prefixo?: string
  sufixo?: string
  destaque?: boolean
}

export function MetricCard({ label, value, variacao, prefixo = '', sufixo = '', destaque }: MetricCardProps) {
  const positivo = variacao !== null && variacao !== undefined && variacao >= 0

  return (
    <Card glow={destaque} className="flex flex-col gap-2">
      <span className="text-xs font-body text-ominy-muted uppercase tracking-widest">{label}</span>
      <span className={clsx('text-2xl font-heading font-bold', destaque ? 'text-ominy-cyan' : 'text-ominy-text')}>
        {prefixo}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{sufixo}
      </span>
      {variacao !== null && variacao !== undefined && (
        <span className={clsx('flex items-center gap-1 text-xs font-body', positivo ? 'text-green-400' : 'text-red-400')}>
          {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(variacao).toFixed(1)}% vs período anterior
        </span>
      )}
    </Card>
  )
}
