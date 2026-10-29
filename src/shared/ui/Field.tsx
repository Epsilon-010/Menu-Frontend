import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { CONTROL } from './classes.ts'

interface FieldProps {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}

/** A label wrapping its control, so clicking the label focuses it. */
export function Field({ label, hint, className = '', children }: FieldProps) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${className}`} {...props} />
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} resize-none ${className}`} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL} ${className}`} {...props} />
}
