'use client'
import { Card } from '@/components/ui/card'
import { CampanhaTable } from '@/components/dashboard/CampanhaTable'
import { useClientesResumo } from '@/lib/queries/metricas'
import { useClienteDetalhe } from '@/lib/queries/metricas'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

function ClienteCampanhas({ clienteId }: { clienteId: string }) {
  const { data: cliente } = useClienteDetalhe(clienteId)
  if (!cliente) return null
  return (
    <>
      {cliente.contas.map((conta: any) => (
        <Card key={conta.id}>
          <h3 className="font-heading text-sm text-ominy-muted uppercase tracking-widest mb-3">{conta.accountName}</h3>
          <CampanhaTable campanhas={conta.campanhas} />
        </Card>
      ))}
    </>
  )
}

export default function MetaPage() {
  const { data: clientes } = useClientesResumo()
  const [selecionado, setSelecionado] = useState<string | null>(null)

  const clienteAtivo = selecionado ?? clientes?.[0]?.id ?? null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Meta Ads</h1>

      {/* Seletor de cliente */}
      <div className="flex gap-2 flex-wrap">
        {(clientes ?? []).map((c: any) => (
          <Button
            key={c.id}
            size="sm"
            variant={clienteAtivo === c.id ? 'primary' : 'outline'}
            onClick={() => setSelecionado(c.id)}
          >
            {c.nome}
          </Button>
        ))}
      </div>

      {clienteAtivo && <ClienteCampanhas clienteId={clienteAtivo} />}
    </div>
  )
}
