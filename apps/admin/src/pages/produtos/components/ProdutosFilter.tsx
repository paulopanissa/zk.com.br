import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ProdutosFiltros {
  busca: string
  categoria: string
  marca: string
  somenteAtivos: boolean
  destaque: boolean
}

interface ProdutosFilterProps {
  filtros: ProdutosFiltros
  categorias: string[]
  marcas: string[]
  onChange: (filtros: ProdutosFiltros) => void
}

export function ProdutosFilter({
  filtros,
  categorias,
  marcas,
  onChange,
}: ProdutosFilterProps) {
  const temFiltro =
    filtros.busca ||
    filtros.categoria !== 'all' ||
    filtros.marca !== 'all' ||
    filtros.somenteAtivos ||
    filtros.destaque

  function set<K extends keyof ProdutosFiltros>(key: K, value: ProdutosFiltros[K]) {
    onChange({ ...filtros, [key]: value })
  }

  function limpar() {
    onChange({ busca: '', categoria: 'all', marca: 'all', somenteAtivos: false, destaque: false })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou código de barras"
            value={filtros.busca}
            onChange={(e) => set('busca', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categoria */}
        <Select value={filtros.categoria} onValueChange={(v) => set('categoria', v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Marca */}
        <Select value={filtros.marca} onValueChange={(v) => set('marca', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {marcas.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <ToggleChip
            label="Somente ativos"
            active={filtros.somenteAtivos}
            onClick={() => set('somenteAtivos', !filtros.somenteAtivos)}
          />
          <ToggleChip
            label="Destaque"
            active={filtros.destaque}
            onClick={() => set('destaque', !filtros.destaque)}
          />
        </div>

        {/* Limpar */}
        {temFiltro && (
          <Button variant="ghost" size="sm" onClick={limpar} className="text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {label}
    </button>
  )
}
