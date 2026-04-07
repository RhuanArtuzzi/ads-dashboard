'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClientes, useCriarCliente, useAtualizarCliente, useDeletarCliente } from '@/lib/queries/clientes'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'

interface ClienteForm {
  nome: string
  targetCpl: string
  targetRoas: string
}

const formVazio: ClienteForm = { nome: '', targetCpl: '', targetRoas: '' }

export default function ConfigClientesPage() {
  const { data: clientes } = useClientes()
  const criar = useCriarCliente()
  const atualizar = useAtualizarCliente()
  const deletar = useDeletarCliente()

  const [novoForm, setNovoForm] = useState<ClienteForm>(formVazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClienteForm>(formVazio)

  function parseForm(f: ClienteForm) {
    return {
      nome: f.nome,
      targetCpl: f.targetCpl ? parseFloat(f.targetCpl) : undefined,
      targetRoas: f.targetRoas ? parseFloat(f.targetRoas) : undefined,
    }
  }

  function iniciarEdicao(c: any) {
    setEditandoId(c.id)
    setEditForm({ nome: c.nome, targetCpl: c.targetCpl?.toString() ?? '', targetRoas: c.targetRoas?.toString() ?? '' })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Gerenciar Clientes</h1>

      {/* Formulario novo cliente */}
      <Card>
        <h2 className="font-heading text-sm text-ominy-muted uppercase tracking-widest mb-3">Novo Cliente</h2>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Nome do cliente"
            value={novoForm.nome}
            onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
            className="flex-1 min-w-40"
          />
          <Input
            placeholder="Meta CPL (R$)"
            type="number"
            value={novoForm.targetCpl}
            onChange={(e) => setNovoForm({ ...novoForm, targetCpl: e.target.value })}
            className="w-32"
          />
          <Input
            placeholder="Meta ROAS (x)"
            type="number"
            value={novoForm.targetRoas}
            onChange={(e) => setNovoForm({ ...novoForm, targetRoas: e.target.value })}
            className="w-32"
          />
          <Button
            onClick={() => {
              if (!novoForm.nome) return
              criar.mutate(parseForm(novoForm), { onSuccess: () => setNovoForm(formVazio) })
            }}
            disabled={!novoForm.nome || criar.isPending}
          >
            <Plus size={14} />
            Adicionar
          </Button>
        </div>
      </Card>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {(clientes ?? []).map((c: any) => (
          <Card key={c.id}>
            {editandoId === c.id ? (
              <div className="flex gap-2 flex-wrap">
                <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="flex-1 min-w-40" />
                <Input placeholder="Meta CPL" type="number" value={editForm.targetCpl} onChange={(e) => setEditForm({ ...editForm, targetCpl: e.target.value })} className="w-32" />
                <Input placeholder="Meta ROAS" type="number" value={editForm.targetRoas} onChange={(e) => setEditForm({ ...editForm, targetRoas: e.target.value })} className="w-32" />
                <Button size="sm" onClick={() => atualizar.mutate({ id: c.id, ...parseForm(editForm) }, { onSuccess: () => setEditandoId(null) })} disabled={atualizar.isPending}>
                  <Check size={12} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                  <X size={12} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body font-medium text-ominy-text">{c.nome}</p>
                  <p className="text-xs text-ominy-muted mt-0.5">
                    {c.targetCpl ? `CPL: R$${c.targetCpl}` : 'Sem meta CPL'}
                    {c.targetCpl && c.targetRoas ? ' · ' : ''}
                    {c.targetRoas ? `ROAS: ${c.targetRoas}x` : 'Sem meta ROAS'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => iniciarEdicao(c)}>
                    <Pencil size={12} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deletar.mutate(c.id)} disabled={deletar.isPending}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
