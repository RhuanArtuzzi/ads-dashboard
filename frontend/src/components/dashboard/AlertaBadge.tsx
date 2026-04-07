import { Badge } from '@/components/ui/badge'

const tipoConfig: Record<string, { label: string; variant: 'red' | 'yellow' | 'cyan' }> = {
  CPL_ALTO:            { label: 'CPL Alto',         variant: 'red' },
  ORCAMENTO_ESGOTANDO: { label: 'Orcamento',         variant: 'yellow' },
  SEM_ENTREGA:         { label: 'Sem Entrega',       variant: 'red' },
  ROAS_BAIXO:          { label: 'ROAS Baixo',        variant: 'yellow' },
  QUEDA_CTR:           { label: 'Queda CTR',         variant: 'cyan' },
}

export function AlertaBadge({ tipo }: { tipo: string }) {
  const config = tipoConfig[tipo] ?? { label: tipo, variant: 'cyan' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
