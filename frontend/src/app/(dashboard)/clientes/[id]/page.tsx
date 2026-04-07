'use client'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { CampanhaTable } from '@/components/dashboard/CampanhaTable'
import { AlertaBadge } from '@/components/dashboard/AlertaBadge'
import { useClienteDetalhe } from '@/lib/queries/metricas'
import { useMarcarLido } from '@/lib/queries/alertas'
import { Button } from '@/components/ui/button'

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { data: cliente, isLoading } = useClienteDetalhe(id)
  const marcarLido = useMarcarLido()

  if (isLoading) return <div className="text-ominy-muted text-sm">Carregando...</div>
  if (!cliente) return <div className="text-ominy-muted text-sm">Cliente nao encontrado.</div>

  const todasCampanhas = cliente.contas.flatMap((c: any) => c.campanhas)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{cliente.nome}</h1>
        <p className="text-ominy-muted text-sm mt-1">
          {cliente.targetCpl && `Meta CPL: R$ ${cliente.targetCpl}`}
          {cliente.targetCpl && cliente.targetRoas && ' · '}
          {cliente.targetRoas && `Meta ROAS: ${cliente.targetRoas}x`}
        </p>
      </div>

      {/* Alertas */}
      {cliente.alertas?.length > 0 && (
        <Card>
          <h2 className="font-heading text-sm text-ominy-muted uppercase tracking-widest mb-3">Alertas Ativos</h2>
          <div className="flex flex-col gap-2">
            {cliente.alertas.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-ominy-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <AlertaBadge tipo={a.tipo} />
                  <span className="text-sm text-ominy-text">{a.mensagem}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => marcarLido.mutate(a.id)}>
                  Dispensar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Contas */}
      {cliente.contas.map((conta: any) => (
        <Card key={conta.id}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm text-ominy-muted uppercase tracking-widest">{conta.accountName}</h2>
            {conta.ultimoSync && (
              <span className="text-xs text-ominy-muted">
                Sync: {new Date(conta.ultimoSync).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
          <CampanhaTable campanhas={conta.campanhas} />
        </Card>
      ))}
    </div>
  )
}
