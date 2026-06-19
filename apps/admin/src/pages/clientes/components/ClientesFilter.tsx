import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ClientesFiltros {
  busca: string
  somenteAtivos: boolean
}

interface ClientesFilterProps {
  filtros: ClientesFiltros
  onChange: (filtros: ClientesFiltros) => void
}

export function ClientesFilter({ filtros, onChange }: ClientesFilterProps) {
  const temFiltro = filtros.busca || filtros.somenteAtivos

  function set<K extends keyof ClientesFiltros>(key: K, value: ClientesFiltros[K]) {
    onChange({ ...filtros, [key]: value })
  }

  function limpar() {
    onChange({ busca: '', somenteAtivos: false })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone"
            value={filtros.busca}
            onChange={(e) => set('busca', e.target.value)}
            className="pl-9"
          />
        </div>

        <ToggleChip
          label="Somente ativos"
          active={filtros.somenteAtivos}
          onClick={() => set('somenteAtivos', !filtros.somenteAtivos)}
        />

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
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary-foreground' : 'bg-muted-foreground')} />
      {label}
    </button>
  )
}
