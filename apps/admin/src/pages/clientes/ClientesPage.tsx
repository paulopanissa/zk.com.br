import { useCallback, useEffect, useState } from 'react'
import { ClientesFilter, type ClientesFiltros } from './components/ClientesFilter'
import { ClientesTable } from './components/ClientesTable'
import { api } from '@/lib/api'
import { type Cliente, type ClienteListResponse } from './types'

const LIMIT = 20

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [filtros, setFiltros] = useState<ClientesFiltros>({
    busca: '',
    somenteAtivos: false,
  })

  const loadClientes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string | number | boolean> = { page, limit: LIMIT }
      if (filtros.busca.trim()) params.q = filtros.busca.trim()
      if (filtros.somenteAtivos) params.ativo = true
      const r = await api.get<ClienteListResponse>('/customers', { params, signal })
      setClientes(r.data.data)
      setTotal(r.data.total)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page, filtros])

  useEffect(() => {
    const controller = new AbortController()
    loadClientes(controller.signal)
    return () => controller.abort()
  }, [loadClientes])

  function handleFiltrosChange(novosFiltros: ClientesFiltros) {
    setFiltros(novosFiltros)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <ClientesFilter filtros={filtros} onChange={handleFiltrosChange} />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar os clientes.{' '}
          <button className="underline font-medium" onClick={() => loadClientes()}>
            Tentar novamente
          </button>
        </div>
      )}

      <ClientesTable
        clientes={clientes}
        loading={loading}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
