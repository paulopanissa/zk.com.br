import { useState } from 'react'
import { BarChart3, Package, ShoppingCart, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VendasTab } from './components/VendasTab'
import { EstoqueTab } from './components/EstoqueTab'
import { ClientesTab } from './components/ClientesTab'
import { ProdutosTab } from './components/ProdutosTab'

type Aba = 'vendas' | 'estoque' | 'clientes' | 'produtos'

const ABAS: { key: Aba; label: string; Icon: React.ElementType }[] = [
  { key: 'vendas', label: 'Vendas', Icon: ShoppingCart },
  { key: 'estoque', label: 'Estoque', Icon: Package },
  { key: 'clientes', label: 'Clientes', Icon: Users },
  { key: 'produtos', label: 'Produtos', Icon: BarChart3 },
]

export function RelatoriosPage() {
  const [aba, setAba] = useState<Aba>('vendas')

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise de desempenho por vendas, estoque, clientes e produtos.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <nav className="flex">
          {ABAS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAba(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                aba === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {aba === 'vendas' && <VendasTab />}
      {aba === 'estoque' && <EstoqueTab />}
      {aba === 'clientes' && <ClientesTab />}
      {aba === 'produtos' && <ProdutosTab />}
    </div>
  )
}
