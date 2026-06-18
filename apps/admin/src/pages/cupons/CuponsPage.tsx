import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CuponsTable } from './components/CuponsTable'
import { NovoCupomModal } from './components/NovoCupomModal'
import { CUPONS_MOCK, getCupomStatus, type CupomMock, type CouponType } from '@/data/cupons.mock'

const LIMIT = 10

type StatusFiltro = 'all' | 'ativo' | 'inativo' | 'expirado' | 'esgotado'
type TipoFiltro = 'all' | CouponType

interface Filtros {
  busca: string
  tipo: TipoFiltro
  status: StatusFiltro
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

export function CuponsPage() {
  const [cupons, setCupons] = useState<CupomMock[]>(CUPONS_MOCK)
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', tipo: 'all', status: 'all' })
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const cuponsFiltrados = useMemo(() => {
    const busca = filtros.busca.toLowerCase()
    return cupons.filter((c) => {
      if (busca && !c.code.toLowerCase().includes(busca) && !c.description?.toLowerCase().includes(busca))
        return false
      if (filtros.tipo !== 'all' && c.type !== filtros.tipo) return false
      if (filtros.status !== 'all' && getCupomStatus(c) !== filtros.status) return false
      return true
    })
  }, [cupons, filtros])

  const total = cuponsFiltrados.length
  const paginados = cuponsFiltrados.slice((page - 1) * LIMIT, page * LIMIT)

  const temFiltro = filtros.busca || filtros.tipo !== 'all' || filtros.status !== 'all'

  function handleToggleAtivo(id: string) {
    setCupons((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c))
  }

  function handleCreate() {
    // mock — in prod would POST to API and refetch
    setModalOpen(false)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-1">{cupons.length} cupons cadastrados</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Novo cupom
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição"
              value={filtros.busca}
              onChange={(e) => { setFiltros((p) => ({ ...p, busca: e.target.value })); setPage(1) }}
              className="pl-9"
            />
          </div>

          <Select value={filtros.tipo} onValueChange={(v) => { setFiltros((p) => ({ ...p, tipo: v as TipoFiltro })); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="PERCENTUAL">Percentual</SelectItem>
              <SelectItem value="FIXO">Valor fixo</SelectItem>
              <SelectItem value="FRETE_GRATIS">Frete grátis</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {(['ativo', 'inativo', 'expirado', 'esgotado'] as StatusFiltro[]).map((s) => (
              <ToggleChip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                active={filtros.status === s}
                onClick={() => {
                  setFiltros((p) => ({ ...p, status: p.status === s ? 'all' : s }))
                  setPage(1)
                }}
              />
            ))}
          </div>

          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiltros({ busca: '', tipo: 'all', status: 'all' }); setPage(1) }}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <CuponsTable
        cupons={paginados}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
        onToggleAtivo={handleToggleAtivo}
      />

      <NovoCupomModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </div>
  )
}
