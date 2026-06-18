import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { LotesTable } from './components/LotesTable'
import { MovimentacoesTable } from './components/MovimentacoesTable'
import {
  LOTES_MOCK,
  MOVIMENTACOES_MOCK,
  getLoteStatus,
  type LoteStatus,
  type StockMovementType,
} from '@/data/estoque.mock'

const LIMIT = 10

type StatusFiltro = 'all' | LoteStatus
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
  // --- lotes filters ---
  const [lotesBusca, setLotesBusca] = useState('')
  const [lotesStatus, setLotesStatus] = useState<StatusFiltro>('all')
  const [lotesPage, setLotesPage] = useState(1)

  // --- movimentações filters ---
  const [movBusca, setMovBusca] = useState('')
  const [movTipo, setMovTipo] = useState<TipoFiltro>('all')
  const [movPage, setMovPage] = useState(1)

  const lotesFiltrados = useMemo(() => {
    const busca = lotesBusca.toLowerCase()
    return LOTES_MOCK.filter((l) => {
      if (
        busca &&
        !l.productName.toLowerCase().includes(busca) &&
        !l.sku.toLowerCase().includes(busca) &&
        !l.code.toLowerCase().includes(busca)
      )
        return false
      if (lotesStatus !== 'all' && getLoteStatus(l) !== lotesStatus) return false
      return true
    })
  }, [lotesBusca, lotesStatus])

  const movFiltradas = useMemo(() => {
    const busca = movBusca.toLowerCase()
    return MOVIMENTACOES_MOCK.filter((m) => {
      if (
        busca &&
        !m.productName.toLowerCase().includes(busca) &&
        !m.sku.toLowerCase().includes(busca) &&
        !m.lotCode.toLowerCase().includes(busca)
      )
        return false
      if (movTipo !== 'all' && m.type !== movTipo) return false
      return true
    })
  }, [movBusca, movTipo])

  const lotesPaginados = lotesFiltrados.slice((lotesPage - 1) * LIMIT, lotesPage * LIMIT)
  const movPaginadas = movFiltradas.slice((movPage - 1) * LIMIT, movPage * LIMIT)

  const temFiltroLotes = lotesBusca || lotesStatus !== 'all'
  const temFiltroMov = movBusca || movTipo !== 'all'

  const criticos = LOTES_MOCK.filter((l) => getLoteStatus(l) === 'critico').length
  const vencidos = LOTES_MOCK.filter((l) => getLoteStatus(l) === 'vencido').length

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Estoque</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">{LOTES_MOCK.length} lotes cadastrados</p>
          {criticos > 0 && (
            <span className="text-xs font-medium text-warning">{criticos} crítico{criticos !== 1 ? 's' : ''}</span>
          )}
          {vencidos > 0 && (
            <span className="text-xs font-medium text-destructive">{vencidos} vencido{vencidos !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <Tabs defaultValue="lotes">
        <TabsList className="mb-2">
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        {/* ── TAB LOTES ── */}
        <TabsContent value="lotes" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto, SKU ou código do lote"
                  value={lotesBusca}
                  onChange={(e) => { setLotesBusca(e.target.value); setLotesPage(1) }}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['normal', 'critico', 'vencido'] as LoteStatus[]).map((s) => (
                  <ToggleChip
                    key={s}
                    label={s.charAt(0).toUpperCase() + s.slice(1)}
                    active={lotesStatus === s}
                    onClick={() => {
                      setLotesStatus((p) => (p === s ? 'all' : s))
                      setLotesPage(1)
                    }}
                  />
                ))}
              </div>

              {temFiltroLotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLotesBusca(''); setLotesStatus('all'); setLotesPage(1) }}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <LotesTable
            lotes={lotesPaginados}
            page={lotesPage}
            limit={LIMIT}
            total={lotesFiltrados.length}
            onPageChange={setLotesPage}
          />
        </TabsContent>

        {/* ── TAB MOVIMENTAÇÕES ── */}
        <TabsContent value="movimentacoes" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto, SKU ou lote"
                  value={movBusca}
                  onChange={(e) => { setMovBusca(e.target.value); setMovPage(1) }}
                  className="pl-9"
                />
              </div>

              <Select
                value={movTipo}
                onValueChange={(v) => { setMovTipo(v as TipoFiltro); setMovPage(1) }}
              >
                <SelectTrigger className="w-[200px]">
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

              {temFiltroMov && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMovBusca(''); setMovTipo('all'); setMovPage(1) }}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <MovimentacoesTable
            movimentacoes={movPaginadas}
            page={movPage}
            limit={LIMIT}
            total={movFiltradas.length}
            onPageChange={setMovPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
