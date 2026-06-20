import { useState } from 'react'
import { Search, Plus, Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PRODUTOS_PDV, CATEGORIA_META, formatBRL, type ProdutoPDV } from '@/data/produtos.mock'

interface ProdutoGridProps {
  onAddProduto: (produto: ProdutoPDV) => void
  onShowVideo?: (produto: ProdutoPDV) => void
}

const CATEGORIAS = ['Todos', ...Array.from(new Set(PRODUTOS_PDV.map((p) => p.categoria))).sort()]

export function ProdutoGrid({ onAddProduto, onShowVideo }: ProdutoGridProps) {
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar produto ou SKU..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-11 bg-card text-base"
        />
      </div>

      {/* Filtro visual por categoria — scroll horizontal */}
      <div
        className="overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-2 pb-0.5" style={{ width: 'max-content' }}>
          {CATEGORIAS.map((cat) => {
            const meta = CATEGORIA_META[cat] ?? {
              emoji: '📦',
              bg: 'bg-muted',
              text: 'text-muted-foreground',
            }
            const ativo = categoria === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border px-3 pt-2.5 pb-2 min-w-[64px] transition-all',
                  ativo
                    ? 'border-primary bg-primary shadow-sm shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/60',
                )}
              >
                <div
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center text-xl',
                    ativo ? 'bg-primary-foreground/15' : meta.bg,
                  )}
                >
                  {meta.emoji}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium whitespace-nowrap leading-none',
                    ativo ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {cat}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de produtos */}
      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-24 sm:grid-cols-3 xl:grid-cols-4">
            {filtrados.map((p) => {
              const semEstoque = p.estoqueDisponivel === 0
              const estoqueMinimo = p.estoqueDisponivel > 0 && p.estoqueDisponivel <= 5
              const catMeta = CATEGORIA_META[p.categoria] ?? {
                emoji: '📦',
                bg: 'bg-muted',
                text: 'text-muted-foreground',
              }
              const temVideo = Boolean(p.videoUrl)

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={semEstoque}
                  onClick={() => !semEstoque && onAddProduto(p)}
                  className={cn(
                    'group relative flex flex-col rounded-2xl border text-left transition-all overflow-hidden',
                    semEstoque
                      ? 'border-border bg-card opacity-50 cursor-not-allowed'
                      : 'border-border bg-card hover:border-primary hover:shadow-md active:scale-[0.97] cursor-pointer',
                  )}
                >
                  {/* Área de imagem */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    {p.imagemUrl ? (
                      <img
                        src={p.imagemUrl}
                        alt={p.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-full h-full flex items-center justify-center text-4xl',
                          catMeta.bg,
                        )}
                      >
                        {catMeta.emoji}
                      </div>
                    )}

                    {/* Sem estoque overlay */}
                    {semEstoque && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-destructive/40 text-destructive bg-background"
                        >
                          Sem estoque
                        </Badge>
                      </div>
                    )}

                    {/* Indicador de vídeo */}
                    {temVideo && onShowVideo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onShowVideo(p)
                        }}
                        className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-white text-[10px] font-medium hover:bg-black/80 transition-colors"
                        aria-label="Ver vídeo do produto"
                      >
                        <Play className="h-2.5 w-2.5 fill-white stroke-none" />
                        Vídeo
                      </button>
                    )}

                    {/* Add indicator — hover/focus */}
                    {!semEstoque && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-sm">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Informações do produto */}
                  <div className="flex flex-col gap-0.5 p-2.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                    <span className="line-clamp-2 text-sm font-medium text-foreground leading-snug">
                      {p.nome}
                    </span>
                    <div className="mt-1.5 flex w-full items-center justify-between gap-1">
                      <span className="text-base font-bold tabular-nums text-primary">
                        {formatBRL(p.precoCentavos)}
                      </span>
                      {estoqueMinimo && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-warning/40 text-warning shrink-0"
                        >
                          Últ. {p.estoqueDisponivel}
                        </Badge>
                      )}
                    </div>
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
