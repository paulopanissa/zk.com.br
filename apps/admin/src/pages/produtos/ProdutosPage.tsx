import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProdutosFilter, type ProdutosFiltros } from './components/ProdutosFilter'
import { ProdutosTable } from './components/ProdutosTable'
import { PRODUTOS_MOCK, CATEGORIAS, MARCAS } from '@/data/produtos.mock'

const LIMIT = 10

export function ProdutosPage() {
  const [filtros, setFiltros] = useState<ProdutosFiltros>({
    busca: '',
    categoria: 'all',
    marca: 'all',
    somenteAtivos: false,
    destaque: false,
  })
  const [page, setPage] = useState(1)

  const produtosFiltrados = useMemo(() => {
    const busca = filtros.busca.toLowerCase()
    return PRODUTOS_MOCK.filter((p) => {
      if (busca && !p.nome.toLowerCase().includes(busca) && !p.sku.toLowerCase().includes(busca))
        return false
      if (filtros.categoria !== 'all' && p.categoria !== filtros.categoria) return false
      if (filtros.marca !== 'all' && p.marca !== filtros.marca) return false
      if (filtros.somenteAtivos && !p.ativo) return false
      if (filtros.destaque && !p.destaque) return false
      return true
    })
  }, [filtros])

  const total = produtosFiltrados.length
  const paginados = produtosFiltrados.slice((page - 1) * LIMIT, page * LIMIT)

  function handleFiltrosChange(novosFiltros: ProdutosFiltros) {
    setFiltros(novosFiltros)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">Produtos</h1>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      {/* Filtros */}
      <ProdutosFilter
        filtros={filtros}
        categorias={CATEGORIAS}
        marcas={MARCAS}
        onChange={handleFiltrosChange}
      />

      {/* Tabela */}
      <ProdutosTable
        produtos={paginados}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
