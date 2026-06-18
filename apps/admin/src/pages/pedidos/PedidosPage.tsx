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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PedidosTable } from './components/PedidosTable'
import { PEDIDOS_MOCK, type VendaStatus, type VendaOrigem } from '@/data/pedidos.mock'

const LIMIT = 10

type StatusFiltro = 'all' | VendaStatus
type OrigemFiltro = 'all' | VendaOrigem

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

const STATUS_LABELS: Record<VendaStatus, string> = {
  ABERTA: 'Aberta',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

export function PedidosPage() {
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusFiltro>('all')
  const [origem, setOrigem] = useState<OrigemFiltro>('all')
  const [page, setPage] = useState(1)

  const pedidosFiltrados = useMemo(() => {
    const q = busca.toLowerCase()
    return PEDIDOS_MOCK.filter((p) => {
      if (
        q &&
        !String(p.numero).includes(q) &&
        !p.clienteNome?.toLowerCase().includes(q)
      )
        return false
      if (status !== 'all' && p.status !== status) return false
      if (origem !== 'all' && p.origem !== origem) return false
      return true
    }).sort((a, b) => b.numero - a.numero)
  }, [busca, status, origem])

  const total = pedidosFiltrados.length
  const paginados = pedidosFiltrados.slice((page - 1) * LIMIT, page * LIMIT)

  const temFiltro = busca || status !== 'all' || origem !== 'all'

  const abertas = PEDIDOS_MOCK.filter((p) => p.status === 'ABERTA').length

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Pedidos</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">{PEDIDOS_MOCK.length} pedidos</p>
          {abertas > 0 && (
            <span className="text-xs font-medium text-blue-600">
              {abertas} em aberto
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou cliente"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          <Select value={origem} onValueChange={(v) => { setOrigem(v as OrigemFiltro); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="PDV">PDV</SelectItem>
              <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
              <SelectItem value="PDV_OFFLINE">PDV Offline</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {(['ABERTA', 'FINALIZADA', 'CANCELADA'] as VendaStatus[]).map((s) => (
              <ToggleChip
                key={s}
                label={STATUS_LABELS[s]}
                active={status === s}
                onClick={() => {
                  setStatus((p) => (p === s ? 'all' : s))
                  setPage(1)
                }}
              />
            ))}
          </div>

          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setBusca(''); setStatus('all'); setOrigem('all'); setPage(1) }}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <PedidosTable
        pedidos={paginados}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
