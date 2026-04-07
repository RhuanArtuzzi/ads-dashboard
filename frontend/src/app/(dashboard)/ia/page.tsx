'use client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHistoricoIA, useGerarResumo } from '@/lib/queries/ia'
import { Bot, RefreshCw } from 'lucide-react'

export default function IAPage() {
  const { data: historico, isLoading } = useHistoricoIA()
  const gerar = useGerarResumo()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-ominy-purple" />
          <h1 className="font-heading text-2xl font-bold">Agente IA</h1>
        </div>
        <Button variant="outline" onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw size={14} className={gerar.isPending ? 'animate-spin' : ''} />
          {gerar.isPending ? 'Analisando...' : 'Gerar analise agora'}
        </Button>
      </div>

      {isLoading && <div className="text-ominy-muted text-sm">Carregando historico...</div>}

      <div className="flex flex-col gap-4">
        {(historico ?? []).map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-sm text-ominy-purple uppercase tracking-widest">
                {new Date(r.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
              <span className="text-xs text-ominy-muted">
                {new Date(r.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm font-body text-ominy-text whitespace-pre-wrap leading-relaxed">{r.conteudo}</p>
          </Card>
        ))}

        {!isLoading && (historico ?? []).length === 0 && (
          <Card>
            <p className="text-ominy-muted text-sm text-center py-6">Nenhuma analise gerada ainda. Clique em "Gerar analise agora".</p>
          </Card>
        )}
      </div>
    </div>
  )
}
