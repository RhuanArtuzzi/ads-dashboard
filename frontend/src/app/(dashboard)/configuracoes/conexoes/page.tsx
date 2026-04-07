'use client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useContasConfig, useSyncStatus, useSyncManual } from '@/lib/queries/clientes'
import { RefreshCw } from 'lucide-react'

export default function ConexoesPage() {
  const { data: contasConfig } = useContasConfig()
  const { data: syncStatus } = useSyncStatus()
  const syncManual = useSyncManual()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Conexoes Meta Ads</h1>
        <Button
          variant="outline"
          onClick={() => syncManual.mutate()}
          disabled={syncManual.isPending}
        >
          <RefreshCw size={14} className={syncManual.isPending ? 'animate-spin' : ''} />
          {syncManual.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
        </Button>
      </div>

      {syncManual.data && (
        <Card>
          <p className="text-sm text-ominy-text">
            Sync concluido: {syncManual.data.sucesso} conta{syncManual.data.sucesso !== 1 ? 's' : ''} sincronizada{syncManual.data.sucesso !== 1 ? 's' : ''}
            {syncManual.data.erro > 0 && `, ${syncManual.data.erro} com erro`}
          </p>
          {syncManual.data.erros?.length > 0 && (
            <ul className="mt-2 text-xs text-red-400 list-disc list-inside">
              {syncManual.data.erros.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {(syncStatus ?? []).map((conta: any) => (
          <Card key={conta.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-medium text-ominy-text">{conta.accountName}</p>
                <p className="text-xs text-ominy-muted mt-0.5">
                  {conta.ultimoSync
                    ? `Ultimo sync: ${new Date(conta.ultimoSync).toLocaleString('pt-BR')}`
                    : 'Nunca sincronizado'}
                </p>
              </div>
              <Badge variant={conta.ativa ? 'green' : 'gray'}>
                {conta.ativa ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-heading text-sm text-ominy-muted uppercase tracking-widest mb-3">Como adicionar conta</h2>
        <p className="text-sm text-ominy-text font-body leading-relaxed">
          Edite o arquivo <code className="text-ominy-cyan bg-ominy-bg px-1 py-0.5 rounded text-xs">/opt/ads-dashboard/config/meta.yaml</code> no servidor
          seguindo o modelo do arquivo <code className="text-ominy-cyan bg-ominy-bg px-1 py-0.5 rounded text-xs">meta.yaml.example</code>.
          Apos salvar, clique em "Sincronizar agora".
        </p>
      </Card>
    </div>
  )
}
