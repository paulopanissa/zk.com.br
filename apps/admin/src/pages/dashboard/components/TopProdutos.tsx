import { TrendingUp } from 'lucide-react'
import { type ProdutoTop } from '@/data/dashboard.mock'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  )
}

interface TopProdutosProps {
  produtos: ProdutoTop[]
}

export function TopProdutos({ produtos }: TopProdutosProps) {
  const maxVendidos = produtos[0]?.vendidos ?? 1

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-bold text-foreground">Mais vendidos hoje</h2>
      </div>

      <div className="space-y-3">
        {produtos.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(p.vendidos / maxVendidos) * 100}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">{p.vendidos} un</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatBRL(p.receita)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
