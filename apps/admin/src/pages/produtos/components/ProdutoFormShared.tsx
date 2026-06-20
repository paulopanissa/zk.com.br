import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const ORIGENS = [
  { value: '0', label: '0 – Nacional' },
  { value: '1', label: '1 – Estrangeira — importação direta' },
  { value: '2', label: '2 – Estrangeira — adquirida no mercado interno' },
  { value: '3', label: '3 – Nacional — conteúdo importado > 40%' },
  { value: '4', label: '4 – Nacional — produção conforme processos básicos' },
  { value: '5', label: '5 – Nacional — conteúdo importado ≤ 40%' },
  { value: '6', label: '6 – Estrangeira — importação direta, sem similar nacional' },
  { value: '7', label: '7 – Estrangeira — mercado interno, sem similar nacional' },
  { value: '8', label: '8 – Nacional — conteúdo importado > 70%' },
]

export function extractApiError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

export function FormCard({
  children,
  error,
  onSave,
  saving,
  saveLabel = 'Salvar alterações',
}: {
  children: ReactNode
  error: string
  onSave: () => void
  saving: boolean
  saveLabel?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="space-y-6 px-6 py-5">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {children}
      </div>
      <div className="flex justify-end border-t border-border/60 px-6 py-4">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : saveLabel}
        </Button>
      </div>
    </div>
  )
}

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  trailing,
}: {
  label: string
  hint?: string
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {trailing}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function PriceInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

export function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {label}
    </button>
  )
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length
  const near = len > max * 0.85
  const over = len > max
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        over
          ? 'font-medium text-destructive'
          : near
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground',
      )}
    >
      {len}/{max}
    </span>
  )
}
