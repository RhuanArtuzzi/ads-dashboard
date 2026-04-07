'use client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertaBadge } from '@/components/dashboard/AlertaBadge'
import { useAlertas, useMarcarLido } from '@/lib/queries/alertas'

export default function AlertasPage() {
  const { data: alertas, isLoading } = useAlertas()
  const marcarLido = useMarcarLido()

  if (isLoading) return <div className="text-ominy-muted text-sm">Carregando...</div>

  const lista = alertas ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Alertas</h1>
        <span className="text-sm text-ominy-muted">{lista.length} alerta{lista.length !== 1 ? 's' : ''} ativo{lista.length !== 1 ? 's' : ''}</span>
      </div>

      {lista.length === 0 && (
        <Card>
          <p className="text-ominy-muted text-sm text-center py-6">Nenhum alerta ativo.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {lista.map((a: any) => (
          <Card key={a.id} className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertaBadge tipo={a.tipo} />
                <span className="text-xs text-ominy-muted">{a.cliente?.nome}</span>
              </div>
              <p className="text-sm text-ominy-text">{a.mensagem}</p>
              <p className="text-xs text-ominy-muted">
                {new Date(a.criadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => marcarLido.mutate(a.id)}
              disabled={marcarLido.isPending}
            >
              Dispensar
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
