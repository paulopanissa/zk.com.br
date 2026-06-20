import { Bell, Package, ShoppingCart, Tag, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertaItem {
  id: string
  tipo: string
  mensagem: string
  criado_em: string
}

const ICON_MAP: Record<string, React.ElementType> = {
  ESTOQUE_BAIXO: Package,
  MARGEM_BAIXA: TrendingDown,
  VENDA_FINALIZADA: ShoppingCart,
  CUPOM_ESGOTADO: Tag,
}

const COR_MAP: Record<string, string> = {
  ESTOQUE_BAIXO: 'text-warning bg-warning/10',
  MARGEM_BAIXA: 'text-warning bg-warning/10',
  VENDA_FINALIZADA: 'text-success bg-success/10',
  CUPOM_ESGOTADO: 'text-destructive bg-destructive/10',
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
  alertas: AlertaItem[]
}

export function AlertasRecentes({ alertas }: AlertasRecentesProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-display text-base font-bold text-foreground mb-4">Alertas recentes</h2>
      {alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
          <Bell className="h-8 w-8 opacity-20" />
          <p className="text-sm">Nenhum alerta recente</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alertas.map((a) => {
            const Icon = ICON_MAP[a.tipo] ?? Bell
            const cor = COR_MAP[a.tipo] ?? 'text-muted-foreground bg-muted'
            return (
              <div key={a.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    cor,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{a.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatHora(a.criado_em)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
