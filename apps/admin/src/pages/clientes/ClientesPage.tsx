import { useMemo, useState } from 'react'
import { ClientesFilter, type ClientesFiltros } from './components/ClientesFilter'
import { ClientesTable } from './components/ClientesTable'
import { CLIENTES_MOCK } from '@/data/clientes.mock'

const LIMIT = 10

const UFS = [...new Set(CLIENTES_MOCK.map((c) => c.uf))].sort()

export function ClientesPage() {
  const [filtros, setFiltros] = useState<ClientesFiltros>({
    busca: '',
    uf: 'all',
    somenteAtivos: false,
    comConsentimento: false,
  })
  const [page, setPage] = useState(1)

  const clientesFiltrados = useMemo(() => {
    const busca = filtros.busca.toLowerCase()
    return CLIENTES_MOCK.filter((c) => {
      if (
        busca &&
        !c.nome.toLowerCase().includes(busca) &&
        !c.email.toLowerCase().includes(busca) &&
        !c.telefonePrincipal.includes(busca)
      )
        return false
      if (filtros.uf !== 'all' && c.uf !== filtros.uf) return false
      if (filtros.somenteAtivos && !c.ativo) return false
      if (filtros.comConsentimento && !c.consentimentoLgpd) return false
      return true
    })
  }, [filtros])

  const total = clientesFiltrados.length
  const paginados = clientesFiltrados.slice((page - 1) * LIMIT, page * LIMIT)

  function handleFiltrosChange(novosFiltros: ClientesFiltros) {
    setFiltros(novosFiltros)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{CLIENTES_MOCK.length} clientes cadastrados</p>
        </div>
      </div>

      <ClientesFilter filtros={filtros} ufs={UFS} onChange={handleFiltrosChange} />

      <ClientesTable
        clientes={paginados}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
