import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  variacao?: number
  icon: LucideIcon
  destaque?: boolean
  alerta?: boolean
}

export function KpiCard({ label, value, variacao, icon: Icon, destaque, alerta }: KpiCardProps) {
  const positivo = variacao !== undefined && variacao >= 0

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-3',
        alerta && 'border-warning/40 bg-warning/5',
        destaque && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            alerta ? 'bg-warning/15 text-warning' : destaque ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="font-display text-2xl font-bold text-foreground leading-none">{value}</p>

      {variacao !== undefined && (
        <p className={cn('text-xs font-medium', positivo ? 'text-success' : 'text-danger')}>
          {positivo ? '↑' : '↓'} {Math.abs(variacao).toFixed(1)}% vs ontem
        </p>
      )}
    </div>
  )
}
