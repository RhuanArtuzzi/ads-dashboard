import { clsx } from 'clsx'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'purple' | 'red' | 'yellow' | 'green' | 'gray'
}

export function Badge({ className, variant = 'cyan', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-ominy-cyan/10 text-ominy-cyan border border-ominy-cyan/30': variant === 'cyan',
          'bg-ominy-purple/10 text-ominy-purple border border-ominy-purple/30': variant === 'purple',
          'bg-red-500/10 text-red-400 border border-red-500/30': variant === 'red',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30': variant === 'yellow',
          'bg-green-500/10 text-green-400 border border-green-500/30': variant === 'green',
          'bg-gray-500/10 text-gray-400 border border-gray-500/30': variant === 'gray',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
