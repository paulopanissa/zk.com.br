import { ShoppingCart } from 'lucide-react'

interface StatusCaixaProps {
  hoje: {
    total_centavos: number
    total_pedidos: number
    ticket_medio_centavos: number
  }
}

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

export function StatusCaixa({ hoje }: StatusCaixaProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-base font-bold text-foreground">Vendas do dia</h2>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total arrecadado
          </p>
          <p className="font-display text-3xl font-bold text-success tabular-nums mt-1">
            {formatBRL(hoje.total_centavos)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
              {hoje.total_pedidos}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
              {formatBRL(hoje.ticket_medio_centavos)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
