import { Badge } from '@/components/ui/badge'

interface Campanha {
  id: string
  nome: string
  status: string
  orcamentoDiario?: number | null
  snapshots: Array<{
    gasto: number
    conversoes: number
    cpl?: number | null
    roas?: number | null
    ctr?: number | null
  }>
}

const statusConfig: Record<string, { label: string; variant: 'green' | 'yellow' | 'gray' | 'red' }> = {
  ATIVA:      { label: 'Ativa',      variant: 'green' },
  PAUSADA:    { label: 'Pausada',    variant: 'yellow' },
  REMOVIDA:   { label: 'Removida',  variant: 'gray' },
  EM_REVISAO: { label: 'Em Revisao', variant: 'cyan' as any },
}

export function CampanhaTable({ campanhas }: { campanhas: Campanha[] }) {
  if (campanhas.length === 0) {
    return <p className="text-ominy-muted text-sm py-4">Nenhuma campanha encontrada.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="border-b border-ominy-border text-ominy-muted uppercase text-xs tracking-widest">
            <th className="text-left py-3 pr-4">Campanha</th>
            <th className="text-left py-3 pr-4">Status</th>
            <th className="text-right py-3 pr-4">Gasto</th>
            <th className="text-right py-3 pr-4">Conversoes</th>
            <th className="text-right py-3 pr-4">CPL</th>
            <th className="text-right py-3">CTR</th>
          </tr>
        </thead>
        <tbody>
          {campanhas.map((c) => {
            const snap = c.snapshots[0]
            const sc = statusConfig[c.status] ?? { label: c.status, variant: 'gray' as const }
            return (
              <tr key={c.id} className="border-b border-ominy-border/50 hover:bg-ominy-surface/50 transition-colors">
                <td className="py-3 pr-4 text-ominy-text">{c.nome}</td>
                <td className="py-3 pr-4">
                  <Badge variant={sc.variant as any}>{sc.label}</Badge>
                </td>
                <td className="py-3 pr-4 text-right text-ominy-cyan">
                  {snap ? `R$ ${snap.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="py-3 pr-4 text-right">{snap?.conversoes ?? '—'}</td>
                <td className="py-3 pr-4 text-right">
                  {snap?.cpl ? `R$ ${snap.cpl.toFixed(2)}` : '—'}
                </td>
                <td className="py-3 text-right">
                  {snap?.ctr ? `${snap.ctr.toFixed(2)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
