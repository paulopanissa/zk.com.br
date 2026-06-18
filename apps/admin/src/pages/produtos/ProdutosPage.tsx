import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProdutosFilter, type ProdutosFiltros, type NamedItem } from './components/ProdutosFilter'
import { ProdutosTable } from './components/ProdutosTable'
import { api } from '@/lib/api'
import { type ProdutoMock } from '@/data/produtos.mock'

const LIMIT = 20

interface ApiProduct {
  id: string
  name: string
  sku: string | null
  active: boolean
  featured: boolean
  min_stock: number
  pricing: { sale_price_cents: number; cost_price_cents: number } | null
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  media: { url: string }[]
}

interface ApiListResponse {
  data: ApiProduct[]
  total: number
  page: number
  limit: number
}

interface CategoryFlat {
  id: string
  name: string
  depth: number
}

interface BrandPage {
  data: { id: string; name: string }[]
  total: number
}

function toMock(p: ApiProduct): ProdutoMock {
  return {
    id: p.id,
    nome: p.name,
    sku: p.sku ?? '',
    categoria: p.category?.name ?? '—',
    marca: p.brand?.name ?? '—',
    precoVenda: p.pricing?.sale_price_cents ?? 0,
    precoCusto: p.pricing?.cost_price_cents ?? 0,
    estoque: 0,
    estoqueMinimo: p.min_stock,
    ativo: p.active,
    destaque: p.featured,
    imagem: p.media[0]?.url,
  }
}

export function ProdutosPage() {
  const [filtros, setFiltros] = useState<ProdutosFiltros>({
    busca: '',
    categoria: 'all',
    marca: 'all',
    somenteAtivos: false,
    destaque: false,
  })
  const [page, setPage] = useState(1)
  const [produtos, setProdutos] = useState<ProdutoMock[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<NamedItem[]>([])
  const [marcas, setMarcas] = useState<NamedItem[]>([])

  // Load filter options once
  useEffect(() => {
    api.get<CategoryFlat[]>('/categories/flat').then((r) =>
      setCategorias(r.data.map((c) => ({ id: c.id, name: c.name })))
    ).catch(() => {})

    api.get<BrandPage>('/brands', { params: { limit: 100 } }).then((r) =>
      setMarcas(r.data.data.map((b) => ({ id: b.id, name: b.name })))
    ).catch(() => {})
  }, [])

  // Load products on filter/page change
  useEffect(() => {
    setLoading(true)
    setError(null)

    const params: Record<string, string | number | boolean> = { page, limit: LIMIT }
    if (filtros.busca) params.name = filtros.busca
    if (filtros.categoria !== 'all') params.category_id = filtros.categoria
    if (filtros.marca !== 'all') params.brand_id = filtros.marca
    if (filtros.somenteAtivos) params.active = true
    if (filtros.destaque) params.featured = true

    api
      .get<ApiListResponse>('/products', { params })
      .then((res) => {
        setProdutos(res.data.data.map(toMock))
        setTotal(res.data.total)
      })
      .catch(() => setError('Não foi possível carregar os produtos.'))
      .finally(() => setLoading(false))
  }, [filtros, page])

  function handleFiltrosChange(novosFiltros: ProdutosFiltros) {
    setFiltros(novosFiltros)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">Produtos</h1>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      <ProdutosFilter
        filtros={filtros}
        categorias={categorias}
        marcas={marcas}
        onChange={handleFiltrosChange}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Carregando produtos…
        </div>
      ) : (
        <ProdutosTable
          produtos={produtos}
          page={page}
          limit={LIMIT}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
