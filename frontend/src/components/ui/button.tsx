'use client'
import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-body font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-ominy-cyan text-ominy-bg hover:bg-opacity-80 shadow-cyan-glow': variant === 'primary',
            'bg-transparent text-ominy-muted hover:text-ominy-text hover:bg-ominy-surface': variant === 'ghost',
            'border border-ominy-border text-ominy-text hover:border-ominy-cyan hover:text-ominy-cyan': variant === 'outline',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export { Button }
