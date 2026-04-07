'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useContas, useClientes, useCriarConta, useAtualizarConta, useDeletarConta, useSyncManual, useSyncStatus } from '@/lib/queries/clientes'
import { RefreshCw, Plus, Pencil, Trash2, X, Check, Eye, EyeOff } from 'lucide-react'

interface ContaForm {
  clienteId: string
  accountId: string
  accountName: string
  accessToken: string
}

const formVazio: ContaForm = { clienteId: '', accountId: '', accountName: '', accessToken: '' }

export default function ConexoesPage() {
  const { data: contas } = useContas()
  const { data: clientes } = useClientes()
  const { data: syncStatus } = useSyncStatus()
  const syncManual = useSyncManual()
  const criar = useCriarConta()
  const atualizar = useAtualizarConta()
  const deletar = useDeletarConta()

  const [novoForm, setNovoForm] = useState<ContaForm>(formVazio)
  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editToken, setEditToken] = useState('')
  const [editNome, setEditNome] = useState('')
  const [verTokens, setVerTokens] = useState<Record<string, boolean>>({})

  function toggleVerToken(id: string) {
    setVerTokens((v) => ({ ...v, [id]: !v[id] }))
  }

  function mascarar(token: string) {
    if (!token) return '—'
    return token.slice(0, 8) + '••••••••' + token.slice(-4)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Contas Meta Ads</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMostrarNovo(!mostrarNovo)}>
            <Plus size={14} />
            Nova conta
          </Button>
          <Button variant="outline" onClick={() => syncManual.mutate()} disabled={syncManual.isPending}>
            <RefreshCw size={14} className={syncManual.isPending ? 'animate-spin' : ''} />
            {syncManual.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
          </Button>
        </div>
      </div>

      {/* Resultado do sync */}
      {syncManual.data && (
        <Card>
          <p className="text-sm text-ominy-text">
            Sync concluido: {syncManual.data.sucesso} conta{syncManual.data.sucesso !== 1 ? 's' : ''} ok
            {syncManual.data.erro > 0 && `, ${syncManual.data.erro} com erro`}
          </p>
          {syncManual.data.erros?.length > 0 && (
            <ul className="mt-2 text-xs text-red-400 list-disc list-inside">
              {syncManual.data.erros.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </Card>
      )}

      {/* Formulário nova conta */}
      {mostrarNovo && (
        <Card glow>
          <h2 className="font-heading text-sm text-ominy-cyan uppercase tracking-widest mb-4">Nova Conta</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ominy-muted uppercase tracking-widest">Cliente</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text text-sm focus:outline-none focus:border-ominy-cyan"
                value={novoForm.clienteId}
                onChange={(e) => setNovoForm({ ...novoForm, clienteId: e.target.value })}
              >
                <option value="">Selecione o cliente...</option>
                {(clientes ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">Account ID</label>
                <Input
                  placeholder="act_123456789"
                  value={novoForm.accountId}
                  onChange={(e) => setNovoForm({ ...novoForm, accountId: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">Nome da Conta</label>
                <Input
                  placeholder="Ex: Cliente A — Meta"
                  value={novoForm.accountName}
                  onChange={(e) => setNovoForm({ ...novoForm, accountName: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ominy-muted uppercase tracking-widest">Access Token</label>
              <Input
                type="password"
                placeholder="EAAxxxx... (token de longa duração)"
                value={novoForm.accessToken}
                onChange={(e) => setNovoForm({ ...novoForm, accessToken: e.target.value })}
              />
              <p className="text-xs text-ominy-muted">Token de longa duração do Meta Business Manager (validade 60 dias)</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setMostrarNovo(false); setNovoForm(formVazio) }}>
                Cancelar
              </Button>
              <Button
                onClick={() => criar.mutate(novoForm, { onSuccess: () => { setMostrarNovo(false); setNovoForm(formVazio) } })}
                disabled={!novoForm.clienteId || !novoForm.accountId || !novoForm.accountName || !novoForm.accessToken || criar.isPending}
              >
                {criar.isPending ? 'Salvando...' : 'Adicionar conta'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de contas */}
      <div className="flex flex-col gap-3">
        {(contas ?? []).length === 0 && (
          <Card>
            <p className="text-ominy-muted text-sm text-center py-6">Nenhuma conta cadastrada. Clique em "Nova conta" para adicionar.</p>
          </Card>
        )}
        {(contas ?? []).map((conta: any) => {
          const syncInfo = (syncStatus ?? []).find((s: any) => s.id === conta.id)
          const editando = editandoId === conta.id
          return (
            <Card key={conta.id}>
              {editando ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <Input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Nome da conta"
                      className="flex-1"
                    />
                  </div>
                  <Input
                    type="password"
                    value={editToken}
                    onChange={(e) => setEditToken(e.target.value)}
                    placeholder="Novo access token (deixe vazio para manter)"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                      <X size={12} /> Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const data: any = { accountName: editNome }
                        if (editToken) data.accessToken = editToken
                        atualizar.mutate({ id: conta.id, ...data }, { onSuccess: () => setEditandoId(null) })
                      }}
                      disabled={atualizar.isPending}
                    >
                      <Check size={12} /> Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-medium text-ominy-text">{conta.accountName}</p>
                      <Badge variant={conta.ativa ? 'green' : 'gray'}>{conta.ativa ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                    <p className="text-xs text-ominy-muted">
                      Cliente: {conta.cliente?.nome} · ID: {conta.accountId}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-ominy-muted font-mono">
                        Token: {conta.accessToken
                          ? (verTokens[conta.id] ? conta.accessToken : mascarar(conta.accessToken))
                          : <span className="text-red-400">Nao configurado</span>}
                      </p>
                      {conta.accessToken && (
                        <button onClick={() => toggleVerToken(conta.id)} className="text-ominy-muted hover:text-ominy-cyan">
                          {verTokens[conta.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                    {syncInfo?.ultimoSync && (
                      <p className="text-xs text-ominy-muted">
                        Ultimo sync: {new Date(syncInfo.ultimoSync).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditandoId(conta.id)
                      setEditNome(conta.accountName)
                      setEditToken('')
                    }}>
                      <Pencil size={12} />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deletar.mutate(conta.id)} disabled={deletar.isPending}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
