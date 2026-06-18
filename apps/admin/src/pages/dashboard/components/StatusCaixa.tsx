import { Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type StatusCaixa as StatusCaixaType } from '@/data/dashboard.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface StatusCaixaProps {
  status: StatusCaixaType
}

export function StatusCaixa({ status }: StatusCaixaProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-bold text-foreground">Caixa PDV</h2>
        </div>
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            status.aberto
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', status.aberto ? 'bg-success' : 'bg-muted-foreground')} />
          {status.aberto ? 'Aberto' : 'Fechado'}
        </span>
      </div>

      <div className="space-y-2.5">
        {status.aberto && status.abertoEm && (
          <Row label="Operador" value={status.operador} />
        )}
        {status.aberto && status.abertoEm && (
          <Row label="Aberto às" value={formatHora(status.abertoEm)} />
        )}
        <Row label="Saldo abertura" value={formatBRL(status.saldoAbertura)} />
        <Row label="Vendas" value={formatBRL(status.totalVendas)} destaque />
        {status.totalSangrias > 0 && (
          <Row label="Sangrias" value={formatBRL(status.totalSangrias)} alerta />
        )}
        <div className="pt-2 border-t border-border">
          <Row
            label="Saldo esperado"
            value={formatBRL(status.saldoAbertura + status.totalVendas - status.totalSangrias)}
            bold
          />
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  destaque,
  alerta,
  bold,
}: {
  label: string
  value: string
  destaque?: boolean
  alerta?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm tabular-nums',
          bold ? 'font-bold text-foreground' : 'font-medium',
          destaque && 'text-success',
          alerta && 'text-warning',
          !destaque && !alerta && !bold && 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
