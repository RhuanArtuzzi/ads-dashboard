'use client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface Filtros {
  clienteId: string
  plataforma: string
  periodo: string
  dataInicio: string
  dataFim: string
}

interface FilterBarProps {
  filtros: Filtros
  clientes: Array<{ id: string; nome: string }>
  onChange: (filtros: Filtros) => void
}

const periodos = [
  { label: 'Hoje', value: 'hoje' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Personalizado', value: 'custom' },
]

const plataformas = [
  { label: 'Todos', value: '' },
  { label: 'Meta', value: 'META_ADS' },
  { label: 'Google', value: 'GOOGLE_ADS' },
]

export function FilterBar({ filtros, clientes, onChange }: FilterBarProps) {
  function set(partial: Partial<Filtros>) {
    onChange({ ...filtros, ...partial })
  }

  return (
    <Card>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
          <label className="text-xs text-ominy-muted uppercase tracking-widest">Cliente</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text text-sm focus:outline-none focus:border-ominy-cyan"
            value={filtros.clienteId}
            onChange={(e) => set({ clienteId: e.target.value })}
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ominy-muted uppercase tracking-widest">Plataforma</label>
          <div className="flex gap-1">
            {plataformas.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={filtros.plataforma === p.value ? 'primary' : 'outline'}
                onClick={() => set({ plataforma: p.value })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-ominy-muted uppercase tracking-widest">Período</label>
          <div className="flex gap-1">
            {periodos.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={filtros.periodo === p.value ? 'primary' : 'outline'}
                onClick={() => set({ periodo: p.value })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {filtros.periodo === 'custom' && (
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ominy-muted uppercase tracking-widest">De</label>
              <input
                type="date"
                className="px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text text-sm focus:outline-none focus:border-ominy-cyan"
                value={filtros.dataInicio}
                max={filtros.dataFim || undefined}
                onChange={(e) => set({ dataInicio: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ominy-muted uppercase tracking-widest">Até</label>
              <input
                type="date"
                className="px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text text-sm focus:outline-none focus:border-ominy-cyan"
                value={filtros.dataFim}
                min={filtros.dataInicio || undefined}
                onChange={(e) => set({ dataFim: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
