'use client'
import { Wallet, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface AccountBalanceCardProps {
  platform: string
  accountName: string | null
  accountId: string
  balance: number
  currency: string
  updatedAt: string
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

function formatCurrency(value: number, currency: string): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function AccountBalanceCard({
  platform,
  accountName,
  accountId,
  balance,
  currency,
  updatedAt,
}: AccountBalanceCardProps) {
  const semSaldo = balance <= 0

  return (
    <div
      className={clsx(
        'rounded-xl bg-ominy-surface border border-ominy-border p-4 flex flex-col gap-3',
        'transition-shadow duration-200',
        'hover:shadow-[0_0_12px_rgba(0,255,255,0.25)]'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-body font-semibold tracking-widest px-2 py-0.5 rounded border border-ominy-cyan text-ominy-cyan uppercase">
          {platform}
        </span>
        {semSaldo && (
          <span className="flex items-center gap-1 text-xs font-body text-amber-400 border border-amber-400/40 px-2 py-0.5 rounded">
            <AlertTriangle size={11} />
            Sem saldo
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-ominy-bg p-2 border border-ominy-border text-ominy-cyan">
          <Wallet size={18} />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-body text-sm text-ominy-text truncate">
            {accountName ?? accountId}
          </span>
          {accountName && (
            <span className="font-body text-xs text-ominy-muted truncate">{accountId}</span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span
          className={clsx(
            'font-heading text-xl font-bold',
            semSaldo ? 'text-amber-400' : 'text-ominy-cyan'
          )}
        >
          {formatCurrency(balance, currency)}
        </span>
        <span className="font-body text-xs text-ominy-muted">{formatRelative(updatedAt)}</span>
      </div>
    </div>
  )
}
