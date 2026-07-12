'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMyMetaConnection, useDesconectarMyMeta, useSyncManualCliente } from '@/lib/queries/clientes'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, AlertTriangle, Link2, Unlink, RefreshCw } from 'lucide-react'

function diasParaExpirar(date: string | null | undefined): number | null {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function MinhaContaContent() {
  const searchParams = useSearchParams()
  const [flash, setFlash] = useState<{ type: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [conectando, setConectando] = useState(false)

  const { data: conn, isLoading, refetch } = useMyMetaConnection()
  const desconectar = useDesconectarMyMeta()
  const sync = useSyncManualCliente()

  useEffect(() => {
    const meta = searchParams.get('meta')
    if (meta === 'sucesso') {
      setFlash({ type: 'sucesso', msg: 'Conta Meta conectada com sucesso! As contas de anúncio foram importadas.' })
      refetch()
    } else if (meta === 'erro') {
      setFlash({ type: 'erro', msg: 'Erro ao conectar com a Meta. Tente novamente.' })
    }
  }, [searchParams])

  async function handleConectar() {
    setConectando(true)
    try {
      const { data } = await api.get('/auth/meta/url')
      window.location.href = data.url
    } catch {
      setFlash({ type: 'erro', msg: 'Erro ao gerar link de conexão. Tente novamente.' })
      setConectando(false)
    }
  }

  const dias = conn ? diasParaExpirar(conn.tokenExpiresAt) : null

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Configuracoes</h1>
        {conn && (
          <Button
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} />
            {sync.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
          </Button>
        )}
      </div>
      {sync.data && (
        <div className="p-3 rounded-lg bg-ominy-bg border border-ominy-border text-sm text-ominy-text">
          Sync concluido: {sync.data.sucesso} conta{sync.data.sucesso !== 1 ? 's' : ''} ok
          {sync.data.erro > 0 && `, ${sync.data.erro} com erro`}
        </div>
      )}

      {flash && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${flash.type === 'sucesso' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {flash.type === 'sucesso' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <p className="text-sm">{flash.msg}</p>
          <button onClick={() => setFlash(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">Fechar</button>
        </div>
      )}

      {/* Meta Ads */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-sm">f</span>
          </div>
          <div>
            <h2 className="font-heading text-sm font-bold">Meta Ads</h2>
            <p className="text-xs text-ominy-muted">Conecte sua conta do Business Manager</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-ominy-muted">Carregando...</p>
        ) : conn ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle size={14} className="text-green-400" />
              <div className="flex-1">
                <p className="text-sm text-green-400 font-medium">Conta conectada</p>
                {dias !== null && (
                  <p className={`text-xs mt-0.5 ${dias <= 7 ? 'text-yellow-400' : 'text-ominy-muted'}`}>
                    {dias <= 7 && <AlertTriangle size={10} className="inline mr-1" />}
                    Token expira em {dias} dia{dias !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={conectando}
                onClick={handleConectar}
                className="flex items-center gap-2"
              >
                <RefreshCw size={12} />
                {conectando ? 'Redirecionando...' : 'Renovar conexao'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={desconectar.isPending}
                onClick={() => desconectar.mutate()}
              >
                <Unlink size={12} />
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-ominy-bg border border-ominy-border">
              <XCircle size={14} className="text-ominy-muted" />
              <p className="text-sm text-ominy-muted">Nenhuma conta conectada</p>
            </div>
            <Button
              disabled={conectando}
              onClick={handleConectar}
              className="flex items-center gap-2 w-fit"
            >
              <Link2 size={14} />
              {conectando ? 'Redirecionando...' : 'Conectar com Meta'}
            </Button>
          </div>
        )}
      </Card>

      {/* Google Ads — próxima fase */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 font-bold text-sm">G</span>
          </div>
          <div>
            <h2 className="font-heading text-sm font-bold">Google Ads</h2>
            <p className="text-xs text-ominy-muted">Conecte sua conta do Google Ads</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-ominy-bg border border-dashed border-ominy-border">
          <p className="text-xs text-ominy-muted">Integracao com Google Ads em breve.</p>
        </div>
      </Card>
    </div>
  )
}

export default function MinhaContaPage() {
  return (
    <Suspense>
      <MinhaContaContent />
    </Suspense>
  )
}
