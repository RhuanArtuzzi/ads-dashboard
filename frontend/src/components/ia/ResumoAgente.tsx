'use client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useResumoHoje, useGerarResumo } from '@/lib/queries/ia'
import { Bot, RefreshCw } from 'lucide-react'

export function ResumoAgente() {
  const { data: resumo, isLoading } = useResumoHoje()
  const gerar = useGerarResumo()

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-ominy-purple" />
          <span className="text-sm font-heading text-ominy-purple uppercase tracking-widest">Gestor IA</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => gerar.mutate()}
          disabled={gerar.isPending}
        >
          <RefreshCw size={12} className={gerar.isPending ? 'animate-spin' : ''} />
          {gerar.isPending ? 'Analisando...' : 'Gerar agora'}
        </Button>
      </div>

      {isLoading && <p className="text-ominy-muted text-sm">Carregando...</p>}
      {!isLoading && !resumo && (
        <p className="text-ominy-muted text-sm italic">Nenhuma análise gerada hoje ainda.</p>
      )}
      {resumo && (
        <div className="text-sm font-body text-ominy-text whitespace-pre-wrap leading-relaxed">
          {resumo.conteudo}
        </div>
      )}
      {resumo && (
        <p className="text-xs text-ominy-muted">
          Gerado em {new Date(resumo.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </Card>
  )
}
