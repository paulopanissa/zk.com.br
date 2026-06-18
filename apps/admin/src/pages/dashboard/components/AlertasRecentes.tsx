import { AlertTriangle, CheckCircle, Package, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type AlertaDash } from '@/data/dashboard.mock'

const ICONS: Record<AlertaDash['tipo'], React.ElementType> = {
  estoque_critico: Package,
  caixa_fechado: DollarSign,
  produto_inativo: AlertTriangle,
  meta_atingida: CheckCircle,
}

const CORES: Record<AlertaDash['tipo'], string> = {
  estoque_critico: 'text-warning bg-warning/10',
  caixa_fechado: 'text-muted-foreground bg-muted',
  produto_inativo: 'text-danger bg-danger/10',
  meta_atingida: 'text-success bg-success/10',
}

function formatHora(iso: string) {
  const d = new Date(iso)
  const agora = new Date()
  const diff = Math.floor((agora.getTime() - d.getTime()) / 60000)
  if (diff < 60) return `${diff}min atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  return `${Math.floor(diff / 1440)}d atrás`
}

interface AlertasRecentesProps {
  alertas: AlertaDash[]
}

export function AlertasRecentes({ alertas }: AlertasRecentesProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-display text-base font-bold text-foreground mb-4">Alertas recentes</h2>
      <div className="space-y-2.5">
        {alertas.map((a) => {
          const Icon = ICONS[a.tipo]
          const cor = CORES[a.tipo]
          return (
            <div key={a.id} className={cn('flex items-start gap-3', a.lido && 'opacity-60')}>
              <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cor)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{a.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatHora(a.criadoEm)}</p>
              </div>
              {!a.lido && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
