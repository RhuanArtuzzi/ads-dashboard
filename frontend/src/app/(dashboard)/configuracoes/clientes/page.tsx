'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useClientes, useCriarCliente, useAtualizarCliente, useDeletarCliente,
  useUsuariosCliente, useCriarUsuarioCliente, useDeletarUsuarioCliente, useAtualizarUsuarioCliente,
} from '@/lib/queries/clientes'
import { Pencil, Trash2, Plus, X, Check, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'

interface ClienteForm {
  nome: string
  targetCpl: string
  targetRoas: string
}

interface UsuarioForm {
  nome: string
  email: string
  senha: string
  role: 'CLIENTE' | 'CLIENTE_ADMIN'
}

const formVazio: ClienteForm = { nome: '', targetCpl: '', targetRoas: '' }
const usuarioFormVazio: UsuarioForm = { nome: '', email: '', senha: '', role: 'CLIENTE' }

function UsuariosCliente({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const [aberto, setAberto] = useState(false)
  const [novoForm, setNovoForm] = useState<UsuarioForm>(usuarioFormVazio)
  const [criando, setCriando] = useState(false)
  const [editandoUserId, setEditandoUserId] = useState<string | null>(null)
  const { data: usuarios } = useUsuariosCliente(aberto ? clienteId : null)
  const criar = useCriarUsuarioCliente()
  const deletar = useDeletarUsuarioCliente()
  const atualizar = useAtualizarUsuarioCliente()

  return (
    <div className="border-t border-ominy-border mt-3 pt-3">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 text-xs text-ominy-muted hover:text-ominy-text transition-colors"
      >
        {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Acessos de clientes
        {usuarios && usuarios.length > 0 && (
          <span className="bg-ominy-cyan/20 text-ominy-cyan px-1.5 py-0.5 rounded text-xs">{usuarios.length}</span>
        )}
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-2">
          {(usuarios ?? []).map((u: any) => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-ominy-bg">
              {editandoUserId === u.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => atualizar.mutate({ id: u.id, role: 'CLIENTE', clienteId }, { onSuccess: () => setEditandoUserId(null) })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${u.role === 'CLIENTE' ? 'border-ominy-cyan bg-ominy-cyan/10 text-ominy-cyan' : 'border-ominy-border text-ominy-muted hover:text-ominy-text'}`}
                    disabled={atualizar.isPending}
                  >
                    Viewer
                  </button>
                  <button
                    onClick={() => atualizar.mutate({ id: u.id, role: 'CLIENTE_ADMIN', clienteId }, { onSuccess: () => setEditandoUserId(null) })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${u.role === 'CLIENTE_ADMIN' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-ominy-border text-ominy-muted hover:text-ominy-text'}`}
                    disabled={atualizar.isPending}
                  >
                    Admin
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => setEditandoUserId(null)}>
                    <X size={11} />
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ominy-text">{u.nome}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === 'CLIENTE_ADMIN' ? 'bg-ominy-purple/20 text-purple-400' : 'bg-ominy-border text-ominy-muted'}`}>
                      {u.role === 'CLIENTE_ADMIN' ? 'Admin' : 'Viewer'}
                    </span>
                  </div>
                  <p className="text-xs text-ominy-muted">{u.email}</p>
                </div>
              )}
              {editandoUserId !== u.id && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditandoUserId(u.id)}>
                    <Pencil size={11} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deletar.isPending}
                    onClick={() => deletar.mutate({ id: u.id, clienteId })}
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {criando ? (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-ominy-border bg-ominy-bg">
              <Input
                placeholder="Nome do usuário"
                value={novoForm.nome}
                onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Email de acesso"
                value={novoForm.email}
                onChange={(e) => setNovoForm({ ...novoForm, email: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Senha (mín. 6 caracteres)"
                value={novoForm.senha}
                onChange={(e) => setNovoForm({ ...novoForm, senha: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNovoForm({ ...novoForm, role: 'CLIENTE' })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${novoForm.role === 'CLIENTE' ? 'border-ominy-cyan bg-ominy-cyan/10 text-ominy-cyan' : 'border-ominy-border text-ominy-muted hover:text-ominy-text'}`}
                >
                  Viewer — so visualiza
                </button>
                <button
                  onClick={() => setNovoForm({ ...novoForm, role: 'CLIENTE_ADMIN' })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${novoForm.role === 'CLIENTE_ADMIN' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-ominy-border text-ominy-muted hover:text-ominy-text'}`}
                >
                  Admin — acessa configuracoes
                </button>
              </div>
              {criar.isError && (
                <p className="text-xs text-red-400">
                  {(criar.error as any)?.response?.data?.error ?? 'Erro ao criar usuário'}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setCriando(false); criar.reset(); setNovoForm(usuarioFormVazio) }}>
                  <X size={12} /> Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!novoForm.nome || !novoForm.email || novoForm.senha.length < 6 || criar.isPending}
                  onClick={() => criar.mutate(
                    { clienteId, ...novoForm },
                    { onSuccess: () => { setCriando(false); setNovoForm(usuarioFormVazio) } }
                  )}
                >
                  <Check size={12} /> {criar.isPending ? 'Criando...' : 'Criar acesso'}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCriando(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-ominy-border text-xs text-ominy-muted hover:text-ominy-cyan hover:border-ominy-cyan transition-colors"
            >
              <UserPlus size={12} /> Adicionar acesso para {clienteNome}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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

            <UsuariosCliente clienteId={c.id} clienteNome={c.nome} />
          </Card>
        ))}
      </div>
    </div>
  )
}
