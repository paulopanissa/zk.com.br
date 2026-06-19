import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { EstoqueTable } from './components/EstoqueTable'
import { MovimentacoesTable } from './components/MovimentacoesTable'
import {
  type StockSummaryItem,
  type StockSummaryResponse,
  type StockMovement,
  type StockMovementType,
  type MovementsResponse,
} from './types'

const LIMIT = 20

type TipoFiltro = 'all' | StockMovementType

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

export function EstoquePage() {
  // ── Resumo tab ─────────────────────────────────────────────────────────────────
  const [estoque, setEstoque] = useState<StockSummaryItem[]>([])
  const [estoqueTotal, setEstoqueTotal] = useState(0)
  const [estoquePage, setEstoquePage] = useState(1)
  const [estoqueLoading, setEstoqueLoading] = useState(false)
  const [estoqueError, setEstoqueError] = useState(false)
  const [lowStock, setLowStock] = useState(false)

  // ── Movimentações tab ──────────────────────────────────────────────────────────
  const [movimentacoes, setMovimentacoes] = useState<StockMovement[]>([])
  const [movTotal, setMovTotal] = useState(0)
  const [movPage, setMovPage] = useState(1)
  const [movLoading, setMovLoading] = useState(false)
  const [movError, setMovError] = useState(false)
  const [movTipo, setMovTipo] = useState<TipoFiltro>('all')

  const [activeTab, setActiveTab] = useState<'resumo' | 'movimentacoes'>('resumo')

  // Track which tabs have ever been loaded to avoid re-fetching on tab switch
  const resumoLoaded = useRef(false)
  const movLoaded = useRef(false)

  const loadEstoque = useCallback(async (signal?: AbortSignal) => {
    setEstoqueLoading(true)
    setEstoqueError(false)
    try {
      const params: Record<string, string | number | boolean> = { page: estoquePage, limit: LIMIT }
      if (lowStock) params.low_stock = true
      const r = await api.get<StockSummaryResponse>('/stock', { params, signal })
      setEstoque(r.data.data)
      setEstoqueTotal(r.data.total)
      resumoLoaded.current = true
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return
      setEstoqueError(true)
    } finally {
      setEstoqueLoading(false)
    }
  }, [estoquePage, lowStock])

  const loadMovimentacoes = useCallback(async (signal?: AbortSignal) => {
    setMovLoading(true)
    setMovError(false)
    try {
      const params: Record<string, string | number> = { page: movPage, limit: LIMIT }
      if (movTipo !== 'all') params.type = movTipo
      const r = await api.get<MovementsResponse>('/stock/movements', { params, signal })
      setMovimentacoes(r.data.data)
      setMovTotal(r.data.total)
      movLoaded.current = true
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return
      setMovError(true)
    } finally {
      setMovLoading(false)
    }
  }, [movPage, movTipo])

  useEffect(() => {
    const controller = new AbortController()
    loadEstoque(controller.signal)
    return () => controller.abort()
  }, [loadEstoque])

  useEffect(() => {
    if (activeTab !== 'movimentacoes') return
    const controller = new AbortController()
    loadMovimentacoes(controller.signal)
    return () => controller.abort()
  }, [activeTab, loadMovimentacoes])

  function handleLowStockToggle() {
    setLowStock((p) => !p)
    setEstoquePage(1)
  }

  function handleMovTipo(v: string) {
    setMovTipo(v as TipoFiltro)
    setMovPage(1)
  }

  const lowStockCount = estoque.filter((i) => i.is_low_stock).length

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Estoque</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">{estoqueTotal} produto{estoqueTotal !== 1 ? 's' : ''} com movimentação</p>
          {!estoqueLoading && lowStockCount > 0 && (
            <span className="text-xs font-medium text-warning">{lowStockCount} abaixo do mínimo (nesta página)</span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-2">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        {/* ── TAB RESUMO ── */}
        <TabsContent value="resumo" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <ToggleChip
                label="Baixo estoque"
                active={lowStock}
                onClick={handleLowStockToggle}
              />
              {lowStock && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLowStock(false); setEstoquePage(1) }}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {estoqueError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar o estoque.{' '}
              <button className="underline font-medium" onClick={() => loadEstoque()}>
                Tentar novamente
              </button>
            </div>
          )}

          <EstoqueTable
            items={estoque}
            loading={estoqueLoading}
            page={estoquePage}
            limit={LIMIT}
            total={estoqueTotal}
            onPageChange={setEstoquePage}
          />
        </TabsContent>

        {/* ── TAB MOVIMENTAÇÕES ── */}
        <TabsContent value="movimentacoes" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={movTipo} onValueChange={handleMovTipo}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue placeholder="Tipo de movimentação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="PURCHASE_ENTRY">Entrada compra</SelectItem>
                  <SelectItem value="PURCHASE_CANCEL">Cancelamento compra</SelectItem>
                  <SelectItem value="SALE_OUT">Saída venda</SelectItem>
                  <SelectItem value="SALE_RETURN">Devolução venda</SelectItem>
                  <SelectItem value="MANUAL_ENTRY">Entrada manual</SelectItem>
                  <SelectItem value="MANUAL_EXIT">Saída manual</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transferência entrada</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transferência saída</SelectItem>
                </SelectContent>
              </Select>

              {movTipo !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMovTipo('all'); setMovPage(1) }}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {movError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar as movimentações.{' '}
              <button className="underline font-medium" onClick={() => loadMovimentacoes()}>
                Tentar novamente
              </button>
            </div>
          )}

          <MovimentacoesTable
            movimentacoes={movimentacoes}
            loading={movLoading}
            page={movPage}
            limit={LIMIT}
            total={movTotal}
            onPageChange={setMovPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
