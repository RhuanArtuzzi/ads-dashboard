import { forwardRef } from 'react'
import { clsx } from 'clsx'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      'w-full px-3 py-2 rounded-lg bg-ominy-bg border border-ominy-border text-ominy-text placeholder-ominy-muted text-sm',
      'focus:outline-none focus:border-ominy-cyan focus:ring-1 focus:ring-ominy-cyan/30 transition-colors',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'
export { Input }
