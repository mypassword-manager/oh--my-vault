// Primitif UI ringkas (menggantikan shadcn/ui) — Tailwind classes sama seperti versi Retool.
import { useEffect, useRef, useState } from 'react'

const join = (...cls) => cls.filter(Boolean).join(' ')

export function Button({ variant = 'default', size = 'default', className, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2',
    outline: 'border border-border bg-transparent hover:bg-accent px-4 py-2',
    ghost: 'hover:bg-accent px-3 py-2',
    destructive: 'bg-red-600 text-white hover:bg-red-700 px-4 py-2',
  }
  const sizes = { default: '', sm: 'px-3 py-1.5 text-xs', icon: 'h-9 w-9 p-0' }
  return <button className={join(base, variants[variant], sizes[size], className)} {...props} />
}

export function Input({ className, ...props }) {
  return (
    <input
      className={join(
        'w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 ring-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={join(
        'w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 ring-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children, className }) {
  return <label className={join('block text-sm font-medium mb-1.5', className)}>{children}</label>
}

export function Card({ className, children }) {
  return <div className={join('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}>{children}</div>
}

export function CardHeader({ children }) {
  return <div className="p-4 pb-2">{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={join('font-semibold leading-none', className)}>{children}</h3>
}

export function CardDescription({ children }) {
  return <p className="text-sm text-muted-foreground mt-1">{children}</p>
}

export function CardContent({ children, className }) {
  return <div className={join('p-4 pt-2', className)}>{children}</div>
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={join('inline-flex rounded-md border border-border bg-muted p-1 gap-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={join(
            'rounded px-3 py-1.5 text-sm transition-colors',
            value === t.value ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Dialog({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function Select({ value, onChange, options, className, disabled }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={join(
        'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={join(
        'relative h-5 w-9 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted-foreground/40',
      )}
    >
      <span
        className={join(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
          checked ? 'left-4.5 left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function PinInput({ value, onChange, onComplete, length = 6 }) {
  const refs = useRef([])
  const chars = value.padEnd(length, ' ').slice(0, length).split('')

  const setChar = (i, ch) => {
    if (!/^\d?$/.test(ch)) return
    const next = value.slice(0, i) + ch + value.slice(i + 1)
    onChange(next.replace(/\s/g, ''))
    if (ch && i < length - 1) refs.current[i + 1]?.focus()
    if (ch && i === length - 1 && onComplete) onComplete(next)
  }

  return (
    <div className="flex gap-2">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={ch.trim()}
          inputMode="numeric"
          maxLength={1}
          className="h-10 w-10 rounded-md border border-border bg-transparent text-center font-mono text-lg outline-none focus:ring-1 ring-ring"
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !chars[i].trim() && i > 0) refs.current[i - 1]?.focus()
          }}
        />
      ))}
    </div>
  )
}

export function useUnlockedGate(navigate) {
  useEffect(() => {
    if (!sessionStorage.getItem('vault-unlocked')) navigate('/lock', { replace: true })
  }, [navigate])
}

export function isUnlocked() {
  return sessionStorage.getItem('vault-unlocked') === '1'
}

export function lockVault() {
  sessionStorage.removeItem('vault-unlocked')
}
