import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PRODUTOS_PDV, formatBRL, type ProdutoPDV } from '@/data/produtos.mock'

interface ProdutoGridProps {
  onAddProduto: (produto: ProdutoPDV) => void
}

const CATEGORIAS = ['Todos', ...Array.from(new Set(PRODUTOS_PDV.map((p) => p.categoria))).sort()]

export function ProdutoGrid({ onAddProduto }: ProdutoGridProps) {
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('Todos')

  const filtrados = PRODUTOS_PDV.filter((p) => {
    if (!p.ativo) return false
    const q = busca.toLowerCase()
    if (q && !p.nome.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false
    if (categoria !== 'Todos' && p.categoria !== categoria) return false
    return true
  })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produto ou SKU..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-10 bg-card"
        />
      </div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoria(cat)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
              categoria === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary hover:text-foreground bg-card',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de produtos */}
      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-2 xl:grid-cols-3">
            {filtrados.map((p) => {
              const semEstoque = p.estoqueDisponivel === 0
              const estoqueMinimo = p.estoqueDisponivel > 0 && p.estoqueDisponivel <= 5

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={semEstoque}
                  onClick={() => !semEstoque && onAddProduto(p)}
                  className={cn(
                    'group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                    semEstoque
                      ? 'border-border bg-card opacity-50 cursor-not-allowed'
                      : 'border-border bg-card hover:border-primary hover:shadow-md cursor-pointer active:scale-[0.98]',
                  )}
                >
                  {/* Ícone + */}
                  {!semEstoque && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <Plus className="h-3 w-3" />
                    </div>
                  )}

                  <span className="font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                  <span className="mt-1 line-clamp-2 text-sm font-medium text-foreground leading-snug">
                    {p.nome}
                  </span>
                  <div className="mt-2 flex w-full items-center justify-between">
                    <span className="text-base font-bold tabular-nums text-primary">
                      {formatBRL(p.precoCentavos)}
                    </span>
                    {semEstoque ? (
                      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                        Sem estoque
                      </Badge>
                    ) : estoqueMinimo ? (
                      <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                        Últ. {p.estoqueDisponivel}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
