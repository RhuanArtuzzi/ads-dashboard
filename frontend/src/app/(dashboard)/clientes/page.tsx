'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertaBadge } from '@/components/dashboard/AlertaBadge'
import { useClientesResumo } from '@/lib/queries/metricas'
import { useAlertas } from '@/lib/queries/alertas'
import { ChevronRight } from 'lucide-react'

export default function ClientesPage() {
  const { data: clientes, isLoading } = useClientesResumo()
  const { data: alertas } = useAlertas()

  const alertasPorCliente = (clienteId: string) =>
    (alertas ?? []).filter((a: any) => a.clienteId === clienteId)

  if (isLoading) return <div className="text-ominy-muted text-sm">Carregando...</div>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Clientes</h1>

      <div className="flex flex-col gap-3">
        {(clientes ?? []).map((c: any) => {
          const alertasCliente = alertasPorCliente(c.id)
          return (
            <Link key={c.id} href={`/clientes/${c.id}`}>
              <Card className="flex items-center justify-between hover:border-ominy-cyan/40 transition-colors cursor-pointer">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-base font-medium text-ominy-text">{c.nome}</span>
                    {alertasCliente.length > 0 && (
                      <Badge variant="red">{alertasCliente.length} alerta{alertasCliente.length > 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-ominy-muted">
                    <span>Gasto hoje: <span className="text-ominy-cyan">R$ {c.gastoHoje?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                    <span>Conversoes: <span className="text-ominy-text">{c.conversoesHoje}</span></span>
                    {c.cplHoje && <span>CPL: <span className="text-ominy-text">R$ {c.cplHoje?.toFixed(2)}</span></span>}
                  </div>
                  {alertasCliente.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {alertasCliente.slice(0, 3).map((a: any) => (
                        <AlertaBadge key={a.id} tipo={a.tipo} />
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-ominy-muted flex-shrink-0" />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
