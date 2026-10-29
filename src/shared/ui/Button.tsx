import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, MOTION, type ButtonSize, type ButtonVariant } from './classes.ts'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({ variant, size, icon, className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: the icon alone says nothing to a screen reader. */
  label: string
  icon: ReactNode
  tone?: 'default' | 'danger'
}

export function IconButton({ label, icon, tone = 'default', className = '', type = 'button', ...props }: IconButtonProps) {
  const colors = tone === 'danger' ? 'text-muted hover:bg-red-50 hover:text-red-700' : 'text-muted hover:bg-subtle hover:text-ink'
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${MOTION} ${colors} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}
