'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useContas, useClientes, useCriarConta, useAtualizarConta, useDeletarConta,
  useSyncManual, useGoogleConfig, useSalvarGoogleConfig, useDesconectarGoogle,
} from '@/lib/queries/clientes'
import { RefreshCw, Plus, Pencil, Trash2, X, Check, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

interface MetaForm {
  clienteId: string
  accountId: string
  accountName: string
  accessToken: string
}

const metaFormVazio: MetaForm = { clienteId: '', accountId: '', accountName: '', accessToken: '' }

export default function ConexoesPage() {
  const { data: contas } = useContas()
  const { data: clientes } = useClientes()
  const { data: googleConfig } = useGoogleConfig()
  const syncManual = useSyncManual()
  const criarMeta = useCriarConta()
  const atualizar = useAtualizarConta()
  const deletar = useDeletarConta()
  const salvarGoogle = useSalvarGoogleConfig()
  const desconectarGoogle = useDesconectarGoogle()

  const [novoMeta, setNovoMeta] = useState(false)
  const [metaForm, setMetaForm] = useState<MetaForm>(metaFormVazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editToken, setEditToken] = useState('')
  const [verToken, setVerToken] = useState<Record<string, boolean>>({})
  const [googleForm, setGoogleForm] = useState({ refreshToken: '', loginCustomerId: '' })
  const [editandoGoogle, setEditandoGoogle] = useState(false)

  const contasMeta = (contas ?? []).filter((c: any) => c.plataforma === 'META_ADS')
  const contasGoogle = (contas ?? []).filter((c: any) => c.plataforma === 'GOOGLE_ADS')

  function mascarar(token: string) {
    if (!token) return '—'
    return token.slice(0, 8) + '••••••••' + token.slice(-4)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ominy-text">Conexoes</h1>
        <Button variant="outline" onClick={() => syncManual.mutate()} disabled={syncManual.isPending}>
          <RefreshCw size={14} className={syncManual.isPending ? 'animate-spin' : ''} />
          {syncManual.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
        </Button>
      </div>

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

      {/* META ADS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-ominy-text">Meta Ads</h2>
            <p className="text-xs text-ominy-muted mt-0.5">Contas do Business Manager. Cada conta precisa de um Access Token de longa duracao.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setNovoMeta(!novoMeta)}>
            <Plus size={14} /> Nova conta
          </Button>
        </div>

        {novoMeta && (
          <Card glow>
            <h3 className="font-heading text-sm text-ominy-cyan uppercase tracking-widest mb-4">Adicionar conta Meta Ads</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ominy-muted uppercase tracking-widest">Cliente</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text text-sm focus:outline-none focus:border-ominy-cyan"
                    value={metaForm.clienteId}
                    onChange={(e) => setMetaForm({ ...metaForm, clienteId: e.target.value })}
                  >
                    <option value="">Selecione o cliente...</option>
                    {(clientes ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ominy-muted uppercase tracking-widest">Account ID</label>
                  <Input
                    placeholder="act_123456789"
                    value={metaForm.accountId}
                    onChange={(e) => setMetaForm({ ...metaForm, accountId: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">Nome da conta</label>
                <Input
                  placeholder="Ex: Cliente A — Meta"
                  value={metaForm.accountName}
                  onChange={(e) => setMetaForm({ ...metaForm, accountName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">Access Token</label>
                <Input
                  type="password"
                  placeholder="EAAxxxx... (token de longa duracao — validade 60 dias)"
                  value={metaForm.accessToken}
                  onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })}
                />
              </div>
              {criarMeta.isError && (
                <p className="text-xs text-red-400">Erro: {(criarMeta.error as any)?.response?.data?.error ?? 'Falha ao salvar'}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setNovoMeta(false); setMetaForm(metaFormVazio); criarMeta.reset() }}>
                  Cancelar
                </Button>
                <Button
                  disabled={!metaForm.clienteId || !metaForm.accountId || !metaForm.accountName || !metaForm.accessToken || criarMeta.isPending}
                  onClick={() => criarMeta.mutate(
                    { ...metaForm, plataforma: 'META_ADS' },
                    { onSuccess: () => { setNovoMeta(false); setMetaForm(metaFormVazio) } }
                  )}
                >
                  {criarMeta.isPending ? 'Salvando...' : 'Adicionar conta'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {contasMeta.length === 0 && !novoMeta && (
          <Card><p className="text-ominy-muted text-sm text-center py-4">Nenhuma conta Meta Ads cadastrada.</p></Card>
        )}

        {contasMeta.map((conta: any) => (
          <Card key={conta.id}>
            {editandoId === conta.id ? (
              <div className="flex flex-col gap-3">
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome da conta" />
                <Input type="password" value={editToken} onChange={(e) => setEditToken(e.target.value)} placeholder="Novo access token (deixe vazio para manter)" />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}><X size={12} /> Cancelar</Button>
                  <Button size="sm" disabled={atualizar.isPending} onClick={() => {
                    const data: any = { accountName: editNome }
                    if (editToken) data.accessToken = editToken
                    atualizar.mutate({ id: conta.id, ...data }, { onSuccess: () => setEditandoId(null) })
                  }}>
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
                  <p className="text-xs text-ominy-muted">Cliente: {conta.cliente?.nome} · ID: {conta.accountId}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-ominy-muted font-mono">
                      Token: {conta.accessToken
                        ? (verToken[conta.id] ? conta.accessToken : mascarar(conta.accessToken))
                        : <span className="text-red-400">Nao configurado</span>}
                    </p>
                    {conta.accessToken && (
                      <button onClick={() => setVerToken((v) => ({ ...v, [conta.id]: !v[conta.id] }))} className="text-ominy-muted hover:text-ominy-cyan">
                        {verToken[conta.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    )}
                  </div>
                  {conta.ultimoSync && (
                    <p className="text-xs text-ominy-muted">Ultimo sync: {new Date(conta.ultimoSync).toLocaleString('pt-BR')}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => { setEditandoId(conta.id); setEditNome(conta.accountName); setEditToken('') }}>
                    <Pencil size={12} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deletar.mutate(conta.id)} disabled={deletar.isPending}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </section>

      {/* GOOGLE ADS */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-ominy-text">Google Ads</h2>
          <p className="text-xs text-ominy-muted mt-0.5">
            Configure o acesso ao MCC (conta gerenciadora). As sub-contas sao descobertas automaticamente apos salvar e sincronizar.
          </p>
        </div>

        {/* Config card */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="font-body font-medium text-ominy-text">Credenciais OAuth</p>
                {googleConfig
                  ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Configurado</span>
                  : <span className="flex items-center gap-1 text-xs text-ominy-muted"><AlertCircle size={12} /> Nao configurado</span>}
              </div>
              {googleConfig && (
                <p className="text-xs text-ominy-muted font-mono">
                  MCC: {googleConfig.loginCustomerId} · Token: {googleConfig.refreshTokenPreview}
                </p>
              )}
              {googleConfig && (
                <p className="text-xs text-ominy-muted">Atualizado em: {new Date(googleConfig.updatedAt).toLocaleString('pt-BR')}</p>
              )}
            </div>
            <div className="flex gap-2">
              {googleConfig && (
                <Button size="sm" variant="danger" disabled={desconectarGoogle.isPending} onClick={() => {
                  if (confirm('Desconectar Google Ads? As sub-contas descobertas nao serao removidas.')) {
                    desconectarGoogle.mutate()
                  }
                }}>
                  Desconectar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                setEditandoGoogle(!editandoGoogle)
                setGoogleForm({ refreshToken: '', loginCustomerId: googleConfig?.loginCustomerId ?? '' })
              }}>
                <Pencil size={12} /> {googleConfig ? 'Editar' : 'Configurar'}
              </Button>
            </div>
          </div>

          {editandoGoogle && (
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-ominy-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">MCC Customer ID</label>
                <Input
                  placeholder="Ex: 8333093413"
                  value={googleForm.loginCustomerId}
                  onChange={(e) => setGoogleForm({ ...googleForm, loginCustomerId: e.target.value })}
                />
                <p className="text-xs text-ominy-muted">ID da conta gerenciadora (MCC) sem hifens</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ominy-muted uppercase tracking-widest">Refresh Token OAuth</label>
                <Input
                  type="password"
                  placeholder="1//0g... (obtenha via Google OAuth Playground)"
                  value={googleForm.refreshToken}
                  onChange={(e) => setGoogleForm({ ...googleForm, refreshToken: e.target.value })}
                />
                <p className="text-xs text-ominy-muted">
                  Gere em{' '}
                  <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-ominy-cyan hover:underline">
                    OAuth Playground
                  </a>
                  {' '}com o escopo <span className="font-mono">https://www.googleapis.com/auth/adwords</span>
                </p>
              </div>
              {salvarGoogle.isError && (
                <p className="text-xs text-red-400">Erro ao salvar. Verifique os campos e tente novamente.</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setEditandoGoogle(false); salvarGoogle.reset() }}>Cancelar</Button>
                <Button
                  size="sm"
                  disabled={!googleForm.refreshToken || !googleForm.loginCustomerId || salvarGoogle.isPending}
                  onClick={() => salvarGoogle.mutate(googleForm, { onSuccess: () => setEditandoGoogle(false) })}
                >
                  {salvarGoogle.isPending ? 'Salvando...' : 'Salvar e conectar'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Sub-contas descobertas */}
        {contasGoogle.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-ominy-muted uppercase tracking-widest">Sub-contas descobertas automaticamente</p>
            {contasGoogle.map((conta: any) => (
              <Card key={conta.id}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-medium text-ominy-text">{conta.accountName}</p>
                      <Badge variant={conta.ativa ? 'green' : 'gray'}>{conta.ativa ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                    <p className="text-xs text-ominy-muted">Cliente: {conta.cliente?.nome} · ID: {conta.accountId}</p>
                    {conta.ultimoSync && (
                      <p className="text-xs text-ominy-muted">Ultimo sync: {new Date(conta.ultimoSync).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                  <Button size="sm" variant="danger" onClick={() => deletar.mutate(conta.id)} disabled={deletar.isPending}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {contasGoogle.length === 0 && googleConfig && (
          <Card>
            <p className="text-ominy-muted text-sm text-center py-4">
              Nenhuma sub-conta descoberta ainda. Clique em "Sincronizar agora" para descobrir as contas do MCC.
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
