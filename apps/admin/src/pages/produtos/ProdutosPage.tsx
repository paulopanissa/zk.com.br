import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProdutosFilter, type ProdutosFiltros, type NamedItem } from './components/ProdutosFilter'
import { ProdutosTable } from './components/ProdutosTable'
import { api } from '@/lib/api'
import { type Product, type ProductListResponse } from './types'

const LIMIT = 20

interface CategoryFlat {
  id: string
  name: string
  depth: number
}

interface BrandPage {
  data: { id: string; name: string }[]
  total: number
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
  const [produtos, setProdutos] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [categorias, setCategorias] = useState<NamedItem[]>([])
  const [marcas, setMarcas] = useState<NamedItem[]>([])

  useEffect(() => {
    api.get<CategoryFlat[]>('/categories/flat').then((r) =>
      setCategorias(r.data.map((c) => ({ id: c.id, name: c.name })))
    ).catch(() => {})

    api.get<BrandPage>('/brands', { params: { limit: 100 } }).then((r) =>
      setMarcas(r.data.data.map((b) => ({ id: b.id, name: b.name })))
    ).catch(() => {})
  }, [])

  const loadProdutos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string | number | boolean> = { page, limit: LIMIT }
      if (filtros.busca.trim()) {
        const q = filtros.busca.trim()
        if (/^\d{8,}$/.test(q)) params.barcode = q
        // SKU only when mixed letters+digits (e.g. RC001, ABC-123) — pure letters = name
        else if (/^[A-Za-z0-9_-]+$/.test(q) && /[A-Za-z]/.test(q) && /\d/.test(q)) params.sku = q
        else params.name = q
      }
      if (filtros.categoria !== 'all') params.category_id = filtros.categoria
      if (filtros.marca !== 'all') params.brand_id = filtros.marca
      if (filtros.somenteAtivos) params.active = true
      if (filtros.destaque) params.featured = true

      const r = await api.get<ProductListResponse>('/products', { params, signal })
      setProdutos(r.data.data)
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
    loadProdutos(controller.signal)
    return () => controller.abort()
  }, [loadProdutos])

  function handleFiltrosChange(novosFiltros: ProdutosFiltros) {
    setFiltros(novosFiltros)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Produtos</h1>
          {!error && (
            <p className="text-sm text-muted-foreground mt-1">
              {total} produto{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button className="gap-2">
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
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar os produtos.{' '}
          <button className="underline font-medium" onClick={() => loadProdutos()}>
            Tentar novamente
          </button>
        </div>
      )}

      <ProdutosTable
        produtos={produtos}
        loading={loading}
        page={page}
        limit={LIMIT}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
