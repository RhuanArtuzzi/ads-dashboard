import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export function Card({ className, glow, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-ominy-surface border border-ominy-border p-4',
        glow && 'glow-cyan border-cyan',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
